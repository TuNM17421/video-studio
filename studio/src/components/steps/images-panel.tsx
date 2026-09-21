"use client";

import { useEffect, useState } from "react";
import { CheckCircleFilled, ExportOutlined, LoadingOutlined, PictureOutlined, PlayCircleFilled, RedoOutlined, StopOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Input, Popconfirm, Tag } from "antd";
import { fileUrl } from "@/lib/client";
import { IMAGE_ACTION_LABEL, isShareAlike, licenseLabel, type ImageAction, type ImageCandidate, type ImageDecision, type ImagePick, type ImageSlot, type ImagesView } from "@/lib/images";
import type { VideoDetail } from "@/lib/types";
import { AgentLog } from "../agent-panel";
import { ProductionState } from "../production-state";
import { post } from "./shared";

type Act = (fn: () => Promise<unknown>) => Promise<void>;

const DECISION_LABEL: Record<ImageAction, string> = { use: "Dùng ảnh trong video", reference: "Dùng làm tham khảo", skip: "Dùng animation" };
const KIND_LABEL: Record<ImageSlot["kind"], string> = { use: "ảnh trong video", reference: "tham khảo để vẽ lại" };

const cueRange = (cues: number[]) => (cues.length > 1 ? `Câu ${cues[0]}–${cues[cues.length - 1]}` : `Câu ${cues[0]}`);

/** Một ảnh: thumbnail, metadata của nguồn, và hai cách dùng. Chữ mô tả là của nguồn, `why` là của agent. */
function CandidateCard({ c, pick, chosen, slotKind, disabled, onChoose }: {
  c: ImageCandidate;
  pick?: ImagePick;
  chosen: ImageAction | null;
  slotKind: ImageSlot["kind"];
  disabled: boolean;
  onChoose: (action: "use" | "reference") => void;
}) {
  const primary = slotKind === "reference" ? "reference" : "use";
  const secondary = primary === "use" ? "reference" : "use";
  const byline = [c.creator, c.date].filter(Boolean).join(" · ");
  return <li className={`vs-image-card${chosen ? " is-chosen" : ""}`}>
    <a className="vs-image-thumb" href={c.landingUrl ?? undefined} target="_blank" rel="noreferrer" title="Mở trang nguồn">
      <img src={fileUrl(c.thumb)} alt={c.title ?? c.id} loading="lazy" />
    </a>
    <div className="vs-image-meta">
      {pick && <Tag color={pick.fit === "good" ? "success" : "default"}>{pick.fit === "good" ? "Hợp" : "Tạm được"}</Tag>}
      {chosen && <Tag color="processing" icon={<CheckCircleFilled />}>{DECISION_LABEL[chosen]}</Tag>}
      <strong title={c.description ?? undefined}>{c.title || c.id}</strong>
      {byline && <span className="quiet-label">{byline}</span>}
      <span className="vs-image-license">
        {licenseLabel(c.license, c.licenseVersion)}
        {isShareAlike(c.license) && <span title="Share-alike: tác phẩm phái sinh phải giữ cùng giấy phép"> · share-alike</span>}
        {c.lowRes && <span className="vs-image-warn"> · độ phân giải thấp</span>}
      </span>
      {pick?.why && <p className="vs-image-why">{pick.why}</p>}
      {c.landingUrl && <a className="vs-image-source" href={c.landingUrl} target="_blank" rel="noreferrer">Trang nguồn <ExportOutlined /></a>}
    </div>
    <div className="vs-image-actions">
      <Button size="small" type={chosen === primary ? "primary" : "default"} disabled={disabled} onClick={() => onChoose(primary)}>{IMAGE_ACTION_LABEL[primary]}</Button>
      <Button size="small" type="text" disabled={disabled} onClick={() => onChoose(secondary)}>{secondary === "use" ? "Dùng trong video" : "Chỉ tham khảo"}</Button>
    </div>
  </li>;
}

