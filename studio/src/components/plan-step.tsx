"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle, Copy, FileArrowUp, FileText, FolderSimple, Play, Warning } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import type { Scope, StyleDef, VideoRequest, VideoState } from "@/lib/types";
import { StylePicker, StyleShowcase } from "./style-showcase";

const DAYS = Array.from({ length: 30 }, (_, i) => `Day${String(i + 1).padStart(2, "0")}`);
const SCOPE_LABELS: [keyof Scope, string][] = [["voice", "Giọng ElevenLabs"], ["render", "Render MP4"], ["transcript", "Transcript"], ["chapters", "File chương"]];

export interface PlanDraft {
  id: string;
  request: VideoRequest;
  script: { name: string; content: string } | null;
}

export const emptyDraft = (style: string): PlanDraft => ({
  id: "",
  request: { style, day: "Day02", title: "", scriptName: "", feedbackDir: "", oldVideoDir: "", notes: "", scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true } },
  script: null,
});

/** The prompt a member can paste into Claude Code (or Claude Design) instead of pressing Tạo video. */
export function buildPrompt(draft: PlanDraft, style?: StyleDef) {
  const r = draft.request;
  const id = draft.id || "<mã-video>";
  const scope = [r.scope.scenes && "dựng cảnh + QA", r.scope.voice && "giọng ElevenLabs", r.scope.render && "render MP4", r.scope.transcript && "transcript", r.scope.chapters && "file chương"].filter(Boolean).join(", ");
  const showcase = style ? [...(style.base?.showcase || []), ...style.showcase].map((s) => s.component).join(", ") : "";
  return [
    `Dựng video ${id} (${r.day}) theo style ${style?.name || r.style} (styles/${r.style}.json).`,
    `Dùng skill make-video (.claude/skills/make-video/SKILL.md), thứ tự: cues → giọng → cảnh → render → bàn giao.`,
    `Kịch bản: ${draft.script ? `projects/${id}/kich-ban-goc.md (chép từ ${draft.script.name})` : "<đường dẫn kịch bản>"}.`,
    r.title && `Tên video: ${r.title}.`,
    r.feedbackDir && `Feedback so với bản cũ: ${r.feedbackDir}`,
    r.oldVideoDir && `Video cũ: ${r.oldVideoDir}`,
    showcase && `Component tiêu biểu của style: ${showcase}. Dùng khi nội dung phù hợp.`,
    ...(style?.rules || []).map((rule) => `- ${rule}`),
    `Làm đủ: ${scope}.`,
    r.notes.trim() && `Ghi chú: ${r.notes.trim()}`,
  ].filter(Boolean).join("\n");
}

function FolderField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [check, setCheck] = useState<{ exists: boolean; files?: number } | null>(null);
  useEffect(() => {
    if (!value.trim()) { setCheck(null); return; }
    const t = setTimeout(() => {
      api<{ exists: boolean; files?: number }>(`/api/fs-check?path=${encodeURIComponent(value.trim())}`).then(setCheck).catch(() => setCheck(null));
    }, 300);
    return () => clearTimeout(t);
  }, [value]);
  return <label className="field">{label} <span className="vs-optional">tùy chọn</span>
    <input value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} placeholder="/home/…/thư-mục" spellCheck={false} autoComplete="off" />
    {check && <span className={`field-hint vs-check ${check.exists ? "is-ok" : "is-bad"}`}>{check.exists ? <><CheckCircle size={13} />{check.files} tệp</> : <><Warning size={13} />Không tìm thấy thư mục</>}</span>}
  </label>;
}

