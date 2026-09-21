"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircleFilled, DeleteOutlined, ExportOutlined, FileTextOutlined, PlusOutlined, RedoOutlined, SendOutlined, WarningFilled,
} from "@ant-design/icons";
import { Button, Checkbox, Collapse, Input, Popconfirm, Segmented, Select, Tag } from "antd";
import { fileUrl } from "@/lib/client";
import {
  blankClaim, DIFFICULTY_LABEL, GATE2_LABEL, KIND_LABEL, PRIORITY_LABEL, RUN_RESULT_LABEL, STANCE_LABEL, VERDICT_LABEL,
  type Claim, type ClaimKind, type Difficulty, type Gate2Decision, type Priority, type ResearchView,
} from "@/lib/research";
import type { LogEntry } from "@/lib/types";

/** Gửi một thao tác lên máy chủ. Trả về có làm được không; lỗi đã được trang hiện ra, người gọi không cần bắt. */
export type Act = (body: Record<string, unknown>) => Promise<boolean>;

const clock = (t: number | string) => new Date(t).toLocaleTimeString("vi-VN", { hour12: false });
const host = (url: string) => {
  try { return new URL(url).host.replace(/^www\./, ""); } catch { return url; }
};

// ── nhật ký ───────────────────────────────────────────────────────────────────────

export function LogList({ logs, empty = "Chưa có hoạt động." }: { logs: LogEntry[]; empty?: string }) {
  const list = useRef<HTMLOListElement>(null);
  // Nhật ký dài hơn khung rất nhanh; không tự cuộn thì người xem phải kéo tay suốt lượt chạy.
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight }); }, [logs.length]);
  if (!logs.length) return <p className="vs-scout-empty">{empty}</p>;
  return <ol ref={list} className="vs-scout-flow vs-rs-log">
    {logs.map((e, i) => <li key={`${e.t}-${i}`} className={`vs-scout-row is-${e.kind === "error" ? "error" : e.kind === "result" ? "done" : e.kind === "tool" && /^Tìm web/.test(e.text) ? "search" : "tool"}`}>
      <span className="vs-scout-time mono">{clock(e.t)}</span>
      <span className="vs-scout-body">{e.kind === "agent" || e.kind === "result" || e.kind === "error" ? <p className={e.kind === "error" ? "vs-scout-error" : "vs-scout-say"}>{e.text}</p> : <small>{e.text}</small>}</span>
    </li>)}
  </ol>;
}

// ── cổng 1 · duyệt claim ──────────────────────────────────────────────────────────

const KIND_OPTIONS = (Object.keys(KIND_LABEL) as ClaimKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }));
const DIFF_OPTIONS = (Object.keys(DIFFICULTY_LABEL) as Difficulty[]).map((k) => ({ value: k, label: DIFFICULTY_LABEL[k] }));
const PRIO_OPTIONS = (Object.keys(PRIORITY_LABEL) as Priority[]).map((k) => ({ value: k, label: PRIORITY_LABEL[k] }));