/** Một chỗ trong video: câu, vì sao nên có ảnh, ảnh được xếp hạng, và lựa chọn của người dựng. */
function SlotCard({ s, cueText, disabled, decide, research }: {
  s: ImageSlot;
  cueText: string;
  disabled: boolean;
  decide: (decision: ImageDecision | null) => void;
  research: () => void;
}) {
  const [more, setMore] = useState(false);
  const [caption, setCaption] = useState(s.decision?.caption ?? "");
  const byId = new Map(s.candidates.map((c) => [c.id, c]));
  const picks = s.picks.filter((p) => byId.has(p.id));
  const others = s.candidates.filter((c) => !picks.some((p) => p.id === c.id));
  // Ảnh người dựng tự chọn ngoài đề xuất vẫn phải hiện, kể cả khi danh sách "ảnh khác" đang gập.
  const chosenOther = others.find((c) => c.id === s.decision?.candidate);
  const shown = more ? others : chosenOther ? [chosenOther] : [];
  const choose = (c: ImageCandidate, action: "use" | "reference") =>
    decide({ action, candidate: c.id, ...(action === "use" && caption.trim() ? { caption: caption.trim() } : {}) });
  const status = s.decision ? DECISION_LABEL[s.decision.action] : "Chưa quyết · dùng animation";
  return <li className="vs-image-slot">
    <div className="vs-image-slot-head">
      <span className="mono">{s.slot}</span>
      <strong>{cueRange(s.cues)} · {s.subject}{s.era ? ` (${s.era})` : ""}</strong>
      <Tag>{KIND_LABEL[s.kind]}</Tag>
      <span className={`vs-image-status${s.decision ? " is-decided" : ""}`}>{status}</span>
    </div>
    {cueText && <blockquote className="vs-image-cue">{cueText}</blockquote>}
    <p className="vs-image-reason">{s.why}</p>
    {!s.searched && <p className="quiet-label">Chưa tìm ảnh cho chỗ này.</p>}
    {s.searched && s.ranked && !picks.length && <p className="vs-image-none">{s.none || "Không ảnh nào đạt."} Chỗ này sẽ dùng animation.</p>}
    {s.searchErrors.length > 0 && <p className="vs-image-warn">Lỗi khi tìm: {s.searchErrors.join(" · ")}</p>}
    {(picks.length > 0 || shown.length > 0) && <ul className="vs-image-grid">
      {picks.map((p) => <CandidateCard key={p.id} c={byId.get(p.id)!} pick={p} slotKind={s.kind} disabled={disabled}
        chosen={s.decision?.candidate === p.id ? s.decision.action : null} onChoose={(a) => choose(byId.get(p.id)!, a)} />)}
      {shown.map((c) => <CandidateCard key={c.id} c={c} slotKind={s.kind} disabled={disabled}
        chosen={s.decision?.candidate === c.id ? s.decision.action : null} onChoose={(a) => choose(c, a)} />)}
    </ul>}
    <div className="vs-image-slot-foot">
      {others.length > 0 && <Button size="small" type="link" onClick={() => setMore(!more)}>{more ? "Ẩn ảnh khác" : `Xem ${others.length} ảnh khác agent không chọn`}</Button>}
      {s.decision?.action === "use" && <span className="vs-image-caption">
        <Input size="small" placeholder="Chú thích dưới ảnh (tuỳ chọn)" maxLength={60} value={caption} disabled={disabled}
          onChange={(e) => setCaption(e.target.value)} onPressEnter={() => decide({ ...s.decision!, caption: caption.trim() || undefined })} />
        <Button size="small" disabled={disabled || caption.trim() === (s.decision.caption ?? "")} onClick={() => decide({ ...s.decision!, caption: caption.trim() || undefined })}>Lưu</Button>
      </span>}
      <span className="vs-image-slot-tools">
        {s.decision?.action !== "skip" && <Button size="small" disabled={disabled} onClick={() => decide({ action: "skip" })}>{IMAGE_ACTION_LABEL.skip}</Button>}
        {s.decision && <Button size="small" type="text" disabled={disabled} onClick={() => decide(null)}>Bỏ lựa chọn</Button>}
        <Popconfirm title="Tìm lại ảnh cho chỗ này?" description="Ứng viên và lựa chọn hiện tại của chỗ này sẽ bị thay." okText="Tìm lại" cancelText="Thôi" onConfirm={research}>
          <Button size="small" type="text" icon={<RedoOutlined />} disabled={disabled}>Tìm lại</Button>
        </Popconfirm>
      </span>
    </div>
    {s.rejected.length > 0 && <details className="vs-image-rejected">
      <summary>{s.rejected.length} ảnh agent loại</summary>
      <ul>{s.rejected.map((r) => <li key={r.id}><span className="mono">{byId.get(r.id)?.title || r.id}</span> — {r.reason}</li>)}</ul>
    </details>}
  </li>;
}

/**
 * Panel "Ảnh đề xuất" (năng lực `images`): chạy song song với bước Giọng đọc, không chặn bước nào. Người dựng
 * xem từng chỗ agent đề xuất và chọn — chỗ chưa quyết coi như dùng animation.
 */
