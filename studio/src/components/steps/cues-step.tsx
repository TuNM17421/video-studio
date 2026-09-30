"use client";

import { useRef, useState } from "react";
import { CheckCircleFilled, EditOutlined, PlayCircleFilled } from "@ant-design/icons";
import { Alert, Button, Empty, Input } from "antd";
import { formatFrames } from "@/lib/client";
import { cueEditBlocked, editNotice } from "@/lib/cue-edit";
import type { Cue, CueEditField, CueEditResult, VideoDetail } from "@/lib/types";
import { AgentLog, AgentSummary, FeedbackBox, JobProgress, stageLogs } from "../agent-panel";
import { HarnessPanel } from "../harness-panel";
import { ProductionState } from "../production-state";
import { post, StepBar, type StepProps } from "./shared";

type CueChanges = Partial<Record<CueEditField, string>>;

/** What goes into cues.js is one line without stray spaces (tools/lib/cue-edit.mjs cleans it the same way). */
const clean = (value: string) => value.replace(/\s*\r?\n\s*/g, " ").trim();

/**
 * One câu opened for editing in place: the narration, the on-screen title and the visual intent. Only what
 * changed is sent. A spoken câu cannot lose its narration here — removing a câu is a script change for the agent.
 */
function CueEditor({ cue, onSave, onCancel }: { cue: Cue; onSave: (changes: CueChanges) => Promise<boolean>; onCancel: () => void }) {
  const [draft, setDraft] = useState({ text: cue.text, title: cue.title, visual: cue.visual });
  const [saving, setSaving] = useState(false);
  const changes = (Object.keys(draft) as CueEditField[]).reduce<CueChanges>((out, field) => {
    if (clean(draft[field]) !== clean(cue[field])) out[field] = draft[field];
    return out;
  }, {});
  const changed = Object.keys(changes).length > 0;
  const emptyText = !cue.silent && !clean(draft.text);
  const set = (field: CueEditField) => (event: { target: { value: string } }) => setDraft((current) => ({ ...current, [field]: event.target.value }));
  async function save() {
    setSaving(true);
    try { await onSave(changes); } finally { setSaving(false); }
  }
  return <form
    className="vs-cue-edit"
    aria-label={`Sửa câu ${cue.n}`}
    onSubmit={(event) => { event.preventDefault(); if (changed && !emptyText && !saving) void save(); }}
    onKeyDown={(event) => { if (event.key === "Escape" && !saving) { event.preventDefault(); onCancel(); } }}
  >
    {!cue.silent && <label className="field">Lời đọc
      <Input.TextArea autoFocus autoSize={{ minRows: 2, maxRows: 6 }} value={draft.text} onChange={set("text")} status={emptyText ? "error" : undefined} disabled={saving} />
    </label>}
    <label className="field">Chữ trên màn hình
      <Input autoFocus={cue.silent} value={draft.title} onChange={set("title")} disabled={saving} />
    </label>
    <label className="field">Ý đồ hình
      <Input.TextArea autoSize={{ minRows: 1, maxRows: 4 }} value={draft.visual} onChange={set("visual")} disabled={saving} />
    </label>
    <p className="vs-cue-edit-hint" role={emptyText ? "alert" : undefined}>
      {emptyText ? "Lời đọc không được để trống — muốn bỏ câu này thì góp ý cho agent."
        : "Lưu xong Studio kiểm tra lại bằng TTS dry-run (miễn phí). Đổi lời đọc thì dòng Lời trong kịch bản gốc cũng đổi theo."}
    </p>
    <div className="vs-cue-edit-actions">
      <Button type="primary" htmlType="submit" loading={saving} disabled={!changed || emptyText}>Lưu</Button>
      <Button onClick={onCancel} disabled={saving}>Huỷ</Button>
    </div>
  </form>;
}