function ClaimCard({ claim, on, onChange, onToggle, onRemove }: { claim: Claim; on: boolean; onChange: (c: Claim) => void; onToggle: (on: boolean) => void; onRemove: () => void }) {
  const set = (patch: Partial<Claim>) => onChange({ ...claim, ...patch });
  return <li className={`vs-scout-item${on ? "" : " is-off"}`}>
    <Checkbox checked={on} onChange={(e) => onToggle(e.target.checked)} aria-label={`Kiểm claim ${claim.id}`} />
    <div className="vs-scout-item-body">
      <div className="vs-scout-item-head vs-rs-claim-head">
        <span className="vs-scout-sid mono">{claim.id}</span>
        <Select size="small" value={claim.kind} options={KIND_OPTIONS} onChange={(kind) => set({ kind })} popupMatchSelectWidth={false} aria-label="Loại" />
        <Select size="small" value={claim.difficulty} options={DIFF_OPTIONS} onChange={(difficulty) => set({ difficulty })} popupMatchSelectWidth={false} aria-label="Độ khó" />
        <Select size="small" value={claim.priority} options={PRIO_OPTIONS} onChange={(priority) => set({ priority })} popupMatchSelectWidth={false} aria-label="Ưu tiên" />
        <Checkbox checked={claim.timeSensitive} onChange={(e) => set({ timeSensitive: e.target.checked })}>Hay đổi</Checkbox>
        <span className="vs-scout-item-slides mono">{claim.slides.length ? `slide ${claim.slides.join(", ")}` : "cả bài"}</span>
        <Button type="text" size="small" icon={<DeleteOutlined />} onClick={onRemove} aria-label="Xoá claim này" />
      </div>
      <Input.TextArea value={claim.text} placeholder="Slide nói gì — điều cần kiểm" autoSize={{ minRows: 1, maxRows: 4 }} maxLength={600} onChange={(e) => set({ text: e.target.value })} aria-label="Nội dung slide" />
      <Input value={claim.question} placeholder="Câu hỏi research phải trả lời" maxLength={400} onChange={(e) => set({ question: e.target.value })} aria-label="Câu hỏi" />
    </div>
  </li>;
}

export function Gate1Panel({ view, act }: { view: ResearchView; act: Act }) {
  const [draft, setDraft] = useState<Claim[]>(view.claims);
  const [off, setOff] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  // Mã cho claim thêm tay không bao giờ dùng lại mã đã có trong phiên này — xoá c3 rồi thêm mới mà lại được
  // "c3" thì claim mới mang luôn dấu bỏ tick của c3 cũ và bị bỏ âm thầm khi duyệt.
  const [lastId, setLastId] = useState(() => Math.max(0, ...view.claims.map((c) => Number(c.id.slice(1)) || 0)));
  const chosen = draft.filter((c) => !off.has(c.id) && c.text.trim());
  const add = () => {
    setDraft([...draft, blankClaim(`c${lastId + 1}`)]);
    setLastId(lastId + 1);
  };
  const submit = async () => {
    setBusy(true);
    await act({ action: "approve-claims", claims: chosen });
    setBusy(false);
  };
  return <div className="vs-scout-review">
    <p className="vs-scout-review-lede">
      Agent đã đọc slide và chọn <strong>{view.claims.length} điều nên kiểm trên web</strong>. Bỏ tick điều không cần, sửa lại cho đúng
      ý, hoặc thêm điều agent bỏ sót. Độ khó quyết định cần bao nhiêu nguồn: <em>Dễ</em> một nguồn chính thức là đủ, <em>Vừa</em> và
      <em> Khó</em> cần hai nơi xuất bản độc lập.
    </p>
    {view.outline && <Collapse size="small" className="vs-scout-outline" items={[{
      key: "outline",
      label: `Dàn ý agent bóc được · ${view.outline.length} slide`,
      children: <ol>{view.outline.map((o) => <li key={o.slide} value={o.slide}><strong>{o.heading || `Slide ${o.slide}`}</strong>{o.skip && <Tag className="vs-badge">bỏ qua</Tag>}{(o.points?.length ?? 0) > 0 && <ul>{o.points!.map((p, i) => <li key={i}>{p}</li>)}</ul>}</li>)}</ol>,
    }]} />}
    {draft.length === 0
      ? <p className="vs-scout-empty">Agent không thấy điều gì cần kiểm. Thêm tay, hoặc viết kịch bản thẳng từ slide.</p>
      : <ul className="vs-scout-items">
          {draft.map((c, i) => <ClaimCard
            key={c.id}
            claim={c}
            on={!off.has(c.id)}
            onChange={(next) => setDraft(draft.map((x, j) => (j === i ? next : x)))}
            onToggle={(on) => setOff((s) => { const n = new Set(s); if (on) n.delete(c.id); else n.add(c.id); return n; })}
            onRemove={() => {
              setDraft(draft.filter((_, j) => j !== i));
              setOff((s) => { const n = new Set(s); n.delete(c.id); return n; });
            }}
          />)}
        </ul>}
    <div className="vs-scout-review-actions">
      <Button icon={<PlusOutlined />} disabled={busy || draft.length >= 25} onClick={add}>Thêm claim</Button>
      <Button type="primary" icon={<CheckCircleFilled />} loading={busy} onClick={() => void submit()}>
        {chosen.length ? `Duyệt · research ${chosen.length} claim` : "Viết kịch bản từ slide, không research"}
      </Button>
    </div>
  </div>;
}

