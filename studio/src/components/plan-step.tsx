"use client";

import { useEffect, useId, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { CaretRightFilled, CheckCircleFilled, FileTextOutlined, FolderOpenOutlined, InboxOutlined, LoadingOutlined, PlayCircleFilled, SmileOutlined, TeamOutlined, WarningFilled } from "@ant-design/icons";
import { Button, Checkbox, Collapse, Descriptions, Form, Input, Modal, Segmented, Select, Upload } from "antd";
import type { InputRef, UploadProps } from "antd";
import { api } from "@/lib/client";
import { inferDay } from "@/lib/day";
import { ITEM_ID_MAX, itemIdFor } from "@/lib/qa-manifest";
import type { AgentProvider, ReviewSettings, SceneBuilder, Scope, StyleDef, VideoFormat, VideoRequest, VideoState, VideoSummary } from "@/lib/types";
import { AGENT_PROVIDER_OPTIONS, agentProviderLabel, isExperimentalProvider } from "@/lib/agent-providers";
import { DEFAULT_REVIEW, describeReviewer, resolveReviewer } from "@/lib/review";
import { AgentName } from "./agent-mark";
import { AgentField } from "./page-agent-binding";
import { SourcePickerField } from "./source-picker";
import { moduleNamesFrom, type ModuleInfo } from "@/lib/modules";
import { StylePicker, StyleSampleButton } from "./style-showcase";

const DAYS = Array.from({ length: 30 }, (_, i) => `Day${String(i + 1).padStart(2, "0")}`);
/**
 * Khổ hình phải chọn ở đây, cùng chỗ với style, vì nó quyết định cách bày cảnh — không phải một tuỳ chọn
 * lúc render. Đổi khổ sau khi đã dựng cảnh thì phải dựng lại, nên bước Kế hoạch là chỗ duy nhất hỏi.
 */
const FORMAT_OPTIONS: { value: VideoFormat; label: string; short: string; hint: string }[] = [
  { value: "16x9", label: "Ngang 16:9 — 1920×1080", short: "Ngang 16:9", hint: "Máy tính, LMS. Cảnh bày theo hàng, trái sang phải." },
  { value: "9x16", label: "Dọc 9:16 — 1080×1920", short: "Dọc 9:16", hint: "Điện thoại. Cảnh bày theo cột, trên xuống dưới; mỗi màn chứa ít khối hơn." },
];

/** Hệ quả của từng chỗ dựng cảnh, nói ngay dưới nút chọn: lựa chọn này đổi cả bước Dựng cảnh. */
const BUILDER_OPTIONS: { value: SceneBuilder; label: string; hint: string }[] = [
  { value: "agent", label: "Agent ở máy", hint: "Agent dựng cảnh ngay trên máy này; Studio build, soát và chụp ảnh QA." },
  { value: "claude-design", label: "Claude Design", hint: "Bước Dựng cảnh sinh brief để bạn dán sang claude.ai/design rồi mang kết quả về render. Agent ở máy không dựng cảnh; các bước khác không đổi." },
];

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
  review: ReviewSettings;
  request: VideoRequest;
  script: { name: string; content: string } | null;
}

// No default day: a fixed one once sent a Ngày 1 video into Day02/. The script fills it in (lib/day.ts).
export const emptyDraft = (style: string, agentProvider: AgentProvider = "claude"): PlanDraft => ({
  id: "",
  agentProvider,
  review: { ...DEFAULT_REVIEW },
  request: { style, format: "16x9", modules: [], day: "", itemId: "", title: "", scriptName: "", feedbackDir: "", oldVideoDir: "", notes: "", sceneBuilder: "agent", scope: { scenes: true, voice: true, render: true, transcript: true, chapters: true } },
  script: null,
});

/**
 * "Bật cái này thì video trông thế nào?" — a question a checkbox cannot answer, so show the sample. The row
 * itself keeps one line of summary; the full sentence, the sample video and the capability's own links
 * (cast, mascot poses) live here, one click away.
 */