function CueList({ detail, editable, onSave }: { detail: VideoDetail; editable: boolean; onSave: (n: number, changes: CueChanges) => Promise<boolean> }) {
  const info = detail.cues;
  const [editing, setEditing] = useState<number | null>(null);
  // After Lưu / Huỷ, focus goes back to the row's own Sửa button rather than to the top of the page.
  const buttons = useRef(new Map<number, HTMLElement>());
  const close = (n: number) => {
    setEditing(null);
    requestAnimationFrame(() => buttons.current.get(n)?.focus());
  };
  if (!info?.cues.length) return null;
  return <div className="scene-list vs-cue-list">{info.cues.map((c, index) => {
    const previousSection = info.cues[index - 1]?.section ?? null;
    const header = c.section !== null && c.section !== previousSection ? info.sections[(c.section ?? 1) - 1] : null;
    // Not tied to `editable`: saving makes the page busy, and closing the editor then would drop what was typed if the save fails.
    const open = editing === c.n;
    return <div key={c.n}>
      {header && <div className="vs-cue-section">Phần {c.section} · {header}</div>}
      {open
        ? <div className="scene-list-item is-selected vs-cue-editing">
            <span className="scene-index">{String(c.n).padStart(2, "0")}</span>
            <CueEditor cue={c} onCancel={() => close(c.n)} onSave={async (changes) => {
              const ok = await onSave(c.n, changes);
              if (ok) close(c.n);
              return ok;
            }} />
          </div>
        : <div className="scene-list-item">
            <span className="scene-index">{String(c.n).padStart(2, "0")}</span>
            <span className="scene-list-copy"><strong>{c.title || (c.silent ? "Khoảng dừng" : "—")}</strong><span className="vs-cue-text">{c.silent ? "(không lời)" : c.text}</span></span>
            <span className="scene-time mono" title="Bắt đầu · độ dài">{formatFrames(c.start)}<br /><span>{formatFrames(c.end - c.start)}</span></span>
            {editable && <Button
              ref={(el) => { if (el) buttons.current.set(c.n, el); else buttons.current.delete(c.n); }}
              type="text"
              size="small"
              className="vs-cue-edit-button"
              icon={<EditOutlined aria-hidden />}
              aria-label={`Sửa câu ${c.n}`}
              title="Sửa trực tiếp câu này (không tốn lượt agent)"
              disabled={editing !== null}
              onClick={() => setEditing(c.n)}
            />}
          </div>}
    </div>;
  })}</div>;
}

export function CuesStep({ detail, logs, job, busy, act, stop, nav }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.cues;
  const voiced = detail.state.stages.voice === "done";
  const runLogs = stageLogs(logs, ["cues"]);
  const count = detail.cues?.cues.length ?? 0;
  const blocking = detail.blocking.cues;
  const runAgent = () => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }));
  const [notice, setNotice] = useState<ReturnType<typeof editNotice> | null>(null);
  const editable = detail.managed && !busy && !cueEditBlocked(detail.state.stages);
  async function saveCue(n: number, changes: CueChanges) {
    let result: CueEditResult | null = null;
    setNotice(null);
    const ok = await act(async () => { result = await post(`/api/videos/${id}/cues`, { n, ...changes }) as CueEditResult; });
    if (ok && result) setNotice(editNotice(result));
    return ok;
  }
  return <>
    <div className="vs-step-body">
      {count > 0 && <div className="vs-step-status"><span className="quiet-label">{count} CÂU · {formatFrames(detail.cues?.duration)} ƯỚC TÍNH</span></div>}
      <JobProgress job={job?.kind === "cues" || job?.kind === "cue-edit" ? job : null} onStop={stop} />
      {status === "idle" && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy" />}
      {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
      <HarnessPanel run={detail.harness.cues} />
      <AgentSummary logs={runLogs} />
      {notice && <Alert className="vs-cue-notice" type={notice.tone} showIcon closable title={notice.text} onClose={() => setNotice(null)} />}
      <CueList detail={detail} editable={editable} onSave={saveCue} />
      {detail.managed && voiced && count > 0 && <p className="vs-cue-edit-hint vs-cue-locked">Đã có giọng đọc theo lời này, nên lời & cue không sửa trực tiếp được nữa — đổi lời thì phải thu lại giọng.</p>}
      {(status === "review" || (status === "done" && !voiced)) && <FeedbackBox disabled={busy} placeholder="Ví dụ: tách câu 12 thành hai câu; đổi tên nhân vật Minh thành Dũng…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "cues", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <StepBar
      nav={nav}
      tone={status}
      status={status === "done" ? "Đã duyệt lời & cue"
        : status === "review" ? (blocking > 0 ? `Còn ${blocking} góp ý chưa xử lý` : `${count} câu chờ duyệt`)
        : status === "running" ? (job?.kind === "cue-edit" ? "Đang kiểm tra câu vừa sửa…" : "Agent đang viết cue…")
        : status === "error" ? "Agent dừng giữa chừng"
        : "Agent chưa chạy"}
    >
      {(status === "idle" || status === "error") && <Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={runAgent}>{status === "error" ? "Chạy lại" : "Chạy agent"}</Button>}
      {status === "review" && <Button type="primary" disabled={busy || blocking > 0} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "cues" }))}>Duyệt lời & cue</Button>}
    </StepBar>
  </>;
}