// ── claim ─────────────────────────────────────────────────────────────────────────

export function ClaimDetail({ view, cid, act, running }: { view: ResearchView; cid: string; act: Act; running: boolean }) {
  const [busy, setBusy] = useState(false);
  const claim = view.claims.find((c) => c.id === cid);
  const finding = view.findings[cid];
  const check = view.evidence[cid];
  if (!claim) return <p className="vs-scout-empty">Claim {cid} không còn trong danh sách.</p>;
  const evidence = Array.isArray(finding?.evidence) ? finding.evidence : [];
  const sourceOf = (ref: string) => {
    const sid = view.sources[ref] ? ref : Object.values(view.sources).find((s) => s.url === ref || s.finalUrl === ref)?.id;
    return sid ? view.sources[sid] : null;
  };
  return <div className="vs-scout-node">
    <p className="vs-scout-node-lede">
      <Tag className="vs-badge">{KIND_LABEL[claim.kind]}</Tag>
      <Tag className="vs-badge">{DIFFICULTY_LABEL[claim.difficulty]}</Tag>
      {claim.timeSensitive && <Tag className="vs-badge">hay đổi</Tag>}
      <span className="mono">{claim.slides.length ? `slide ${claim.slides.join(", ")}` : "cả bài"}</span> · {claim.text}
    </p>
    <p className="vs-rs-question">Câu hỏi: {claim.question}</p>
    {finding && <div className={`vs-rs-finding is-${finding.verdict}`}>
      <strong>{VERDICT_LABEL[finding.verdict]}{finding.reused && <Tag className="vs-badge">dùng lại · soát {finding.reused.checkedAt.slice(0, 10)}</Tag>}</strong>
      <p>{finding.answer}</p>
      {finding.corrected && <p className="vs-rs-corrected">Dùng trong kịch bản: {finding.corrected}</p>}
      {finding.reason && <p className="vs-rs-reason">{finding.reason}</p>}
    </div>}
    {evidence.length > 0 && <ul className="vs-rs-evidence">
      {evidence.map((e, i) => {
        const s = sourceOf(e.source);
        const url = s?.finalUrl || s?.url || (/^https?:/.test(e.source) ? e.source : null);
        return <li key={i} className={`is-${e.stance}`}>
          <div className="vs-rs-evidence-head">
            <span className="vs-scout-sid mono">{s?.id ?? "?"}</span>
            {url ? <a href={url} target="_blank" rel="noreferrer">{s?.title || host(url)}<ExportOutlined /></a> : <span>{e.source}</span>}
            <small>{s?.publisher || (url ? host(url) : "")}{s?.published ? ` · ${s.published}` : " · không ghi ngày"}</small>
            <Tag className={`vs-badge is-${e.stance}`}>{STANCE_LABEL[e.stance]}</Tag>
            {s?.ok && <a className="vs-rs-page" href={fileUrl(`research/${view.state.id}/sources/${s.id}/page.txt`)} target="_blank" rel="noreferrer">trang đã tải</a>}
          </div>
          <q>{e.quote}</q>
        </li>;
      })}
    </ul>}
    {check && <div className={`vs-scout-check ${check.ok ? "is-ok" : "is-warn"}`}>
      <p className="vs-scout-check-line">
        {check.ok ? "Đạt soát" : "Chưa đạt soát"} · {check.quotes.verified}/{check.quotes.total} trích đoạn khớp nguyên văn trang gốc
        {check.quotes.unverifiable ? ` · ${check.quotes.unverifiable} không đối chiếu được` : ""} · lượt {view.state.attempts[cid] ?? 0}/2
      </p>
      {((check.problems?.length ?? 0) > 0 || (check.warnings?.length ?? 0) > 0) && <ul className="vs-scout-problems">
        {(check.problems ?? []).map((p, i) => <li key={`p${i}`}><WarningFilled /> {p}</li>)}
        {(check.warnings ?? []).map((w, i) => <li key={`w${i}`} className="is-warning">{w}</li>)}
      </ul>}
    </div>}
    {!finding && !check && <p className="vs-scout-empty">Chưa research claim này.</p>}
    {/* Chỉ có nghĩa khi lượt đã tới chặng research; trước đó máy chủ từ chối. */}
    {!view.state.sample && !["extract", "gate1"].includes(view.state.stage) && <Popconfirm
      title="Research lại claim này?"
      description="Kết quả hiện tại của claim sẽ bị xoá; kịch bản sẽ được viết lại sau đó."
      okText="Research lại"
      cancelText="Thôi"
      onConfirm={async () => {
        setBusy(true);
        await act({ action: "rerun", step: "research", only: [cid] });
        setBusy(false);
      }}
    ><Button size="small" icon={<RedoOutlined />} disabled={running || busy} loading={busy}>Research lại claim này</Button></Popconfirm>}
  </div>;
}