function ModuleDetails({ module: m }: { module: ModuleInfo }) {
  const [open, setOpen] = useState(false);
  const title = m.short || m.name;
  return <>
    <button type="button" className="vs-module-play vs-cap-more" aria-label={`${m.preview ? "Xem video mẫu" : "Xem chi tiết"} · ${title}`} onClick={() => setOpen(true)}>
      {m.preview && <CaretRightFilled />}<span>{m.preview ? "Mẫu" : "Chi tiết"}</span>
    </button>
    <Modal open={open} onCancel={() => setOpen(false)} footer={null} width={900} destroyOnHidden title={m.name}>
      <p className="vs-cap-summary">{m.summary}</p>
      {m.preview && <video className="video-player" src={m.preview.url} controls autoPlay preload="metadata" />}
      {/* A new tab, so the half-filled plan survives the look. */}
      <p className="vs-cap-links">
        {m.id === "dialogue" && <a className="vs-module-play" href="/library/characters" target="_blank" rel="noreferrer"><TeamOutlined /><span>Nhân vật hiện có</span></a>}
        {m.id === "mascot" && <a className="vs-module-play" href="/library/mascot" target="_blank" rel="noreferrer"><SmileOutlined /><span>Dáng và biểu cảm</span></a>}
      </p>
    </Modal>
  </>;
}

