"use client";

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { AppstoreOutlined, CaretRightFilled, CheckCircleFilled, CopyOutlined, FileTextOutlined, FolderOpenOutlined, InboxOutlined, LoadingOutlined, MessageOutlined, PlayCircleFilled, QuestionOutlined, SmileOutlined, TeamOutlined, WarningFilled } from "@ant-design/icons";
import { Button, Checkbox, Collapse, Descriptions, Form, Input, Modal, Select, Tooltip, Upload } from "antd";
import type { InputRef, UploadProps } from "antd";
import { api } from "@/lib/client";
import { inferDay } from "@/lib/day";
import type { AgentProvider, Scope, StyleDef, VideoRequest, VideoState, VideoSummary } from "@/lib/types";
import { AgentName } from "./agent-mark";
import { SourcePickerField } from "./source-picker";
import { BASE_TEMPLATE_PATH, moduleNamesFrom, type ModuleInfo } from "@/lib/modules";
import { StylePicker, StyleShowcase } from "./style-showcase";

const DAYS = Array.from({ length: 30 }, (_, i) => `Day${String(i + 1).padStart(2, "0")}`);
const SCOPE_LABELS: [keyof Scope, string][] = [["voice", "Giọng đọc"], ["render", "Render MP4"], ["transcript", "Transcript"], ["chapters", "File chương"]];
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
  agentProvider: AgentProvider;
  request: VideoRequest;
  script: { name: string; content: string } | null;
}

// No default day: a fixed one once sent a Ngày 1 video into Day02/. The script fills it in (lib/day.ts).
export const emptyDraft = (style: string, agentProvider: AgentProvider = "claude"): PlanDraft => ({
  id: "",
  agentProvider,
  request: { style, modules: [], day: "", title: "", scriptName: "", feedbackDir: "", oldVideoDir: "", notes: "", scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true } },
  script: null,
});

/** The prompt a member can paste into Claude Code (or Claude Design) instead of pressing Tạo video. */
export function buildPrompt(draft: PlanDraft, style?: StyleDef, modules: ModuleInfo[] = []) {
  const r = draft.request;
  const id = draft.id || "<mã-video>";
  const scope = [r.scope.scenes && "dựng cảnh + QA", r.scope.voice && "giọng đọc", r.scope.render && "render MP4", r.scope.transcript && "transcript", r.scope.chapters && "file chương"].filter(Boolean).join(", ");
  const showcase = style ? [...(style.base?.showcase || []), ...style.showcase].map((s) => s.component).join(", ") : "";
  return [
    `Dựng video ${id} (${r.day || "<ngày>"}) theo style ${style?.name || r.style} (styles/${r.style}.json).`,
    `Dùng skill make-video (.claude/skills/make-video/SKILL.md), thứ tự: cues → giọng → cảnh → render → bàn giao.`,
    `Kịch bản: ${draft.script ? `projects/${id}/kich-ban-goc.md (chép từ ${draft.script.name})` : "<đường dẫn kịch bản>"}.`,
    r.title && `Tên video: ${r.title}.`,
    r.feedbackDir && `Feedback so với bản cũ: ${r.feedbackDir}`,
    r.oldVideoDir && `Video cũ: ${r.oldVideoDir}`,
    showcase && `Component tiêu biểu của style: ${showcase}. Dùng khi nội dung phù hợp.`,
    `Kịch bản theo ${BASE_TEMPLATE_PATH}.`,
    ...r.modules.map((id) => {
      const m = modules.find((x) => x.id === id);
      return m ? `${m.name}: đọc thêm ${m.template} (chỉ ghi phần thêm so với mẫu cơ bản).` : "";
    }),
    ...(style?.rules || []).map((rule) => `- ${rule}`),
    `Làm đủ: ${scope}.`,
    r.notes.trim() && `Ghi chú: ${r.notes.trim()}`,
  ].filter(Boolean).join("\n");
}

/** "Bật cái này thì video trông thế nào?" — a question a checkbox cannot answer, so show the sample. */
function ModulePreview({ module: m }: { module: ModuleInfo }) {
  const [open, setOpen] = useState(false);
  if (!m.preview) return null;
  const label = `Xem thử video mẫu · ${m.name}`;
  return <>
    <Tooltip title={label}>
      <button
        type="button"
        className="vs-module-play"
        aria-label={label}
        onClick={() => setOpen(true)}
      >
        <CaretRightFilled /><span>Xem video mẫu</span>
      </button>
    </Tooltip>
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      width={900}
      destroyOnHidden
      title={`Video mẫu · ${m.name}`}
    >
      <video className="video-player" src={m.preview.url} controls autoPlay preload="metadata" />
    </Modal>
  </>;
}