// ── cổng 2 ────────────────────────────────────────────────────────────────────────

export function Gate2Panel({ view, act }: { view: ResearchView; act: Act }) {
  const failing = view.claims.filter((c) => !view.evidence[c.id]?.ok);
  const [decisions, setDecisions] = useState<Record<string, Gate2Decision>>(() => Object.fromEntries(failing.map((c) => [c.id, "accept" as Gate2Decision])));
  const [busy, setBusy] = useState(false);
  return <div className="vs-scout-review">
    <p className="vs-scout-review-lede">
      {failing.length} claim vẫn chưa đạt soát bằng chứng sau hai lượt research. Chọn cho từng claim: research thêm một lượt, bỏ khỏi kịch bản,
      hoặc ghi nhận là chưa đủ nguồn — kịch bản sẽ không khẳng định điều đó.
    </p>
    <ul className="vs-scout-items">
      {failing.map((c) => <li key={c.id} className="vs-scout-item vs-rs-decision">
        <span className="vs-scout-sid mono">{c.id}</span>
        <div className="vs-scout-item-body">
          <strong>{c.text}</strong>
          <ul className="vs-scout-problems">{(view.evidence[c.id]?.problems ?? ["chưa có kết quả"]).slice(0, 4).map((p, i) => <li key={i}>{p}</li>)}</ul>
          <Segmented
            size="small"
            value={decisions[c.id]}
            onChange={(v) => setDecisions({ ...decisions, [c.id]: v as Gate2Decision })}
            options={(Object.keys(GATE2_LABEL) as Gate2Decision[]).map((d) => ({ value: d, label: GATE2_LABEL[d] }))}
          />
        </div>
      </li>)}
    </ul>
    <div className="vs-scout-review-actions">
      <span />
      <Button type="primary" loading={busy} onClick={async () => { setBusy(true); await act({ action: "gate2", decisions }); setBusy(false); }}>Tiếp tục</Button>
    </div>
  </div>;
}

// ── kịch bản ──────────────────────────────────────────────────────────────────────

interface Cue { n: number; section: string | null; fields: Record<string, string> }

