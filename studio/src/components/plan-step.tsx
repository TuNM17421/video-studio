"use client";

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircleFilled, CopyOutlined, FileTextOutlined, FolderOpenOutlined, InboxOutlined, LoadingOutlined, PlayCircleFilled, WarningFilled } from "@ant-design/icons";
import { Button, Checkbox, Collapse, Descriptions, Form, Input, Select, Upload } from "antd";
import type { InputRef, UploadProps } from "antd";
import { api } from "@/lib/client";
import type { Scope, StyleDef, VideoRequest, VideoState, VideoSummary } from "@/lib/types";
import { StylePicker, StyleShowcase } from "./style-showcase";

const DAYS = Array.from({ length: 30 }, (_, i) => `Day${String(i + 1).padStart(2, "0")}`);
const SCOPE_LABELS: [keyof Scope, string][] = [["voice", "Giọng ElevenLabs"], ["render", "Render MP4"], ["transcript", "Transcript"], ["chapters", "File chương"]];
const VIDEO_ID_RE = /^[a-z0-9][a-z0-9-]{1,60}$/;

function RequiredMark() {
  return <><span className="vs-required" aria-hidden="true">*</span><span className="sr-only"> (bắt buộc)</span></>;
}

function videoIdError(value: string) {
  if (!value.trim()) return "Nhập mã video gồm 2–61 ký tự.";
  if (value.length < 2) return "Mã video cần ít nhất 2 ký tự.";
  if (value.length > 61) return "Mã video không được dài quá 61 ký tự.";
  if (!/^[a-z0-9-]+$/.test(value)) return "Chỉ dùng chữ thường không dấu, số và dấu gạch ngang.";
  if (!/^[a-z0-9]/.test(value)) return "Mã video phải bắt đầu bằng chữ thường hoặc số.";
  return null;
}

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
  const [checking, setChecking] = useState(false);
  const messageId = useId();
  useEffect(() => {
    if (!value.trim()) return;
    const t = setTimeout(() => {
      api<{ exists: boolean; files?: number }>(`/api/fs-check?path=${encodeURIComponent(value.trim())}`)
        .then((result) => { setCheck(result); setChecking(false); })
        .catch(() => { setCheck(null); setChecking(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [value]);
  const invalid = !!value.trim() && check?.exists === false;
  const hasMessage = !!value.trim() && (checking || check);
  const help = hasMessage ? <span id={messageId} className={`vs-validation-message ${invalid ? "is-error" : check?.exists ? "is-ok" : "is-checking"}`} role={invalid ? "alert" : "status"}>
    {checking ? <LoadingOutlined spin /> : invalid ? <WarningFilled /> : <CheckCircleFilled />}
    {checking ? "Đang kiểm tra đường dẫn…" : invalid ? "Không tìm thấy thư mục. Kiểm tra lại đường dẫn đầy đủ." : `${check?.files ?? 0} tệp`}
  </span> : undefined;
  return <Form.Item className="field" label={<span className="vs-field-label">{label}</span>} validateStatus={invalid ? "error" : checking ? "validating" : check?.exists ? "success" : undefined} help={help}>
    <Input
      value={value}
      disabled={disabled}
      status={invalid ? "error" : undefined}
      aria-invalid={invalid || undefined}
      aria-describedby={hasMessage ? messageId : undefined}
      data-validation-pending={checking || undefined}
      onChange={(event) => {
        const next = event.target.value;
        setCheck(null);
        setChecking(!!next.trim());
        onChange(next);
      }}
      placeholder="/home/…/thư-mục"
      spellCheck={false}
      autoComplete="off"
    />
  </Form.Item>;
}

export function PlanForm({ styles, draft, setDraft, onCreate, busy }: { styles: StyleDef[]; draft: PlanDraft; setDraft: Dispatch<SetStateAction<PlanDraft>>; onCreate: () => void; busy: boolean }) {
  const style = styles.find((s) => s.id === draft.request.style);
  const formRef = useRef<HTMLDivElement>(null);
  const idInput = useRef<InputRef>(null);
  const idCheckRun = useRef(0);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState({ id: false, script: false });
  const [scriptIssue, setScriptIssue] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<{ value: string; taken: boolean } | null>(null);
  const [checkingId, setCheckingId] = useState(false);
  const [validating, setValidating] = useState(false);
  const styleLabelId = useId();
  const idErrorId = useId();
  const scriptLabelId = useId();
  const scriptErrorId = useId();
  const prompt = useMemo(() => buildPrompt(draft, style), [draft, style]);
  const set = (patch: Partial<VideoRequest>) => setDraft((current) => ({ ...current, request: { ...current.request, ...patch } }));
  const formatError = videoIdError(draft.id);
  const duplicateError = idCheck?.value === draft.id && idCheck.taken ? `Đã có video “${draft.id}”. Chọn một mã khác.` : null;
  const shownIdError = touched.id ? formatError || duplicateError : null;
  const requiredScriptError = !draft.script ? scriptIssue || "Chọn một tệp kịch bản định dạng .md hoặc .txt." : null;
  const shownScriptError = touched.script ? scriptIssue || requiredScriptError : null;

  function focusFirstInvalid() {
    requestAnimationFrame(() => {
      const target = formRef.current?.querySelector<HTMLElement>("[aria-invalid='true'], [data-validation-invalid='true'], [data-validation-pending='true']");
      target?.scrollIntoView({ block: "center" });
      target?.focus({ preventScroll: true });
    });
  }

  async function checkVideoId(value: string) {
    if (videoIdError(value)) return false;
    const run = ++idCheckRun.current;
    setCheckingId(true);
    try {
      const videos = await api<VideoSummary[]>("/api/videos");
      const taken = videos.some((video) => video.id === value);
      if (run === idCheckRun.current) setIdCheck({ value, taken });
      return taken;
    } catch {
      return false;
    } finally {
      if (run === idCheckRun.current) setCheckingId(false);
    }
  }

  async function readFile(file?: File) {
    if (!file) return;
    setTouched((current) => ({ ...current, script: true }));
    if (!/\.(?:md|txt)$/i.test(file.name)) {
      setScriptIssue("Tệp kịch bản phải có định dạng .md hoặc .txt.");
      return;
    }
    if (file.size > 300_000) {
      setScriptIssue("Tệp kịch bản vượt quá 300 KB. Chọn một tệp nhỏ hơn.");
      return;
    }
    const content = await file.text();
    if (!content.trim()) {
      setScriptIssue("Tệp kịch bản đang trống. Thêm nội dung rồi chọn lại tệp.");
      return;
    }
    setScriptIssue(null);
    setDraft((current) => ({ ...current, script: { name: file.name, content }, request: { ...current.request, scriptName: file.name } }));
  }

  async function submit() {
    setTouched({ id: true, script: true });
    if (formatError || duplicateError || requiredScriptError || formRef.current?.querySelector("[aria-invalid='true'], [data-validation-invalid='true'], [data-validation-pending='true']")) {
      focusFirstInvalid();
      return;
    }
    const submittedId = draft.id;
    setValidating(true);
    const taken = idCheck?.value === submittedId ? idCheck.taken : await checkVideoId(submittedId);
    setValidating(false);
    if (idInput.current?.input?.value !== submittedId) return;
    if (taken) {
      focusFirstInvalid();
      return;
    }
    onCreate();
  }

  const hasVisibleError = !!shownIdError || !!shownScriptError;
  const complete = VIDEO_ID_RE.test(draft.id) && !!draft.script && !duplicateError;
  const footerHint = validating ? "Đang kiểm tra mã video…" : hasVisibleError ? "Sửa các trường được đánh dấu ở trên." : complete ? "Sẽ tạo project và chạy agent Lời & cue." : "Điền các trường có dấu * rồi bấm tạo.";
  const uploadProps: UploadProps = {
    accept: ".md,.txt,text/markdown,text/plain",
    disabled: busy,
    maxCount: 1,
    showUploadList: false,
    beforeUpload: (file) => {
      void readFile(file);
      return Upload.LIST_IGNORE;
    },
  };
  return <div ref={formRef}><Form className="vs-plan-form" layout="vertical" requiredMark={false} onFinish={() => { void submit(); }}>
    <div className="vs-section">
      <p className="vs-form-requirements"><span className="vs-required" aria-hidden="true">*</span><span>Trường có dấu sao là bắt buộc.</span></p>
      <Form.Item className="vs-style-form-item" label={<span id={styleLabelId} className="vs-section-title">Style<RequiredMark /></span>}>
        <StylePicker styles={styles} value={draft.request.style} onChange={(s) => set({ style: s })} disabled={busy} labelledBy={styleLabelId} />
      </Form.Item>
      {style && <StyleShowcase style={style} collapsible />}
    </div>
    <div className="vs-section">
      <h3 className="vs-section-title">Nội dung video</h3>
      <div className="field-grid vs-grid-3">
        <Form.Item className="field" label={<span className="vs-field-label">Mã video<RequiredMark /></span>} validateStatus={shownIdError ? "error" : checkingId ? "validating" : touched.id && idCheck?.value === draft.id ? "success" : undefined} help={(shownIdError || checkingId || (touched.id && idCheck?.value === draft.id && !idCheck.taken)) ? <span id={idErrorId} className={`vs-validation-message ${shownIdError ? "is-error" : checkingId ? "is-checking" : "is-ok"}`} role={shownIdError ? "alert" : "status"}>{shownIdError ? <WarningFilled /> : checkingId ? <LoadingOutlined spin /> : <CheckCircleFilled />}{shownIdError || (checkingId ? "Đang kiểm tra mã…" : "Mã này có thể sử dụng.")}</span> : undefined}>
          <Input ref={idInput} status={shownIdError ? "error" : undefined} aria-invalid={!!shownIdError || undefined} aria-describedby={shownIdError || checkingId ? idErrorId : undefined} value={draft.id} disabled={busy} maxLength={61} onBlur={() => { setTouched((current) => ({ ...current, id: true })); void checkVideoId(draft.id); }} onChange={(e) => { setIdCheck(null); setDraft((current) => ({ ...current, id: e.target.value })); }} placeholder="d2-01-lab-v3" spellCheck={false} autoComplete="off" />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Ngày<RequiredMark /></span>}>
          <Select value={draft.request.day} disabled={busy} onChange={(day) => set({ day })} options={DAYS.map((day) => ({ value: day, label: day }))} />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Tên video</span>}>
          <Input value={draft.request.title} disabled={busy} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
        </Form.Item>
      </div>
      <Form.Item className="field vs-script-field" label={<span id={scriptLabelId} className="vs-field-label">Kịch bản<RequiredMark /></span>} validateStatus={shownScriptError ? "error" : undefined} help={shownScriptError ? <span id={scriptErrorId} className="vs-validation-message is-error" role="alert"><WarningFilled />{shownScriptError}</span> : undefined}>
        {draft.script
          ? <div className="vs-file"><FileTextOutlined /><span><strong>{draft.script.name}</strong><small>{draft.script.content.length.toLocaleString("vi-VN")} ký tự · {draft.script.content.split("\n")[0].slice(0, 90)}</small></span><Upload {...uploadProps}><Button type="link" disabled={busy}>Đổi tệp</Button></Upload></div>
          : <Upload.Dragger {...uploadProps} className={`vs-drop ${shownScriptError ? "is-invalid" : ""}`}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Thả tệp .md / .txt vào đây</p>
              <p className="ant-upload-hint">Tối đa 300 KB. Nội dung tệp phải khác rỗng.</p>
              <Button disabled={busy} data-validation-invalid={!!shownScriptError || undefined} aria-describedby={shownScriptError ? scriptErrorId : undefined} onBlur={() => setTouched((current) => ({ ...current, script: true }))}>Chọn tệp</Button>
            </Upload.Dragger>}
      </Form.Item>
      <div className="field-grid">
        <FolderField label="Feedback bản cũ" value={draft.request.feedbackDir} disabled={busy} onChange={(v) => set({ feedbackDir: v })} />
        <FolderField label="Video cũ" value={draft.request.oldVideoDir} disabled={busy} onChange={(v) => set({ oldVideoDir: v })} />
      </div>
      <Form.Item className="field" label={<span className="vs-field-label">Ghi chú</span>}>
        <Input.TextArea rows={3} value={draft.request.notes} disabled={busy} maxLength={5000} showCount onChange={(e) => set({ notes: e.target.value })} />
      </Form.Item>
      <Form.Item className="vs-scope" label="Phạm vi">
        <div className="vs-scope-options">
          <Checkbox checked disabled>Dựng cảnh + QA</Checkbox>
          {SCOPE_LABELS.map(([key, label]) => <Checkbox key={key} checked={draft.request.scope[key]} disabled={busy} onChange={(e) => set({ scope: { ...draft.request.scope, [key]: e.target.checked } })}>{label}</Checkbox>)}
        </div>
      </Form.Item>
      <Collapse className="vs-prompt" items={[{
        key: "prompt",
        label: <span><FolderOpenOutlined /> Prompt</span>,
        children: <><pre>{prompt}</pre><Button icon={<CopyOutlined />} onClick={async () => { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Đã copy" : "Copy prompt"}</Button></>,
      }]} />
    </div>
    <div className="panel-footer">
      <span className="field-hint" aria-live="polite">{footerHint}</span>
      <Button type="primary" htmlType="submit" loading={busy || validating} disabled={busy || validating} icon={!busy && !validating ? <PlayCircleFilled /> : undefined}>{busy ? "Đang tạo video…" : validating ? "Đang kiểm tra…" : "Tạo video và chạy agent"}</Button>
    </div>
  </Form></div>;
}

/** Read-only plan of a video that already exists. */
export function PlanSummary({ state, styles }: { state: VideoState; styles: StyleDef[] }) {
  const r = state.request;
  const style = styles.find((s) => s.id === r.style);
  return <div className="vs-section">
    <Descriptions className="vs-facts" bordered column={1} size="small" items={[
      { key: "style", label: "Style", children: style?.name || r.style },
      { key: "day", label: "Ngày", children: r.day || "—" },
      { key: "script", label: "Kịch bản", children: `projects/${state.id}/kich-ban-goc.md${r.scriptName ? ` (${r.scriptName})` : ""}` },
      { key: "feedback", label: "Feedback bản cũ", children: r.feedbackDir || "—" },
      { key: "video", label: "Video cũ", children: r.oldVideoDir || "—" },
      { key: "notes", label: "Ghi chú", children: r.notes || "—" },
    ]} />
    {style && <StyleShowcase style={style} />}
  </div>;
}
