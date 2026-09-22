"use client";

import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  CheckCircleFilled, DeleteOutlined, EditOutlined, InfoCircleOutlined, PlusOutlined, RollbackOutlined, UndoOutlined, WarningFilled,
} from "@ant-design/icons";
import { Button, Checkbox, Input, Popconfirm, Segmented, Select, Switch, Tag, Tooltip, type GetRef } from "antd";
import { groupClaims, reviewClaim, slideOptions, type ClaimReview, type SlideGroup } from "@/lib/claim-review";
import {
  batches, blankClaim, claimCap, DIFFICULTY_HELP, DIFFICULTY_LABEL, KIND_HELP, KIND_LABEL, MAX_CLAIMS, outlineSummary, PRIORITY_HELP,
  PRIORITY_LABEL, PRIORITY_TAG, REUSE_NOTE, SLIDES_HELP, TEXT_HELP, TIME_SENSITIVE_HELP,
  type Claim, type ClaimKind, type Difficulty, type OutlineSlide, type Priority, type ResearchView,
} from "@/lib/research";
import { DecisionBar } from "./decision-bar";
import type { Act } from "./research-panels";

/**
 * Cổng 1 · duyệt claim.
 *
 * Mỗi claim đọc như chữ, không như biểu mẫu: hai việc người duyệt làm nhiều nhất — giữ hay bỏ qua — là hai nút;
 * sửa là một bước có chủ ý (đổi câu hay câu hỏi thì mất dữ kiện đã soát ở bài trước). Claim gom theo slide chúng
 * nói tới, nhãn chỉ hiện khi khác mặc định, cảnh báo chỉ hiện khi có gì lệch với dàn ý.
 */

const KIND_OPTIONS = (Object.keys(KIND_LABEL) as ClaimKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }));
const DIFF_OPTIONS = (["easy", "normal", "hard"] as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }));
const PRIO_OPTIONS = (["high", "normal", "low"] as Priority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }));
const LOCKED = "Lưu hoặc huỷ điều đang sửa trước.";
const FULL_UNDO = `Đã đủ ${MAX_CLAIMS} điều được tra nguồn. Bỏ qua bớt một điều khác trước.`;
const FULL_ADD = `Tối đa ${MAX_CLAIMS} điều được tra nguồn. Bỏ qua bớt một điều để thêm.`;
const LOTS_HELP = "Lần đầu chia nhóm theo độ khó: Khó 2 điều mỗi lần gọi agent, Vừa 4, Dễ 6. Điều đã kiểm ở bài trước được dùng lại thì bớt lần gọi; điều có trích dẫn chưa khớp trang gốc được tra lại tối đa một lần.";

const sorted = (n: number[]) => [...n].sort((a, b) => a - b).join(",");
const sameWords = (a: Claim, b: Claim) => a.text.trim() === b.text.trim() && a.question.trim() === b.question.trim();
const sameClaim = (a: Claim, b: Claim) => sameWords(a, b) && sorted(a.slides) === sorted(b.slides)
  && a.kind === b.kind && a.difficulty === b.difficulty && a.priority === b.priority && a.timeSensitive === b.timeSensitive;

/** Nút có thể bị khoá kèm lời giải thích: bọc sẵn trong span để khoá/mở không dựng lại nút (mất ref, mất focus). */
function Tip({ title, children }: { title?: string; children: ReactNode }) {
  return <Tooltip title={title}><span className="vs-rs-g1-tip">{children}</span></Tooltip>;
}

function warningsOf(review: ClaimReview): string[] {
  const out: string[] = [];
  for (const a of review.anchors) {
    if (!a.inOutline) out.push(`Dàn ý không có slide ${a.slide}.`);
    else if (a.point === null && !a.onSlide) out.push(`Không thấy câu này trong dàn ý slide ${a.slide}.`);
  }
  if (review.missingNumbers.length) {
    const cited = review.anchors.filter((a) => a.inOutline).map((a) => a.slide).join(", ");
    out.push(`Số không có trong dàn ý slide ${cited}: ${review.missingNumbers.join(", ")}.`);
  }
  return out;
}