/** Đọc kịch bản theo mẫu để hiển thị — bản đầy đủ (dùng để soát) nằm ở tools/lib/script-lint.mjs. */
function parseCues(md: string) {
  const cues: Cue[] = [];
  let section: string | null = null;
  let cue: Cue | null = null;
  for (const line of md.replace(/\r\n?/g, "\n").split("\n")) {
    if (/^##\s+/.test(line) && !/^###/.test(line)) { section = line.replace(/^##\s+/, "").trim(); cue = null; continue; }
    const h = /^###\s+Câu\s+(\d+)/i.exec(line);
    if (h) { cue = { n: Number(h[1]), section, fields: {} }; cues.push(cue); continue; }
    const f = /^\s*-\s*\*\*([^*:]+?):?\*\*:?\s*(.*)$/.exec(line);
    if (f && cue) cue.fields[f[1].trim().toLowerCase()] = f[2].trim();
  }
  return cues;
}

export function ScriptView({ view, onClaim }: { view: ResearchView; onClaim: (cid: string) => void }) {
  const cues = useMemo(() => parseCues(view.script ?? ""), [view.script]);
  const issues = view.scriptCheck?.issues ?? [];
  const edit = view.edit?.issues ?? [];
  if (!view.script) return <p className="vs-scout-empty">Chưa có kịch bản.</p>;
  return <div className="vs-rs-script">
    <p className="vs-scout-deliverable"><FileTextOutlined /><a href={fileUrl(`research/${view.state.id}/output/kich-ban.md`)} target="_blank" rel="noreferrer">research/{view.state.id}/output/kich-ban.md</a></p>
    <ol className="vs-rs-cues">
      {cues.map((c, i) => {
        const head = i === 0 || cues[i - 1].section !== c.section ? c.section : null;
        const refs = (c.fields["nguồn"] ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);
        const mine = issues.filter((i) => i.cue === c.n);
        const notes = edit.filter((i) => i.cue === c.n);
        return <li key={c.n} value={c.n}>
          {head && <h4>{head}</h4>}
          <div className={`vs-rs-cue${mine.some((i) => i.level === "problem") ? " is-problem" : ""}`}>
            <span className="vs-rs-cue-n mono">{c.n}</span>
            <div>
              <p className="vs-rs-cue-line">{c.fields["lời"] ?? <em>thiếu lời</em>}</p>
              {c.fields["trên màn hình"] && <p className="vs-rs-cue-screen">{c.fields["trên màn hình"]}</p>}
              <p className="vs-rs-cue-meta">
                {c.fields["kiểu"] && <Tag className="vs-badge">{c.fields["kiểu"]}</Tag>}
                {refs.map((r) => /^c\d+$/i.test(r)
                  ? <button key={r} type="button" className="vs-rs-ref" onClick={() => onClaim(r.toLowerCase())}>{r}</button>
                  : <span key={r} className="vs-rs-ref is-slide">{r}</span>)}
              </p>
              {mine.map((i, k) => <p key={k} className={`vs-rs-cue-issue is-${i.level}`}>{i.message}</p>)}
              {notes.map((i, k) => <p key={`e${k}`} className="vs-rs-cue-issue is-edit">Biên tập [{i.type}]: {i.problem} → {i.fix}</p>)}
            </div>
          </div>
        </li>;
      })}
    </ol>
  </div>;
}

export function ReviewDetail({ view }: { view: ResearchView }) {
  const sc = view.scriptCheck;
  const general = sc?.issues.filter((i) => i.cue === null) ?? [];
  return <div className="vs-scout-node">
    {sc ? <div className={`vs-scout-check ${sc.ok ? "is-ok" : "is-warn"}`}>
      <h3>Soát theo mẫu kịch bản (code)</h3>
      <p className="vs-scout-check-line">
        {sc.stats.cues} câu · ~{Math.round(sc.stats.seconds / 6) / 10} phút · phủ {sc.coverage.covered}/{sc.coverage.slides} slide ·{" "}
        {sc.issues.filter((i) => i.level === "problem").length} lỗi · {sc.issues.filter((i) => i.level === "warning").length} cảnh báo
      </p>
      {general.length > 0 && <ul className="vs-scout-problems">{general.map((i, k) => <li key={k}>{i.message}</li>)}</ul>}
    </div> : <p className="vs-scout-empty">Chưa soát.</p>}
    {view.edit && <div className="vs-rs-edit">
      <h3>Biên tập (agent, ngữ cảnh riêng)</h3>
      <p className="vs-rs-scores">
        {Object.entries(view.edit.score).map(([k, v]) => <span key={k}><small>{({ accuracy: "Chính xác", hook: "Mở đầu", flow: "Mạch", clarity: "Rõ ràng", spoken: "Văn nói" } as Record<string, string>)[k] ?? k}</small><strong>{v}/5</strong></span>)}
      </p>
      <p className="vs-scout-node-note">{view.edit.issues.length ? `${view.edit.issues.length} góp ý — người viết đã sửa một lượt theo đó; góp ý hiện cạnh từng câu bên dưới.` : "Không có góp ý nào."}</p>
    </div>}
  </div>;
}

export function Gate3Panel({ view, act, onClaim }: { view: ResearchView; act: Act; onClaim: (cid: string) => void }) {
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    if (await act(body)) setFeedback("");
    setBusy(false);
  };
  return <div className="vs-scout-review">
    <p className="vs-scout-review-lede">
      Kịch bản đã qua soát theo mẫu và một lượt biên tập. Đọc lại — bấm vào mã claim ở cuối mỗi câu để xem nguồn — rồi duyệt, hoặc viết góp ý để
      agent sửa. Góp ý chỉ sửa kịch bản, bằng chứng giữ nguyên.
    </p>
    <ScriptView view={view} onClaim={onClaim} />
    <Input.TextArea value={feedback} onChange={(e) => setFeedback(e.target.value)} autoSize={{ minRows: 2, maxRows: 6 }} maxLength={4000} placeholder="Góp ý cho kịch bản (ví dụ: câu 3 dài quá; phần hai cần thêm ví dụ từ slide 5)" aria-label="Góp ý" />
    <div className="vs-scout-review-actions">
      <Button icon={<SendOutlined />} disabled={!feedback.trim()} loading={busy} onClick={() => void run({ action: "feedback", feedback })}>Gửi góp ý · sửa lại</Button>
      <Button type="primary" icon={<CheckCircleFilled />} loading={busy} onClick={() => void run({ action: "approve-script" })}>Duyệt kịch bản</Button>
    </div>
  </div>;
}