/** The capability catalog: one card per templates/modules/<id>.md, served by /api/modules. */
export function useModules() {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  useEffect(() => {
    let alive = true;
    void api<ModuleInfo[]>("/api/modules").then((list) => { if (alive) setModules(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return modules;
}

export function PlanForm({ styles, draft, setDraft, onCreate, busy, loading, unavailable, installedAgents, selectionLocked }: { styles: StyleDef[]; draft: PlanDraft; setDraft: Dispatch<SetStateAction<PlanDraft>>; onCreate: () => void; busy: boolean; loading: boolean; unavailable: boolean; installedAgents: AgentProvider[]; /** Cấu hình máy ấn định agent: hiện tên kèm khoá thay cho ô chọn. */ selectionLocked: boolean }) {
  const modules = useModules();
  const style = styles.find((s) => s.id === draft.request.style);
  /*
   * Năng lực khai `default: true` được tick sẵn cho video MỚI (form này chỉ hiện khi chưa có video).
   * Chạy ĐÚNG MỘT LẦN, ngay khi danh mục và style đã về, và chỉ khi người dùng chưa tick gì: bỏ tick xong
   * mà vẫn bật lại thì cái tick thành ra không bỏ được.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !modules.length || !styles.length) return;
    seeded.current = true;
    const on = modules
      .filter((m) => m.isDefault && !style?.unsupportedModules?.includes(m.id))
      .map((m) => m.id);
    if (!on.length) return;
    setDraft((current) => (current.request.modules.length
      ? current
      : { ...current, request: { ...current.request, modules: on } }));
  }, [modules, styles, style, setDraft]);
  const formRef = useRef<HTMLDivElement>(null);
  const idInput = useRef<InputRef>(null);
  const idCheckRun = useRef(0);
  // Once the member picks a day by hand, a later script only warns about a mismatch instead of overriding it.
  const dayPicked = useRef(false);
  const [touched, setTouched] = useState({ id: false, day: false, script: false });
  const [scriptIssue, setScriptIssue] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<{ value: string; taken: boolean } | null>(null);
  const [checkingId, setCheckingId] = useState(false);
  const [validating, setValidating] = useState(false);
  const styleLabelId = useId();
  const idErrorId = useId();
  const dayMessageId = useId();
  const itemIdMessageId = useId();
  const scriptLabelId = useId();
  const scriptErrorId = useId();
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
  // What the manifest beside the MP4 will carry as item_id: the field when filled, else the video id.
  const itemId = itemIdFor(draft.request.itemId, draft.id);
  const itemIdTooLong = itemId.length > ITEM_ID_MAX;
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
  const scopeOff = SCOPE_LABELS.filter(([key]) => !draft.request.scope[key]).map(([, label]) => label.toLowerCase());
  const reviewer = resolveReviewer(draft.agentProvider, draft.review, installedAgents);
  const reviewProblem = draft.review.enabled && !reviewer.ok;
  const hasReferences = Boolean(draft.request.feedbackDir || draft.request.oldVideoDir || draft.request.notes.trim());
  // The folded section still has to say what it will do: a member who never opens it gets these defaults.
  const advancedSummary = [
    `mã item ${draft.request.itemId.trim() ? itemId : "theo mã video"}`,
    scopeOff.length ? `bỏ ${scopeOff.join(", ")}` : "làm đủ các phần",
    hasReferences ? "có nguồn tham chiếu" : "chưa có nguồn tham chiếu",
  ].join(" · ");
  const advancedProblem = itemIdTooLong;
  const format = FORMAT_OPTIONS.find((f) => f.value === (draft.request.format || "16x9")) ?? FORMAT_OPTIONS[0];
  const builder = BUILDER_OPTIONS.find((b) => b.value === draft.request.sceneBuilder) ?? BUILDER_OPTIONS[0];
  const agentOption = AGENT_PROVIDER_OPTIONS.find((o) => o.value === draft.agentProvider);
  const reviewOptions = [
    { value: "auto", label: "Tự chọn" },
    ...(["claude", "codex", "antigravity"] as AgentProvider[]).map((p) => ({
      value: p as string,
      // Không kèm "(agent đang dựng)" như ở bước Dựng cảnh: ô này hẹp, và dòng ghi chú bên dưới đã nói ai chấm ai.
      label: `${agentProviderLabel(p)}${installedAgents.includes(p) ? "" : " · chưa cài"}`,
      disabled: !installedAgents.includes(p),
    })),
    { value: "off", label: "Tắt" },
  ];
  return <div ref={formRef}><Form className="vs-plan-form" layout="vertical" requiredMark={false} aria-busy={loading} onFinish={() => { void submit(); }}>
    <div className="vs-section">
      <h3 className="vs-section-title vs-plan-heading"><span className="vs-plan-number" aria-hidden="true">1</span>Kịch bản</h3>
      <Form.Item className="field vs-script-slim" data-tour="plan.script" label={<span id={scriptLabelId} className="vs-field-label">Tệp kịch bản<RequiredMark /></span>} validateStatus={shownScriptError ? "error" : undefined} help={shownScriptError ? <span id={scriptErrorId} className="vs-validation-message is-error" role="alert"><WarningFilled />{shownScriptError}</span> : undefined}>
        {draft.script
          ? <div className="vs-file"><FileTextOutlined /><span><strong>{draft.script.name}</strong><small>{draft.script.content.length.toLocaleString("vi-VN")} ký tự · {draft.script.content.split("\n")[0].slice(0, 90)}</small></span><Upload {...uploadProps}><Button type="link" disabled={busy}>Đổi tệp</Button></Upload></div>
          // Một hàng thấp: thả tệp là việc làm một lần, không cần một vùng cao 140 px.
          : <Upload.Dragger {...uploadProps} className={`vs-drop-slim ${shownScriptError ? "is-invalid" : ""}`}>
              <span className="vs-drop-slim-row">
                <InboxOutlined aria-hidden="true" />
                <span className="vs-drop-slim-copy"><strong>Thả tệp .md / .txt vào đây</strong><small>Tối đa 300 KB · ngày của bài học tự điền theo kịch bản</small></span>
                <Button disabled={busy} data-validation-invalid={!!shownScriptError || undefined} aria-describedby={shownScriptError ? scriptErrorId : undefined} onBlur={() => setTouched((current) => ({ ...current, script: true }))}>Chọn tệp</Button>
              </span>
            </Upload.Dragger>}
      </Form.Item>
      <div className="field-grid vs-grid-3">
        <Form.Item className="field" data-tour="plan.id" label={<span className="vs-field-label">Mã video<RequiredMark /></span>} validateStatus={shownIdError ? "error" : checkingId ? "validating" : touched.id && idCheck?.value === draft.id ? "success" : undefined} help={(shownIdError || checkingId || (touched.id && idCheck?.value === draft.id && !idCheck.taken)) ? <span id={idErrorId} className={`vs-validation-message ${shownIdError ? "is-error" : checkingId ? "is-checking" : "is-ok"}`} role={shownIdError ? "alert" : "status"}>{shownIdError ? <WarningFilled /> : checkingId ? <LoadingOutlined spin /> : <CheckCircleFilled />}{shownIdError || (checkingId ? "Đang kiểm tra mã…" : "Mã này có thể sử dụng.")}</span> : undefined}>
          <Input ref={idInput} status={shownIdError ? "error" : undefined} aria-label="Mã video" aria-invalid={!!shownIdError || undefined} aria-describedby={shownIdError || checkingId ? idErrorId : undefined} value={draft.id} disabled={busy} maxLength={61} onBlur={() => { setTouched((current) => ({ ...current, id: true })); void checkVideoId(draft.id); }} onChange={(e) => { setIdCheck(null); setDraft((current) => ({ ...current, id: e.target.value })); }} placeholder="vd. d2-01-lab-v3" spellCheck={false} autoComplete="off" />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Ngày<RequiredMark /></span>} validateStatus={shownDayError ? "error" : dayMismatch ? "warning" : undefined} help={shownDayError || dayMismatch ? <span id={dayMessageId} className={`vs-validation-message ${shownDayError ? "is-error" : "is-warn"}`} role={shownDayError ? "alert" : "status"}><WarningFilled />{shownDayError || dayMismatch}</span> : undefined}>
          <Select value={draft.request.day || undefined} placeholder="Chọn ngày" aria-label="Ngày của bài học" status={shownDayError ? "error" : dayMismatch ? "warning" : undefined} aria-invalid={!!shownDayError || undefined} aria-describedby={shownDayError || dayMismatch ? dayMessageId : undefined} disabled={busy} onBlur={() => setTouched((current) => ({ ...current, day: true }))} onChange={(day) => { dayPicked.current = true; setTouched((current) => ({ ...current, day: true })); set({ day }); }} options={DAYS.map((day) => ({ value: day, label: day }))} />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Tên video</span>}>
          <Input value={draft.request.title} disabled={busy} maxLength={200} placeholder="Tuỳ chọn" aria-label="Tên video" onChange={(e) => set({ title: e.target.value })} />
        </Form.Item>
      </div>
    </div>
    <div className="vs-section">
      <h3 className="vs-section-title vs-plan-heading"><span className="vs-plan-number" aria-hidden="true">2</span>Hình thức</h3>
      <Form.Item className="vs-style-form-item" data-tour="plan.style" label={<span id={styleLabelId} className="vs-field-label">Style hình ảnh<RequiredMark /></span>}>
        {loading
          ? <div className="vs-inline-state" role="status"><LoadingOutlined spin /><span>Đang tải style và cấu hình agent…</span></div>
          : unavailable
            ? <div className="vs-inline-state is-error" role="status"><WarningFilled /><span>Chưa thể tải cấu hình Studio.</span></div>
            : <StylePicker styles={styles} value={draft.request.style} onChange={(s) => set({ style: s, modules: draft.request.modules.filter((id) => !styles.find((x) => x.id === s)?.unsupportedModules?.includes(id)) })} disabled={busy} labelledBy={styleLabelId} />}
      </Form.Item>
      {/* Hai khổ thì bày cả hai ra: thấy ngay lựa chọn còn lại, không phải mở dropdown. */}
      <Form.Item className="field vs-format" data-tour="plan.format" label={<span className="vs-field-label">Khổ hình<RequiredMark /></span>}>
        <div className="vs-format-row">
          <Segmented
            aria-label="Khổ hình"
            value={format.value}
            disabled={busy}
            onChange={(v) => set({ format: v as VideoFormat })}
            options={FORMAT_OPTIONS.map((f) => ({ value: f.value, label: <span className="vs-format-option"><i className={`vs-format-glyph is-${f.value}`} aria-hidden="true" />{f.short}</span> }))}
          />
          <small>{format.hint}</small>
        </div>
      </Form.Item>
      <section className="vs-cap" data-tour="plan.modules" aria-labelledby="vs-capabilities-title">
        <div className="vs-cap-head">
          <h4 id="vs-capabilities-title" className="vs-field-label">Video có thêm</h4>
          <span>Tuỳ chọn. Không bật gì là clip một người dẫn.</span>
        </div>
        <div className="vs-cap-grid">
          {modules.map((m) => {
            const unsupported = style?.unsupportedModules?.includes(m.id) ?? false;
            const checked = !unsupported && draft.request.modules.includes(m.id);
            const summary = unsupported ? `${style?.name} chưa hỗ trợ tính năng này.` : m.summary;
            return <div key={m.id} className={`vs-cap-row ${checked ? "is-on" : ""} ${busy || unsupported ? "is-disabled" : ""}`}>
              <Checkbox className="vs-cap-toggle" checked={checked} disabled={busy || unsupported} onChange={(e) => setModule(m.id, e.target.checked)}>
                <span className="vs-cap-copy"><strong>{m.short || m.name}</strong><small title={summary}>{summary}</small></span>
              </Checkbox>
              <ModuleDetails module={m} />
            </div>;
          })}
        </div>
      </section>
    </div>
    <div className="vs-section" data-tour="plan.who">
      <h3 className="vs-section-title vs-plan-heading"><span className="vs-plan-number" aria-hidden="true">3</span>Ai làm</h3>
      {/* Ba lựa chọn cùng trả lời một câu hỏi nên đứng một hàng. "Dựng cảnh bằng" từng nằm trong mục nâng cao đang
          gập, dù nó đổi cả bước Dựng cảnh — lựa chọn có hệ quả lớn không được giấu sau một lớp gập. */}
      <div className="vs-who">
        <Form.Item className="field" label={<span className="vs-field-label">Agent</span>}>
          <AgentField provider={draft.agentProvider} selectionLocked={selectionLocked} loading={loading} disabled={busy} onChange={(agentProvider) => setDraft((current) => ({ ...current, agentProvider }))} />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Dựng cảnh bằng</span>}>
          <Segmented
            aria-label="Dựng cảnh bằng"
            value={builder.value}
            disabled={busy}
            onChange={(v) => set({ sceneBuilder: v as SceneBuilder })}
            options={BUILDER_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
          />
        </Form.Item>
        <Form.Item className="field" label={<span className="vs-field-label">Review chéo</span>} validateStatus={reviewProblem ? "error" : undefined}>
          <Select
            aria-label="Review chéo ảnh cảnh"
            value={draft.review.enabled ? draft.review.provider : "off"}
            status={reviewProblem ? "error" : undefined}
            disabled={busy}
            popupMatchSelectWidth={false}
            options={reviewOptions}
            onChange={(v) => setDraft((current) => ({ ...current, review: v === "off" ? { ...current.review, enabled: false } : { enabled: true, provider: v as ReviewSettings["provider"] } }))}
          />
        </Form.Item>
      </div>
      <ul className="vs-who-notes">
        {selectionLocked && <li>Agent được ấn định bởi cấu hình máy.</li>}
        {isExperimentalProvider(draft.agentProvider) && <li className="is-warn"><WarningFilled />{agentOption?.description || "Agent này đang ở giai đoạn thử nghiệm."}</li>}
        <li>{builder.hint}</li>
        {builder.value === "agent" && <li className={reviewProblem ? "is-problem" : undefined} role={reviewProblem ? "alert" : undefined}>{reviewProblem && <WarningFilled />}{describeReviewer(draft.agentProvider, draft.review, installedAgents)}</li>}
        {builder.value === "claude-design" && <li>Review chéo không chạy trên cảnh dựng bên Claude Design.</li>}
      </ul>
    </div>
    <div className="vs-section">
      <Collapse className="vs-advanced" items={[{
        key: "advanced",
        forceRender: true,
        label: <span className="vs-collapse-label"><strong>Tuỳ chọn khác</strong><small className={advancedProblem ? "is-warn" : undefined}>{advancedProblem && <WarningFilled />}{advancedSummary}</small></span>,
        children: <div className="vs-advanced-body">
          <Form.Item
            className="field vs-item-id"
            label={<span className="vs-field-label">Mã item gửi QA</span>}
            validateStatus={itemIdTooLong ? "warning" : undefined}
            help={<span id={itemIdMessageId} className={`vs-validation-message${itemIdTooLong ? " is-warn" : ""}`} role="status">
              {itemIdTooLong ? <><WarningFilled />{`Dài ${itemId.length} ký tự, platform QA chỉ nhận tối đa ${ITEM_ID_MAX}.`}</> : "Mã platform QA gắn lỗi soát vào. Để trống thì dùng mã video."}
            </span>}
          >
            <Input value={draft.request.itemId} disabled={busy} maxLength={ITEM_ID_MAX * 2} placeholder={draft.id ? `Mặc định: ${draft.id}` : "Mặc định: mã video"} spellCheck={false} autoComplete="off" aria-label="Mã item gửi QA" aria-describedby={itemIdMessageId} onChange={(e) => set({ itemId: e.target.value })} />
          </Form.Item>
          <fieldset className="vs-scope">
            <legend className="vs-field-label">Phạm vi</legend>
            {/* Nói đúng điều từng ô làm: Studio chỉ đọc ô Transcript; ba ô kia là lời dặn trong REQUEST.md. Câu cũ
                ("Bỏ chọn phần bạn sẽ tự làm") hứa bỏ bước, trong khi không bước nào bị bỏ. */}
            <p className="vs-scope-note">
              Dựng cảnh và kiểm tra luôn được làm. Bỏ <strong>Transcript</strong> thì bước Render không sinh transcript.
              Ba ô còn lại chỉ ghi vào REQUEST.md cho agent biết phần nào bạn tự lo — Studio không bỏ bước nào, bạn chỉ việc không chạy bước đó.
            </p>
            <div className="vs-scope-options">
              {SCOPE_LABELS.map(([key, label]) => <Checkbox key={key} checked={draft.request.scope[key]} disabled={busy} onChange={(e) => set({ scope: { ...draft.request.scope, [key]: e.target.checked } })}>{label}</Checkbox>)}
            </div>
          </fieldset>
          <div className="vs-advanced-group">
            <span className="vs-field-label"><FolderOpenOutlined /> Nguồn tham chiếu</span>
            <div className="field-grid">
              <SourcePickerField label="Feedback bản cũ" purpose="feedback" value={draft.request.feedbackDir} disabled={busy} onChange={(v) => set({ feedbackDir: v })} />
              <SourcePickerField label="Video cũ" purpose="video" value={draft.request.oldVideoDir} disabled={busy} onChange={(v) => set({ oldVideoDir: v })} />
            </div>
            <Form.Item className="field vs-counted-textarea" label={<span className="vs-field-label">Ghi chú cho agent</span>}>
              <Input.TextArea rows={3} value={draft.request.notes} disabled={busy} maxLength={5000} showCount aria-label="Ghi chú cho agent" onChange={(e) => set({ notes: e.target.value })} />
            </Form.Item>
          </div>
        </div>,
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
      { key: "builder", label: "Dựng cảnh", children: state.request.sceneBuilder === "claude-design" ? "Claude Design" : "Agent ở máy" },
      { key: "style", label: "Style", children: <span className="vs-summary-style">{style?.name || r.style}{style && <StyleSampleButton style={style} />}</span> },
      { key: "format", label: "Khổ hình", children: FORMAT_OPTIONS.find((f) => f.value === (r.format || "16x9"))?.label || r.format },
      { key: "day", label: "Ngày", children: r.day || "—" },
      { key: "item", label: "Mã item gửi QA", children: itemIdFor(r.itemId, state.id) },
      { key: "scope", label: "Phạm vi", children: SCOPE_LABELS.filter(([key]) => r.scope[key]).map(([, label]) => label).join(", ") || "Chỉ dựng cảnh" },
      { key: "script", label: "Kịch bản", children: `projects/${state.id}/kich-ban-goc.md${r.scriptName ? ` (${r.scriptName})` : ""}` },
      { key: "feedback", label: "Feedback bản cũ", children: r.feedbackDir || "—" },
      { key: "video", label: "Video cũ", children: r.oldVideoDir || "—" },
      { key: "modules", label: "Tính năng nội dung", children: r.modules.length ? moduleNamesFrom(modules, r.modules).join(", ") : "—" },
      { key: "review", label: "Review chéo", children: state.review.enabled ? `Bật · ${state.review.provider === "auto" ? "tự chọn người review" : agentProviderLabel(state.review.provider)}` : "Tắt" },
      { key: "notes", label: "Ghi chú", children: r.notes || "—" },
    ]} />
  </div>;
}