function ModuleGlyph({ icon }: { icon: ModuleInfo["icon"] }) {
  // A capability added as a template file may name an icon the form has no glyph for; it gets the generic one.
  const glyph = icon === "dialogue" ? <MessageOutlined /> : icon === "quiz" ? <QuestionOutlined /> : icon === "mascot" ? <SmileOutlined /> : <AppstoreOutlined />;
  return <span className="vs-module-glyph" aria-hidden="true">{glyph}</span>;
}

/** The capability catalog: one card per templates/modules/<id>.md, served by /api/modules. */
function useModules() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  useEffect(() => {
    let alive = true;
    void api<ModuleInfo[]>("/api/modules").then((list) => { if (alive) setModules(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return modules;
}

export function PlanForm({ styles, draft, setDraft, onCreate, busy, loading, unavailable }: { styles: StyleDef[]; draft: PlanDraft; setDraft: Dispatch<SetStateAction<PlanDraft>>; onCreate: () => void; busy: boolean; loading: boolean; unavailable: boolean }) {
  const modules = useModules();
  const style = styles.find((s) => s.id === draft.request.style);
  const formRef = useRef<HTMLDivElement>(null);
  const idInput = useRef<InputRef>(null);
  const idCheckRun = useRef(0);
  // Once the member picks a day by hand, a later script only warns about a mismatch instead of overriding it.
  const dayPicked = useRef(false);
  const [copied, setCopied] = useState(false);
  const [touched, setTouched] = useState({ id: false, day: false, script: false });
  const [scriptIssue, setScriptIssue] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<{ value: string; taken: boolean } | null>(null);
  const [checkingId, setCheckingId] = useState(false);
  const [validating, setValidating] = useState(false);
  const styleLabelId = useId();
  const idErrorId = useId();
  const dayMessageId = useId();
  const scriptLabelId = useId();
  const scriptErrorId = useId();
  const prompt = useMemo(() => buildPrompt(draft, style, modules), [draft, style, modules]);
  const set = (patch: Partial<VideoRequest>) => setDraft((current) => ({ ...current, request: { ...current.request, ...patch } }));
  const setModule = (id: string, checked: boolean) => setDraft((current) => ({
    ...current,
    request: {
      ...current.request,
      modules: checked
        ? [...new Set([...current.request.modules, id])]
        : current.request.modules.filter((moduleId) => moduleId !== id),
    },
  }));
  const formatError = videoIdError(draft.id);
  const duplicateError = idCheck?.value === draft.id && idCheck.taken ? `Đã có video “${draft.id}”. Chọn một mã khác.` : null;
  const shownIdError = touched.id ? formatError || duplicateError : null;
  const requiredDayError = !draft.request.day ? "Chọn ngày của bài học (Day01, Day02…)." : null;
  const shownDayError = touched.day ? requiredDayError : null;
  const scriptDay = useMemo(() => draft.script ? inferDay(draft.script.name, draft.script.content) : null, [draft.script]);
  // Not an error — the member may know better than the script — but the folders it lands in must be said out loud.
  const dayMismatch = scriptDay && draft.request.day && scriptDay !== draft.request.day
    ? `Kịch bản ghi ${scriptDay.replace("Day", "Ngày ")} nhưng đang chọn ${draft.request.day} — transcript và file chương sẽ nằm trong ${draft.request.day}/.`
    : null;
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
    setDraft((current) => {
      const day = dayPicked.current ? current.request.day : inferDay(file.name, content) ?? current.request.day;
      return { ...current, script: { name: file.name, content }, request: { ...current.request, scriptName: file.name, day } };
    });
  }

  async function submit() {
    setTouched({ id: true, day: true, script: true });
    if (formatError || duplicateError || requiredDayError || requiredScriptError || formRef.current?.querySelector("[aria-invalid='true'], [data-validation-invalid='true'], [data-validation-pending='true']")) {
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

  const hasVisibleError = !!shownIdError || !!shownDayError || !!shownScriptError;
  const missing = [!VIDEO_ID_RE.test(draft.id) && "mã video", !draft.request.day && "ngày", !draft.script && "kịch bản"].filter(Boolean);
  const complete = missing.length === 0 && !duplicateError;
  const footerHint = loading
    ? "Đang tải style và cấu hình agent…"
    : unavailable
      ? "Cấu hình chưa sẵn sàng. Dùng nút Thử lại ở thông báo phía trên."
      : validating
        ? "Đang kiểm tra mã video…"
        : hasVisibleError
          ? "Sửa các trường được đánh dấu ở trên."
          : complete
            ? "Sẽ tạo project và chạy agent Lời & cue."
            : `Thêm ${missing.join(", ")} để tiếp tục.`;
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
  return <div ref={formRef}><Form className="vs-plan-form" layout="vertical" requiredMark={false} aria-busy={loading} onFinish={() => { void submit(); }}>
    <div className="vs-section">
      <Form.Item className="vs-style-form-item" data-tour="plan.style" label={<span id={styleLabelId} className="vs-section-title">Style hình ảnh<RequiredMark /></span>}>
        {loading
          ? <div className="vs-inline-state" role="status"><LoadingOutlined spin /><span>Đang tải style và cấu hình agent…</span></div>
          : unavailable
            ? <div className="vs-inline-state is-error" role="status"><WarningFilled /><span>Chưa thể tải cấu hình Studio.</span></div>
            : <StylePicker styles={styles} value={draft.request.style} onChange={(s) => set({ style: s })} disabled={busy} labelledBy={styleLabelId} />}
      </Form.Item>
      {style && <StyleShowcase style={style} collapsible />}
      <section className="vs-capabilities" data-tour="plan.modules" aria-labelledby="vs-capabilities-title">
        <div className="vs-capabilities-head">
          <h3 id="vs-capabilities-title" className="vs-section-title">Tính năng nội dung</h3>
          <p>Có thể chọn nhiều. Mỗi tính năng mở đúng phần cấu hình liên quan.</p>
        </div>
        <div className="vs-modules">
          {modules.map((m) => {
            const checked = draft.request.modules.includes(m.id);
            return <article key={m.id} className={`vs-module ${checked ? "is-on" : ""} ${busy ? "is-disabled" : ""}`}>
            <Checkbox
              className="vs-module-toggle"
              checked={checked}
              disabled={busy}
              onChange={(e) => setModule(m.id, e.target.checked)}
            >
              <span className="vs-module-identity">
                <ModuleGlyph icon={m.icon} />
                <span className="vs-module-copy">
                  <strong>{m.name}</strong>
                  <small>{m.summary}{m.template ? <> Dùng <code>{m.template}</code>.</> : null}</small>
                  {checked && <span className="vs-module-status">Đã bật</span>}
                </span>
              </span>
            </Checkbox>
            <ModulePreview module={m} />
            {/* A new tab, so the half-filled plan survives the look. */}
            {m.id === "dialogue" && <a className="vs-module-play" href="/library/characters" target="_blank" rel="noreferrer">
              <TeamOutlined /><span>Xem các nhân vật hiện có</span>
            </a>}
            {m.id === "mascot" && <a className="vs-module-play" href="/library/mascot" target="_blank" rel="noreferrer">
              <SmileOutlined /><span>Xem dáng và biểu cảm của Griffin</span>
            </a>}
          </article>;
          })}
        </div>
      </section>
    </div>
    <div className="vs-section">
      <h3 className="vs-section-title">Nội dung video</h3>
      <div className="field-grid vs-grid-3">
        <Form.Item className="field" data-tour="plan.id" label={<span className="vs-field-label">Mã video<RequiredMark /></span>} validateStatus={shownIdError ? "error" : checkingId ? "validating" : touched.id && idCheck?.value === draft.id ? "success" : undefined} help={(shownIdError || checkingId || (touched.id && idCheck?.value === draft.id && !idCheck.taken)) ? <span id={idErrorId} className={`vs-validation-message ${shownIdError ? "is-error" : checkingId ? "is-checking" : "is-ok"}`} role={shownIdError ? "alert" : "status"}>{shownIdError ? <WarningFilled /> : checkingId ? <LoadingOutlined spin /> : <CheckCircleFilled />}{shownIdError || (checkingId ? "Đang kiểm tra mã…" : "Mã này có thể sử dụng.")}</span> : undefined}>
          <Input ref={idInput} status={shownIdError ? "error" : undefined} aria-invalid={!!shownIdError || undefined} aria-describedby={shownIdError || checkingId ? idErrorId : undefined} value={draft.id} disabled={busy} maxLength={61} onBlur={() => { setTouched((current) => ({ ...current, id: true })); void checkVideoId(draft.id); }} onChange={(e) => { setIdCheck(null); setDraft((current) => ({ ...current, id: e.target.value })); }} placeholder="d2-01-lab-v3" spellCheck={false} autoComplete="off" />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Ngày<RequiredMark /></span>} validateStatus={shownDayError ? "error" : dayMismatch ? "warning" : undefined} help={shownDayError || dayMismatch ? <span id={dayMessageId} className={`vs-validation-message ${shownDayError ? "is-error" : "is-warn"}`} role={shownDayError ? "alert" : "status"}><WarningFilled />{shownDayError || dayMismatch}</span> : undefined}>
          <Select value={draft.request.day || undefined} placeholder="Day01, Day02…" status={shownDayError ? "error" : dayMismatch ? "warning" : undefined} aria-invalid={!!shownDayError || undefined} aria-describedby={shownDayError || dayMismatch ? dayMessageId : undefined} disabled={busy} onBlur={() => setTouched((current) => ({ ...current, day: true }))} onChange={(day) => { dayPicked.current = true; setTouched((current) => ({ ...current, day: true })); set({ day }); }} options={DAYS.map((day) => ({ value: day, label: day }))} />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Tên video</span>}>
          <Input value={draft.request.title} disabled={busy} maxLength={200} onChange={(e) => set({ title: e.target.value })} />
        </Form.Item>
      </div>
      <Form.Item className="field vs-script-field" data-tour="plan.script" label={<span id={scriptLabelId} className="vs-field-label">Kịch bản<RequiredMark /></span>} validateStatus={shownScriptError ? "error" : undefined} help={shownScriptError ? <span id={scriptErrorId} className="vs-validation-message is-error" role="alert"><WarningFilled />{shownScriptError}</span> : undefined}>
        {draft.script
          ? <div className="vs-file"><FileTextOutlined /><span><strong>{draft.script.name}</strong><small>{draft.script.content.length.toLocaleString("vi-VN")} ký tự · {draft.script.content.split("\n")[0].slice(0, 90)}</small></span><Upload {...uploadProps}><Button type="link" disabled={busy}>Đổi tệp</Button></Upload></div>
          : <Upload.Dragger {...uploadProps} className={`vs-drop ${shownScriptError ? "is-invalid" : ""}`}>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Thả tệp .md / .txt vào đây</p>
              <p className="ant-upload-hint">Tối đa 300 KB. Nội dung tệp phải khác rỗng.</p>
              <Button disabled={busy} data-validation-invalid={!!shownScriptError || undefined} aria-describedby={shownScriptError ? scriptErrorId : undefined} onBlur={() => setTouched((current) => ({ ...current, script: true }))}>Chọn tệp</Button>
            </Upload.Dragger>}
      </Form.Item>
      <Collapse className="vs-optional-sources" items={[{
        key: "sources",
        label: <span className="vs-collapse-label"><strong><FolderOpenOutlined /> Nguồn tham chiếu</strong><small>Feedback, video cũ và ghi chú · tuỳ chọn</small></span>,
        children: <>
          <div className="field-grid">
            <SourcePickerField label="Feedback bản cũ" purpose="feedback" value={draft.request.feedbackDir} disabled={busy} onChange={(v) => set({ feedbackDir: v })} />
            <SourcePickerField label="Video cũ" purpose="video" value={draft.request.oldVideoDir} disabled={busy} onChange={(v) => set({ oldVideoDir: v })} />
          </div>
          <Form.Item className="field vs-counted-textarea" label={<span className="vs-field-label">Ghi chú</span>}>
            <Input.TextArea rows={3} value={draft.request.notes} disabled={busy} maxLength={5000} showCount onChange={(e) => set({ notes: e.target.value })} />
          </Form.Item>
        </>,
      }]} />
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
      <Button type="primary" htmlType="submit" data-tour="plan.submit" loading={loading || (busy && !unavailable) || validating} disabled={busy || validating} icon={!busy && !validating ? <PlayCircleFilled /> : undefined}>{loading ? "Đang tải cấu hình…" : unavailable ? "Chưa thể tạo video" : busy ? "Đang tạo video…" : validating ? "Đang kiểm tra…" : "Tạo video và chạy agent"}</Button>
    </div>
  </Form></div>;
}

/** Read-only plan of a video that already exists. */
export function PlanSummary({ state, styles }: { state: VideoState; styles: StyleDef[] }) {
  const r = state.request;
  const modules = useModules();
  const style = styles.find((s) => s.id === r.style);
  return <div className="vs-section">
    <Descriptions className="vs-facts" bordered column={1} size="small" items={[
      { key: "agent", label: "Agent", children: <AgentName provider={state.agent.provider} /> },
      { key: "style", label: "Style", children: style?.name || r.style },
      { key: "day", label: "Ngày", children: r.day || "—" },
      { key: "script", label: "Kịch bản", children: `projects/${state.id}/kich-ban-goc.md${r.scriptName ? ` (${r.scriptName})` : ""}` },
      { key: "feedback", label: "Feedback bản cũ", children: r.feedbackDir || "—" },
      { key: "video", label: "Video cũ", children: r.oldVideoDir || "—" },
      { key: "modules", label: "Tính năng nội dung", children: r.modules.length ? moduleNamesFrom(modules, r.modules).join(", ") : "—" },
      { key: "notes", label: "Ghi chú", children: r.notes || "—" },
    ]} />
    {style && <StyleShowcase style={style} />}
  </div>;
}