function ClaimCard({ claim, review, original, manual, checkOutline, locked, onEdit, onDrop }: {
  claim: Claim;
  review: ClaimReview | undefined;
  original: Claim | undefined;
  manual: boolean;
  checkOutline: boolean;
  locked: boolean;
  onEdit: () => void;
  onDrop: () => void;
}) {
  const changedWords = Boolean(original && !sameWords(claim, original));
  const changed = Boolean(original && !sameClaim(claim, original));
  const also = [...new Set(claim.slides)].filter((n) => n !== review?.home);
  const warnings = review && checkOutline ? warningsOf(review) : [];
  const priority = PRIORITY_TAG[claim.priority];
  return <li id={`g1-${claim.id}`} tabIndex={-1} className="vs-rs-g1-card">
    <div className="vs-rs-g1-top">
      <span className="vs-scout-sid mono">{claim.id}</span>
      <span className="vs-rs-g1-kind">{KIND_LABEL[claim.kind]}</span>
      <Tooltip title={DIFFICULTY_HELP[claim.difficulty]}><Tag className="vs-badge">{DIFFICULTY_LABEL[claim.difficulty]}</Tag></Tooltip>
      {claim.timeSensitive && <Tooltip title={TIME_SENSITIVE_HELP}><Tag className="vs-badge">Hay đổi</Tag></Tooltip>}
      {priority && <Tooltip title={PRIORITY_HELP[claim.priority]}><Tag className="vs-badge">{priority}</Tag></Tooltip>}
      {changed && <Tooltip title={changedWords ? REUSE_NOTE : "Đã đổi nhãn so với bản agent."}><Tag className="vs-badge is-waiting">Đã sửa</Tag></Tooltip>}
      {manual && <Tooltip title="Điều bạn thêm — tra nguồn từ đầu."><Tag className="vs-badge">Thêm tay</Tag></Tooltip>}
      {also.length > 0 && <span className="vs-rs-g1-also">cũng ghi slide {also.join(", ")}</span>}
    </div>
    <p className="vs-rs-g1-text">{claim.text}</p>
    <p className="vs-rs-g1-question"><b>Hỏi:</b>{claim.question || "(dùng chính câu trên)"}</p>
    {warnings.map((w) => <p key={w} className="vs-rs-g1-warn"><WarningFilled />{w}</p>)}
    <div className="vs-rs-g1-actions">
      <Tip title={locked ? LOCKED : undefined}>
        <Button id={`g1-${claim.id}-edit`} type="text" size="small" icon={<EditOutlined />} disabled={locked} onClick={onEdit} aria-label={`Sửa ${claim.id}`}>Sửa</Button>
      </Tip>
      <Button id={`g1-${claim.id}-drop`} type="text" size="small" onClick={onDrop} aria-label={`Bỏ qua ${claim.id} — không tra nguồn`}>Bỏ qua</Button>
    </div>
  </li>;
}

function DroppedRow({ claim, full, onUndo }: { claim: Claim; full: boolean; onUndo: () => void }) {
  return <li id={`g1-${claim.id}`} tabIndex={-1} className="vs-rs-g1-card is-off">
    <span className="vs-scout-sid mono">{claim.id}</span>
    <Tag className="vs-badge">Không tra</Tag>
    <span className="vs-rs-g1-offtext">{claim.text}</span>
    <Tip title={full ? FULL_UNDO : undefined}>
      <Button id={`g1-${claim.id}-undo`} type="link" size="small" icon={<UndoOutlined />} disabled={full} onClick={onUndo} aria-label={`Hoàn tác — tra nguồn ${claim.id}`}>Hoàn tác</Button>
    </Tip>
  </li>;
}