// ── lượt agent ────────────────────────────────────────────────────────────────────

export function RunsTable({ view }: { view: ResearchView }) {
  if (!view.state.runs.length) return null;
  return <div className="vs-rs-runs">
    <h3>Các lượt agent</h3>
    <table>
      <thead><tr><th>#</th><th>Việc</th><th>Agent</th><th>Kết quả</th><th>Token vào</th><th>Đọc cache</th><th>Token ra</th></tr></thead>
      <tbody>
        {view.state.runs.map((r) => <tr key={r.n}>
          <td className="mono">{r.n}</td>
          <td>{r.step}{r.claims?.length ? ` ${r.claims.join(", ")}` : ""}</td>
          <td>{r.agent}{r.model ? ` · ${r.model}` : ""}</td>
          <td>{r.result ? RUN_RESULT_LABEL[r.result] : "đang chạy"}</td>
          <td className="mono">{r.usage ? (r.usage.input + r.usage.cacheWrite).toLocaleString("vi-VN") : "—"}</td>
          <td className="mono">{r.usage ? r.usage.cacheRead.toLocaleString("vi-VN") : "—"}</td>
          <td className="mono">{r.usage ? r.usage.output.toLocaleString("vi-VN") : "—"}</td>
        </tr>)}
      </tbody>
    </table>
  </div>;
}