export function ImagesPanel({ detail, act, refresh }: { detail: VideoDetail; act: Act; refresh?: () => Promise<void> }) {
  const view: ImagesView | null = detail.images;
  const id = detail.state.id;
  const running = view?.job?.status === "running";
  // Chọn ảnh là một lần tải ảnh gốc (vài giây): khoá panel trong lúc đó để không bấm chồng hai lựa chọn.
  const [pending, setPending] = useState(false);
  const call = async (fn: () => Promise<unknown>) => {
    setPending(true);
    try { await act(fn); } finally { setPending(false); }
  };
  // Job ảnh chạy dưới khoá riêng, nên trang không nhận luồng nhật ký của nó — hỏi lại máy chủ trong lúc chạy.
  useEffect(() => {
    if (!running || !refresh) return;
    const timer = setInterval(() => { void refresh(); }, 3000);
    return () => clearInterval(timer);
  }, [running, refresh]);
  if (!view) return null;
  const readonly = !detail.managed;
  const cuesApproved = detail.state.stages.cues === "done";
  const disabled = readonly || running || pending;
  const cueText = (s: ImageSlot) => (detail.cues?.cues ?? []).filter((c) => s.cues.includes(c.n)).map((c) => c.text).join(" ");
  const run = (slots?: string[]) => call(() => post(`/api/videos/${id}/images`, { action: "run", ...(slots ? { slots } : {}) }));
  const decide = (slot: string, decision: ImageDecision | null) => call(() => post(`/api/videos/${id}/images`, { action: "decide", slot, decision }));
  const decided = view.slots.filter((s) => s.decision && s.decision.action !== "skip").length;
  const started = view.slots.length > 0 || view.status !== "idle";

  return <section className={`vs-images${running ? " is-running" : ""}`} data-tour="studio.images" aria-label="Ảnh đề xuất">
    <div className="vs-images-head">
      <PictureOutlined />
      <h3>Ảnh đề xuất</h3>
      {running ? <Tag color="processing" icon={<LoadingOutlined spin />}>{view.phase ? `Đang ${view.phase}` : "Đang chạy"}</Tag>
        : view.status === "review" ? <Tag>{view.slots.length ? `${view.slots.length} chỗ · ${decided} đã chọn ảnh` : "không có chỗ nào"}</Tag>
        : view.status === "error" ? <Tag color="error">Dừng vì lỗi</Tag> : null}
      <span className="vs-images-tools">
        {running && <Button size="small" icon={<StopOutlined />} disabled={readonly} onClick={() => act(() => post(`/api/videos/${id}/images`, { action: "stop" }))}>Dừng</Button>}
        {!running && cuesApproved && !started && <Button size="small" type="primary" icon={<PlayCircleFilled />} disabled={readonly || pending} onClick={() => run()}>Đề xuất ảnh</Button>}
        {!running && cuesApproved && started && <Popconfirm title="Chạy lại đề xuất từ đầu?" description="Chọn lại chỗ, tìm lại ảnh — mọi lựa chọn hiện tại bị bỏ." okText="Chạy lại" cancelText="Thôi" onConfirm={() => run()}>
          <Button size="small" icon={<RedoOutlined />} disabled={readonly || pending}>Chạy lại từ đầu</Button>
        </Popconfirm>}
      </span>
    </div>
    <p className="vs-images-lede">
      Vài câu mà ảnh thật (người, sự kiện, hiện vật, hình kinh điển) giúp người xem nhận ra hơn animation. Ảnh chỉ lấy
      từ nguồn có giấy phép dùng thương mại; bạn quyết định dùng hay không — chỗ chưa chọn sẽ dùng animation.
    </p>
    {!cuesApproved && <p className="quiet-label">Chạy tự động khi Lời &amp; cue được duyệt.</p>}
    {running && view.job?.progress?.message && <p className="quiet-label">{view.job.progress.message}</p>}
    {view.status === "error" && view.error && <ProductionState className="vs-production-state" status="error" title="Đề xuất ảnh chưa xong" detail={view.error} />}
    {view.stale && <p className="vs-image-warn"><WarningOutlined /> Lời đọc đã đổi sau khi chọn chỗ — nên chạy lại từ đầu.</p>}
    {view.status === "review" && !view.slots.length && <p className="quiet-label">Agent không thấy câu nào cần ảnh thật — video dùng animation hoàn toàn.</p>}
    {view.slots.length > 0 && <ul className="vs-image-slots">
      {view.slots.map((s) => <SlotCard key={`${s.slot}-${s.decision?.caption ?? ""}`} s={s} cueText={cueText(s)} disabled={disabled}
        decide={(d) => decide(s.slot, d)} research={() => run([s.slot])} />)}
    </ul>}
    <AgentLog logs={view.logs} open={running} />
  </section>;
}