function ClaimEditor({ claim, original, isNew, outline, onSave, onCancel, onDelete }: {
  claim: Claim;
  original: Claim | undefined;
  isNew: boolean;
  outline: OutlineSlide[];
  onSave: (next: Claim) => void;
  onCancel: () => void;
  onDelete: () => void;
}) {
  const [buf, setBuf] = useState(claim);
  const [confirming, setConfirming] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const text = useRef<GetRef<typeof Input.TextArea>>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { text.current?.focus({ cursor: "end" }); }, []);
  const set = (patch: Partial<Claim>) => setBuf((b) => ({ ...b, ...patch }));
  const ok = Boolean(buf.text.trim());
  const dirty = !sameClaim(buf, claim);
  const base = `g1-${claim.id}`;
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Gõ tiếng Việt qua bộ gõ: Enter/Esc lúc đang ghép chữ là của bộ gõ. Popconfirm và danh sách của ô chọn nằm
    // ngoài khung (portal) nhưng sự kiện React vẫn nổi lên tới đây — phím bấm ở đó không phải của khung sửa.
    if (e.nativeEvent.isComposing || !root.current?.contains(e.target as Node)) return;
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (ok) onSave(buf);
    } else if (e.key === "Escape") {
      // Esc đóng danh sách hay hộp xác nhận đang mở trước, chưa đóng khung sửa.
      if (confirming || root.current.querySelector('[aria-expanded="true"]')) return;
      e.preventDefault();
      if (dirty) cancelRef.current?.focus();
      else onCancel();
    }
  };
  return <li id={base} tabIndex={-1} className="vs-rs-g1-card is-editing">
    <div ref={root} role="group" aria-label={`Sửa claim ${claim.id}`} className="vs-rs-g1-editor" onKeyDown={onKeyDown}>
      <p className="vs-rs-g1-edithead">{claim.id} · {isNew ? "điều mới" : "đang sửa"}</p>
      <div className="vs-rs-g1-form">
        <label htmlFor={`${base}-text`}>Điều cần kiểm</label>
        <div className="vs-rs-g1-field vs-counted-textarea">
          <Input.TextArea
            ref={text}
            id={`${base}-text`}
            value={buf.text}
            placeholder="Slide nói gì — điều cần kiểm"
            autoSize={{ minRows: 2, maxRows: 6 }}
            maxLength={600}
            showCount
            status={ok ? undefined : "warning"}
            onChange={(e) => set({ text: e.target.value })}
            aria-describedby={`${base}-text-help`}
          />
          <p id={`${base}-text-help`} className="vs-rs-g1-help">{ok ? TEXT_HELP : "Cần có nội dung để lưu."}</p>
        </div>
        <label htmlFor={`${base}-q`}>Câu hỏi để tra</label>
        <div className="vs-rs-g1-field vs-counted-textarea">
          <Input.TextArea
            id={`${base}-q`}
            value={buf.question}
            placeholder="Để trống thì dùng chính câu trên"
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={400}
            showCount
            onChange={(e) => set({ question: e.target.value })}
          />
        </div>
        <label htmlFor={`${base}-slides`}>Slide</label>
        <div className="vs-rs-g1-field">
          <Select
            id={`${base}-slides`}
            mode="multiple"
            size="small"
            value={buf.slides}
            options={slideOptions(outline, buf.slides)}
            showSearch={{ optionFilterProp: "label" }}
            placeholder="Cả bài"
            onChange={(slides: number[]) => set({ slides })}
            aria-describedby={`${base}-slides-help`}
          />
          <p id={`${base}-slides-help`} className="vs-rs-g1-help">{SLIDES_HELP}</p>
        </div>
        <span className="vs-rs-g1-label">Độ khó</span>
        <div className="vs-rs-g1-field">
          {/* tabIndex -1: khung ngoài của Segmented nhận Tab mà không nhận phím mũi tên — phím chỉ chạy trên nút bên trong. */}
          <Segmented size="small" tabIndex={-1} value={buf.difficulty} options={DIFF_OPTIONS} onChange={(difficulty) => set({ difficulty: difficulty as Difficulty })} aria-label="Độ khó" aria-describedby={`${base}-diff-help`} />
          <p id={`${base}-diff-help`} className="vs-rs-g1-help">{DIFFICULTY_HELP[buf.difficulty]}</p>
        </div>
        <span className="vs-rs-g1-label">Ưu tiên</span>
        <div className="vs-rs-g1-field">
          <Segmented size="small" tabIndex={-1} value={buf.priority} options={PRIO_OPTIONS} onChange={(priority) => set({ priority: priority as Priority })} aria-label="Ưu tiên" aria-describedby={`${base}-prio-help`} />
          <p id={`${base}-prio-help`} className="vs-rs-g1-help">{PRIORITY_HELP[buf.priority]}</p>
        </div>
        <label htmlFor={`${base}-ts`}>Hay đổi</label>
        <div className="vs-rs-g1-field">
          <Checkbox id={`${base}-ts`} checked={buf.timeSensitive} onChange={(e) => set({ timeSensitive: e.target.checked })} aria-describedby={`${base}-ts-help`}>
            Dữ kiện có thể đổi trong một năm (phiên bản, giá, thống kê)
          </Checkbox>
          <p id={`${base}-ts-help`} className="vs-rs-g1-help">{TIME_SENSITIVE_HELP}</p>
        </div>
        <label htmlFor={`${base}-kind`}>Loại</label>
        <div className="vs-rs-g1-field">
          <Select id={`${base}-kind`} size="small" value={buf.kind} options={KIND_OPTIONS} onChange={(kind: ClaimKind) => set({ kind })} popupMatchSelectWidth={false} aria-describedby={`${base}-kind-help`} />
          <p id={`${base}-kind-help`} className="vs-rs-g1-help">{KIND_HELP}</p>
        </div>
      </div>
      {original && !sameWords(buf, original) && <p className="vs-rs-g1-reuse">{REUSE_NOTE}</p>}
      <div className="vs-rs-g1-editbar">
        {original
          ? <span>{!sameClaim(buf, original) && <Button type="link" size="small" icon={<RollbackOutlined />} onClick={() => {
              setBuf(original);
              // Nút tự biến mất khi đã về bản agent — đưa focus về ô chữ, không thì nó rơi ra <body> và Esc/Ctrl+Enter thôi chạy.
              text.current?.focus({ cursor: "end" });
            }}>Khôi phục bản agent</Button>}</span>
          : <span><Popconfirm
              title={`Xoá ${claim.id}?`}
              description="Chữ bạn đã gõ cho điều này sẽ mất."
              okText="Xoá"
              cancelText="Thôi"
              okButtonProps={{ autoFocus: true }}
              onOpenChange={setConfirming}
              onConfirm={onDelete}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>Xoá điều này</Button>
            </Popconfirm></span>}
        <Button ref={cancelRef} size="small" onClick={onCancel}>Huỷ</Button>
        <Button type="primary" size="small" disabled={!ok} onClick={() => onSave(buf)} title="Lưu (Ctrl+Enter)" aria-keyshortcuts="Control+Enter Meta+Enter">Lưu</Button>
      </div>
    </div>
  </li>;
}