export function PlanForm({ styles, draft, setDraft, onCreate, busy }: { styles: StyleDef[]; draft: PlanDraft; setDraft: (d: PlanDraft) => void; onCreate: () => void; busy: boolean }) {
  const style = styles.find((s) => s.id === draft.request.style);
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const prompt = useMemo(() => buildPrompt(draft, style), [draft, style]);
  const set = (patch: Partial<VideoRequest>) => setDraft({ ...draft, request: { ...draft.request, ...patch } });
  async function readFile(file?: File) {
    if (!file) return;
    if (file.size > 300_000) return alert("Kịch bản quá lớn (tối đa 300 KB).");
    setDraft({ ...draft, script: { name: file.name, content: await file.text() }, request: { ...draft.request, scriptName: file.name } });
  }
  const ready = /^[a-z0-9][a-z0-9-]{1,60}$/.test(draft.id) && !!draft.script;
  return <>
    <input ref={fileInput} type="file" accept=".md,.txt,text/markdown,text/plain" hidden onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} />
    <div className="vs-section">
      <h3 className="vs-section-title">Style</h3>
      <StylePicker styles={styles} value={draft.request.style} onChange={(s) => set({ style: s })} disabled={busy} />
      {style && <StyleShowcase style={style} />}
    </div>
    <div className="vs-section">
      <h3 className="vs-section-title">Nội dung video</h3>
      <div className="field-grid vs-grid-3">
        <label className="field">Mã video<input value={draft.id} disabled={busy} onChange={(e) => setDraft({ ...draft, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="d2-01-lab-v3" spellCheck={false} autoComplete="off" /></label>
        <label className="field">Ngày<select value={draft.request.day} disabled={busy} onChange={(e) => set({ day: e.target.value })}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select></label>
        <label className="field">Tên video <span className="vs-optional">tùy chọn</span><input value={draft.request.title} disabled={busy} maxLength={200} onChange={(e) => set({ title: e.target.value })} /></label>
      </div>
      <div className="field">Kịch bản
        {draft.script
          ? <div className="vs-file"><FileText size={20} /><span><strong>{draft.script.name}</strong><small>{draft.script.content.length.toLocaleString("vi-VN")} ký tự · {draft.script.content.split("\n")[0].slice(0, 90)}</small></span><button className="text-button" disabled={busy} onClick={() => fileInput.current?.click()}>Đổi tệp</button></div>
          : <div className={`vs-drop ${dragging ? "is-dragging" : ""}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(e) => { e.preventDefault(); setDragging(false); void readFile(e.dataTransfer.files[0]); }}>
              <FileArrowUp size={26} weight="light" /><span>Thả tệp .md / .txt vào đây</span>
              <button className="button button-secondary compact" disabled={busy} onClick={() => fileInput.current?.click()}>Chọn tệp</button>
            </div>}
      </div>
      <div className="field-grid">
        <FolderField label="Feedback bản cũ" value={draft.request.feedbackDir} disabled={busy} onChange={(v) => set({ feedbackDir: v })} />
        <FolderField label="Video cũ" value={draft.request.oldVideoDir} disabled={busy} onChange={(v) => set({ oldVideoDir: v })} />
      </div>
      <label className="field">Ghi chú <span className="vs-optional">tùy chọn</span><textarea rows={3} value={draft.request.notes} disabled={busy} maxLength={5000} onChange={(e) => set({ notes: e.target.value })} /></label>
      <fieldset className="vs-scope" disabled={busy}><legend>Phạm vi</legend>
        <label className="vs-check-option is-locked"><input type="checkbox" checked readOnly disabled />Dựng cảnh + QA</label>
        {SCOPE_LABELS.map(([key, label]) => <label key={key} className="vs-check-option"><input type="checkbox" checked={draft.request.scope[key]} onChange={(e) => set({ scope: { ...draft.request.scope, [key]: e.target.checked } })} />{label}</label>)}
      </fieldset>
      <details className="vs-prompt"><summary><FolderSimple size={15} />Prompt</summary>
        <pre>{prompt}</pre>
        <button className="button button-secondary compact" onClick={async () => { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={15} />{copied ? "Đã copy" : "Copy prompt"}</button>
      </details>
    </div>
    <div className="panel-footer">
      <span className="field-hint">{ready ? "" : "Cần mã video và kịch bản."}</span>
      <button className="button button-primary" disabled={!ready || busy} onClick={onCreate}><Play size={17} weight="fill" />Tạo video</button>
    </div>
  </>;
}

/** Read-only plan of a video that already exists. */
export function PlanSummary({ state, styles }: { state: VideoState; styles: StyleDef[] }) {
  const r = state.request;
  const style = styles.find((s) => s.id === r.style);
  return <div className="vs-section">
    <dl className="vs-facts">
      <div><dt>Style</dt><dd>{style?.name || r.style}</dd></div>
      <div><dt>Ngày</dt><dd>{r.day || "—"}</dd></div>
      <div><dt>Kịch bản</dt><dd>projects/{state.id}/kich-ban-goc.md{r.scriptName ? ` (${r.scriptName})` : ""}</dd></div>
      <div><dt>Feedback bản cũ</dt><dd>{r.feedbackDir || "—"}</dd></div>
      <div><dt>Video cũ</dt><dd>{r.oldVideoDir || "—"}</dd></div>
      <div><dt>Ghi chú</dt><dd>{r.notes || "—"}</dd></div>
    </dl>
    {style && <StyleShowcase style={style} />}
  </div>;
}