export function Gate1Panel({ view, act, error }: { view: ResearchView; act: Act; error: string | null }) {
  // Bản agent đưa ra, cố định suốt phiên duyệt: so với nó mới biết claim nào "đã sửa" và khôi phục lại được.
  const [original] = useState(() => new Map(view.claims.map((c) => [c.id, c])));
  const [draft, setDraft] = useState<Claim[]>(view.claims);
  const [off, setOff] = useState<Set<string>>(() => new Set());
  // Mã cho claim thêm tay không bao giờ dùng lại mã đã có trong phiên này — xoá c3 rồi thêm mới mà lại được
  // "c3" thì claim mới mang luôn dấu bỏ tick của c3 cũ và bị bỏ âm thầm khi duyệt.
  const [lastId, setLastId] = useState(() => Math.max(0, ...view.claims.map((c) => Number(c.id.slice(1)) || 0)));
  const [editing, setEditing] = useState<string | null>(null);
  // Claim vừa thêm mà chưa Lưu lần nào: Huỷ thì bỏ hẳn, không để lại một thẻ rỗng.
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  // Cột dàn ý: mặc định chỉ tiêu đề từng slide — mở ý của từng slide khi cần đối chiếu.
  const [points, setPoints] = useState(false);
  // Lần duyệt vừa rồi không qua. Đổi gì trong danh sách là bỏ cờ, để thanh duyệt quay lại đếm claim và lượt agent.
  const [failed, setFailed] = useState(false);
  // Sau mỗi thao tác, focus về đúng nút kế tiếp (Bỏ qua ↔ Hoàn tác, Lưu → Sửa) — nút đó chỉ có sau lần vẽ tới.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  });
  const bar = useRef<HTMLDivElement>(null);
  /**
   * Thanh duyệt dính đáy che mất một dải cuối màn hình: Tab tới Sửa/Bỏ qua của thẻ nằm dưới nó thì nút có focus
   * bị khuất. Cuộn lên đủ để thấy — đo sau khi trình duyệt tự cuộn tới phần tử (nó không biết có thanh dính).
   */
  const revealAboveBar = (e: FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const el = bar.current;
    if (!el || el.contains(target)) return;
    requestAnimationFrame(() => {
      if (getComputedStyle(el).position !== "sticky") return;
      const hidden = target.getBoundingClientRect().bottom - el.getBoundingClientRect().top;
      if (hidden > 0) window.scrollBy({ top: hidden + 16 });
    });
  };

  const outline = useMemo(() => view.outline ?? [], [view.outline]);
  const reviews = useMemo(() => new Map(draft.map((c) => [c.id, reviewClaim(c, outline)])), [draft, outline]);
  const groups = useMemo(() => groupClaims(draft, outline, reviews), [draft, outline, reviews]);
  const kept = draft.filter((c) => !off.has(c.id));
  const chosen = kept.filter((c) => c.text.trim());
  // Trần tính theo claim sẽ được research — claim đã Bỏ qua không chiếm chỗ.
  const full = kept.length >= MAX_CLAIMS;
  const skipped = draft.length - kept.length;
  const lots = batches(chosen).length;
  const locked = editing !== null;

  const toggle = (ids: string[], research: boolean) => {
    setFailed(false);
    setOff((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (research) n.delete(id);
        else n.add(id);
      }
      return n;
    });
  };
  const drop = (id: string) => { toggle([id], false); pendingFocus.current = `g1-${id}-undo`; };
  const undo = (id: string) => {
    if (full) return;
    toggle([id], true);
    pendingFocus.current = `g1-${id}-drop`;
  };
  const add = (slides: number[] = []) => {
    const id = `c${lastId + 1}`;
    setFailed(false);
    setLastId(lastId + 1);
    setDraft((d) => [...d, { ...blankClaim(id), slides }]);
    setFresh((s) => new Set(s).add(id));
    setEditing(id);
  };
  const forget = (id: string) => (s: Set<string>) => {
    const n = new Set(s);
    n.delete(id);
    return n;
  };
  const save = (next: Claim) => {
    const clean = { ...next, text: next.text.trim(), question: next.question.trim() };
    setFailed(false);
    setDraft((d) => d.map((c) => (c.id === clean.id ? clean : c)));
    setFresh(forget(clean.id));
    setEditing(null);
    pendingFocus.current = `g1-${clean.id}-edit`;
  };
  const remove = (id: string) => {
    setFailed(false);
    setDraft((d) => d.filter((c) => c.id !== id));
    setOff(forget(id));
    setFresh(forget(id));
    setEditing(null);
    pendingFocus.current = "g1-add";
  };
  const cancel = (id: string) => {
    if (fresh.has(id)) return remove(id);
    setEditing(null);
    pendingFocus.current = `g1-${id}-edit`;
  };
  const submit = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await act({ action: "approve-claims", claims: chosen });
    setBusy(false);
    if (!ok) setFailed(true);
  };
  /**
   * Chip `c2` đưa tới thẻ của nó. Thẻ đang mở sửa thì vào thẳng ô chữ. Vòng focus quanh thẻ chỉ hiện khi tới bằng
   * chip (lớp `is-target`, gỡ khi rời) — bấm chuột vào chữ trên thẻ cũng focus thẻ mà không nên để lại vòng.
   */
  const focusCard = (id: string) => {
    if (editing === id) return document.getElementById(`g1-${id}-text`)?.focus();
    const card = document.getElementById(`g1-${id}`);
    if (!card) return;
    card.classList.add("is-target");
    card.addEventListener("blur", () => card.classList.remove("is-target"), { once: true });
    card.focus();
  };
  const chip = (id: string) => <button key={id} type="button" className="vs-rs-ref" onClick={() => focusCard(id)} aria-label={`Tới ${id}`}>{id}</button>;
  const idLink = (id: string) => <button key={id} type="button" className="vs-rs-idlink" onClick={() => focusCard(id)} aria-label={`Tới ${id}`}>{id}</button>;

  const renderClaim = (c: Claim) => {
    if (editing === c.id) {
      return <ClaimEditor key={c.id} claim={c} original={original.get(c.id)} isNew={fresh.has(c.id)} outline={outline}
        onSave={save} onCancel={() => cancel(c.id)} onDelete={() => remove(c.id)} />;
    }
    if (off.has(c.id)) return <DroppedRow key={c.id} claim={c} full={full} onUndo={() => undo(c.id)} />;
    return <ClaimCard key={c.id} claim={c} review={reviews.get(c.id)} original={original.get(c.id)} manual={!original.has(c.id)}
      checkOutline={outline.length > 0} locked={locked} onEdit={() => setEditing(c.id)} onDrop={() => drop(c.id)} />;
  };

  const renderGroup = (g: SlideGroup) => {
    const ids = g.claims.map((c) => c.id);
    const anyKept = ids.some((id) => !off.has(id));
    const tooMany = !anyKept && kept.length + ids.length > MAX_CLAIMS;
    const head = `g1-${g.key}-h`;
    const where = g.slide === null ? "nhóm cả bài" : `slide ${g.slide}`;
    return <div key={g.key} role="group" className="vs-rs-g1-group" aria-labelledby={head}>
      <div className="vs-rs-g1-ghead">
        <h4 id={head}>
          <span className="vs-rs-g1-slide">{g.slide === null ? "Cả bài" : `Slide ${g.slide}`}</span>{" "}
          {g.slide === null ? "Chưa gắn slide" : g.title || (g.inOutline ? "" : "(không có trong dàn ý)")}
          {g.skip && <Tag className="vs-badge">không đọc</Tag>}
        </h4>
        <span className="vs-rs-g1-count">{ids.length} điều</span>
        {(ids.length >= 2 || g.skip) && <Tip title={locked ? LOCKED : tooMany ? FULL_UNDO : undefined}>
          <Button
            type="link"
            size="small"
            disabled={locked || tooMany}
            onClick={() => toggle(ids, !anyKept)}
            aria-label={anyKept ? `Bỏ qua cả slide — ${ids.length} điều của ${where}` : `Hoàn tác cả slide — tra lại ${ids.length} điều của ${where}`}
          >{anyKept ? "Bỏ qua cả slide" : "Hoàn tác cả slide"}</Button>
        </Tip>}
      </div>
      {g.skip && <p className="vs-rs-g1-skipnote">Agent đánh dấu slide này là không đọc thành lời, nên kịch bản không cần câu nào cho nó — tra nguồn các điều ở đây nhiều khả năng thừa.</p>}
      {g.slide !== null && g.points.length > 0 && <details className="vs-rs-g1-source">
        <summary>Dàn ý slide · {g.points.length} dòng</summary>
        <ul className="vs-rs-g1-points">
          {g.points.map((p, i) => {
            const here = g.claims.filter((c) => reviews.get(c.id)?.anchors.find((a) => a.slide === g.slide)?.point === i);
            return <li key={i} className={here.length ? "is-claimed" : undefined}>{p}{here.map((c) => chip(c.id))}</li>;
          })}
        </ul>
        <Tip title={locked ? LOCKED : full ? FULL_ADD : undefined}>
          <Button type="link" size="small" icon={<PlusOutlined />} disabled={locked || busy || full} onClick={() => add([g.slide!])}>Thêm điều ở slide {g.slide}</Button>
        </Tip>
      </details>}
      <ul className="vs-rs-g1-list">{g.claims.map(renderClaim)}</ul>
    </div>;
  };

  const firstEntry = new Map<number, number>();
  outline.forEach((o, i) => { if (!firstEntry.has(o.slide)) firstEntry.set(o.slide, i); });
  // Đếm đúng những mục dàn ý có chip claim bên dưới — slide claim dẫn tới, kể cả slide không phải "nhà" của nó.
  const withClaims = new Set(draft.flatMap((c) => c.slides).filter((n) => firstEntry.has(n))).size;

  // Lỗi chỉ hiện khi trang còn giữ nó: đóng thông báo ở đầu trang hay đổi danh sách là thanh quay lại đếm.
  const failure = failed && !locked && error ? error : null;
  // Nhiều điều hơn mức kịch bản dùng được: nói ra ở thanh duyệt — người duyệt quyết bỏ bớt hay giữ.
  const cap = claimCap(view.state.options.cues);
  const over = chosen.length > cap ? ` · nhiều hơn mức ${cap} điều cho kịch bản ${view.state.options.cues} câu` : "";
  const state = locked
    ? `Đang sửa ${editing} — Lưu hoặc Huỷ trước khi duyệt.`
    : failure
      ? `Chưa duyệt được: ${failure}`
      : chosen.length
        ? `Tra ${chosen.length} điều${skipped ? ` · bỏ qua ${skipped}` : ""} · khoảng ${lots} lần gọi agent${full ? ` · đã đủ ${MAX_CLAIMS} điều` : ""}${over}`
        : "Không tra điều nào — kịch bản viết thẳng từ slide.";

  return <div className="vs-rs-g1" onFocus={revealAboveBar}>
    <div className="vs-rs-grid">
      <div className="vs-rs-main vs-rs-g1-main">
        {view.claims.length === 0 && <p className="vs-scout-empty">Agent không thấy điều gì cần kiểm. Thêm tay, hoặc viết kịch bản thẳng từ slide.</p>}
        {groups.map(renderGroup)}
      </div>
      {outline.length > 0 && <aside className="vs-rs-aside" aria-label="Dàn ý slide">
        <p className="vs-rs-aside-head">Dàn ý slide · {outlineSummary(outline)} · {withClaims} slide có điều cần kiểm</p>
        <span className="vs-rs-switchline"><Switch size="small" checked={points} onChange={setPoints} aria-label="Hiện ý của từng slide" /> Hiện ý của từng slide</span>
        <ol className="vs-rs-outline">{outline.map((o, i) => {
          const ids = firstEntry.get(o.slide) === i ? draft.filter((c) => c.slides.includes(o.slide)).map((c) => c.id) : [];
          return <li key={`${o.slide}-${i}`} value={o.slide}>
            {o.heading || `Slide ${o.slide}`}{o.skip ? " · không đọc" : ""}
            {ids.map(idLink)}
            {points && (o.points?.length ?? 0) > 0 && <ul>{o.points!.map((p, j) => <li key={j}>{p}</li>)}</ul>}
          </li>;
        })}</ol>
      </aside>}
    </div>
    <p id="g1-lots-help" className="sr-only">{LOTS_HELP}</p>
    <DecisionBar
      barRef={bar}
      tone={failure ? "error" : "waiting"}
      lead={failure ? "Lỗi" : "Tới lượt bạn"}
      text={<>
        {state}
        {!locked && !failure && chosen.length > 0 && <Tooltip title={LOTS_HELP} trigger={["hover", "focus"]}>
          <InfoCircleOutlined className="vs-rs-decide-info" tabIndex={0} aria-label="Cách tính số lần gọi agent" aria-describedby="g1-lots-help" />
        </Tooltip>}
      </>}
      actions={<>
        <Tip title={full ? FULL_ADD : undefined}>
          <Button id="g1-add" icon={<PlusOutlined />} disabled={busy || locked || full} onClick={() => add()}>Thêm điều</Button>
        </Tip>
        <Button type="primary" icon={<CheckCircleFilled />} loading={busy} disabled={locked} onClick={() => void submit()}>
          {chosen.length ? `Duyệt · tra ${chosen.length} điều` : "Viết kịch bản từ slide, không tra nguồn"}
        </Button>
      </>}
    />
  </div>;
}
