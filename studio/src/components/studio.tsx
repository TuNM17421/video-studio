"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircleFilled, ExportOutlined, LeftOutlined, LockOutlined, RightOutlined } from "@ant-design/icons";
import { Alert, Button, Empty, Steps, Tag } from "antd";
import { useSearchParams } from "next/navigation";
import { api, dsUrl, fileUrl, formatFrames, useKeyStatus, useVideo } from "@/lib/client";
import type { AgentConfig, StageId, StyleDef, VideoDetail, VoiceSource } from "@/lib/types";
import { AgentName } from "./agent-mark";
import { Shell } from "./shell";
import { emptyDraft, PlanForm, PlanSummary, type PlanDraft } from "./plan-step";
import { PageAgentBinding } from "./page-agent-binding";
import { CuesStep, RenderStep, ScenesStep, VoiceStep } from "./steps";

/** Ba nguồn giọng, gọi đúng tên ở thẻ tóm tắt — "ElevenLabs" cho cả ba là sai với hai cái kia. */
const VOICE_SOURCE_LABEL: Record<VoiceSource, string> = {
  elevenlabs: "ElevenLabs",
  import: "Audio có sẵn",
  local: "Model local",
};

type Step = "plan" | "cues" | "voice" | "scenes" | "render";
const STEPS: { id: Step; title: string; description: string }[] = [
  { id: "plan", title: "Kế hoạch", description: "Style và nội dung" },
  { id: "cues", title: "Lời & cue", description: "Chốt lời đọc" },
  { id: "voice", title: "Giọng đọc", description: "Nguồn và bản thu" },
  { id: "scenes", title: "Dựng cảnh", description: "Theo giọng thật" },
  { id: "render", title: "Render", description: "MP4 và bàn giao" },
];

function complete(step: Step, d: VideoDetail | null) {
  if (!d) return false;
  const s = d.state.stages;
  return step === "plan" ? true : step === "cues" ? s.cues === "done" : step === "voice" ? s.voice === "done" : step === "scenes" ? s.scenes === "done" : s.render === "done" && s.deliver === "done";
}

function WorkflowNavigation({ step, detail, onChange }: { step: Step; detail: VideoDetail | null; onChange: (step: Step) => void }) {
  if (!detail) return null;
  const index = STEPS.findIndex((item) => item.id === step);
  const current = STEPS[index];
  const previous = STEPS[index - 1];
  const next = STEPS[index + 1];
  const ready = complete(step, detail);
  const guidance = next
    ? ready ? `Đã xong ${current.title}. Bạn có thể tiếp tục.` : `Hoàn tất ${current.title} để mở bước tiếp theo.`
    : ready ? "Luồng sản xuất đã hoàn tất." : "Bước cuối · hoàn tất render và bàn giao.";

  return <nav className="vs-gate-navigation" aria-label="Điều hướng giữa các bước sản xuất">
    {previous
      ? <Button className="vs-gate-navigation-back" icon={<LeftOutlined />} onClick={() => onChange(previous.id)}>Quay lại: {previous.title}</Button>
      : <span aria-hidden="true" />}
    <span className={`vs-gate-navigation-status ${ready ? "is-ready" : "is-locked"}`} aria-live="polite">
      {ready ? <CheckCircleFilled /> : <LockOutlined />}{guidance}
    </span>
    {next
      ? <Button className="vs-gate-navigation-next" type="primary" disabled={!ready} icon={<RightOutlined />} iconPlacement="end" onClick={() => onChange(next.id)}>Tiếp: {next.title}</Button>
      : <span aria-hidden="true" />}
  </nav>;
}

function WorkflowHealth({ detail }: { detail: VideoDetail }) {
  const report = detail.workflow;
  const tokens = report.usage.inputTokens + report.usage.outputTokens;
  return <section className="vs-workflow-health" aria-label="Hiệu suất workflow">
    <div><span>Automation</span><strong>{Math.round(report.automationRatio * 100)}%</strong><small>{report.runs.deterministic}/{report.runs.total} lượt deterministic</small></div>
    <div><span>Agent tokens</span><strong>{tokens.toLocaleString("en-US")}</strong><small>đo được {report.usage.measuredRuns}/{report.runs.agent} lượt · ${report.usage.costUsd.toFixed(4)}</small></div>
    <div><span>Feedback mở</span><strong>{report.feedback.open}</strong><small>{report.feedback.blocker} blocker · {report.feedback.major} major</small></div>
    <div><span>Điểm tốn nhất</span><strong>{report.mostExpensiveStage || "—"}</strong><Button type="link" href={fileUrl(report.files.plan)} target="_blank">Mở improvement plan</Button></div>
  </section>;
}

/** First step that still needs work. */
function nextStep(d: VideoDetail): Step {
  const s = d.state.stages;
  if (s.cues !== "done") return "cues";
  if (s.voice !== "done") return "voice";
  if (s.scenes !== "done") return "scenes";
  return "render";
}

function applySetupToDraft(current: PlanDraft, list: StyleDef[], config: AgentConfig): PlanDraft {
  const next = list.length && !list.some((style) => style.id === current.request.style)
    ? emptyDraft(list[list.length - 1].id, config.defaultProvider)
    : current;
  return { ...next, agentProvider: config.defaultProvider };
}

/** One exact 1920×1080 frame (the scene kit's ?frame= capture mode), scaled down to the panel width. */
function FramePreview({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / 1920));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return <div ref={box} className="vs-frame-box">
    {scale > 0 && <iframe title="Xem trước cảnh" src={src} tabIndex={-1} style={{ transform: `scale(${scale})` }} />}
  </div>;
}

function Preview({ detail, styles, draft, hasKey }: { detail: VideoDetail | null; styles: StyleDef[]; draft: PlanDraft; hasKey: boolean }) {
  const request = detail?.state.request ?? draft.request;
  const style = styles.find((s) => s.id === request.style);
  const id = detail?.state.id || draft.id;
  const scenes = detail?.artifacts.scenes;
  const cues = detail?.cues;
  const running = detail?.state && (Object.entries(detail.state.stages) as [StageId, string][]).find(([, v]) => v === "running");
  const review = detail?.state && (Object.entries(detail.state.stages) as [StageId, string][]).find(([, v]) => v === "review");
  const agentStatus = running ? `Đang chạy · ${running[0]}` : review ? `Chờ duyệt · ${review[0]}` : detail ? "Đang chờ" : "—";
  const provider = detail?.state.agent.provider || draft.agentProvider;
  // a settled frame of the first narrated câu (the scene kit renders one exact frame for ?frame=)
  const first = cues?.cues.find((c) => !c.silent);
  const previewFrame = first ? Math.max(0, first.end - 20) : 0;
  const cover = style && [...(style.base?.showcase || []), ...style.showcase][style.base ? style.base.showcase.length : 0];
  return <aside className="preview-panel">
    <div className="panel-heading">
      <h2>Video preview</h2>
      <span className="quiet-label">16:9</span>
    </div>
    <div className="slide-visual vs-preview-frame">
      {scenes && id
        ? <FramePreview src={dsUrl(`ui_kits/lesson-video/index.html?scene=${encodeURIComponent(id)}&frame=${previewFrame}`)} />
        : cover ? <img src={fileUrl(`styles/previews/${cover.image}`)} alt="" /> : <Empty className="preview-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bản xem trước" />}
    </div>
    {scenes && id && <div className="preview-caption"><Button type="link" href={dsUrl(`ui_kits/lesson-video/videos/${id}/player.html`)} target="_blank" icon={<ExportOutlined />} iconPlacement="end">Mở trình phát</Button></div>}
    <div className="project-summary">
      <h3>{request.title || id || "Chưa đặt tên"}</h3>
      <p>{request.day || "Chưa chọn ngày"} · {style?.name || "Chưa chọn style"}</p>
    </div>
    <dl className="project-facts">
      <div><dt>Agent</dt><dd><AgentName provider={provider} /></dd></div>
      <div><dt>Trạng thái</dt><dd>{detail ? agentStatus : "Chưa tạo"}</dd></div>
      <div><dt>Số câu</dt><dd>{cues?.cues.length ?? "—"}</dd></div>
      <div><dt>Thời lượng {cues?.voiced ? "thật" : "ước tính"}</dt><dd className="mono">{formatFrames(cues?.voiceDuration ?? cues?.duration)}</dd></div>
      <div><dt>Nguồn giọng</dt><dd>{VOICE_SOURCE_LABEL[detail?.state.voice.source ?? "elevenlabs"]}</dd></div>
      {/* Key chỉ có nghĩa với ElevenLabs; hai nguồn kia không đụng tới nó nên đừng bắt nhìn. */}
      {(detail?.state.voice.source ?? "elevenlabs") === "elevenlabs" && <div><dt>Key ElevenLabs</dt><dd>{hasKey ? "Đã nhập" : "Chưa nhập"}</dd></div>}
    </dl>
  </aside>;
}

export default function Studio() {
  const id = useSearchParams().get("id");
  const [step, setStep] = useState<Step>("plan");
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft("lesson-lab"));
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ defaultProvider: "claude", selectionLocked: true });
  const [setupReady, setSetupReady] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStep, setAutoStep] = useState(true);
  const { detail, logs, job, error: loadError, refresh } = useVideo(id);
  const { hasKey, setHasKey } = useKeyStatus();
  const editorPanel = useRef<HTMLElement>(null);

  const goToStep = useCallback((target: Step) => {
    setStep(target);
    requestAnimationFrame(() => editorPanel.current?.scrollIntoView({ block: "start" }));
  }, []);

  const loadSetup = useCallback(async () => {
    setSetupLoading(true);
    setSetupError(null);
    setSetupReady(false);
    try {
      const [list, config] = await Promise.all([
        api<StyleDef[]>("/api/styles"),
        api<AgentConfig>("/api/agent-config"),
      ]);
      setStyles(list);
      setAgentConfig(config);
      setDraft((current) => applySetupToDraft(current, list, config));
      setSetupReady(true);
    } catch (caught) {
      setSetupError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setSetupLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      api<StyleDef[]>("/api/styles"),
      api<AgentConfig>("/api/agent-config"),
    ]).then(([list, config]) => {
      setStyles(list);
      setAgentConfig(config);
      setDraft((current) => applySetupToDraft(current, list, config));
      setSetupReady(true);
    }).catch((caught) => {
      setSetupError(caught instanceof Error ? caught.message : String(caught));
    }).finally(() => setSetupLoading(false));
  }, []);
  // Query-only navigation keeps this Client Component mounted. Reset the gate
  // selection whenever Next updates the active video in the URL.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setAutoStep(true); if (!id) setStep("plan"); }, [id]);
  // The server state decides which production gate should open after loading a video.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (detail && autoStep) { setStep(nextStep(detail)); setAutoStep(false); } }, [detail, autoStep]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!setupReady) return;
    await act(async () => {
      await api(`/api/videos`, { method: "POST", json: { id: draft.id, agentProvider: draft.agentProvider, request: draft.request, script: draft.script, quizMusic: draft.quizMusic } });
      await api(`/api/videos/${draft.id}/agent`, { method: "POST", json: { stage: "cues" } });
      window.history.pushState(null, "", `/?id=${draft.id}`);
      setAutoStep(false);
      setStep("cues");
    });
  }
  const stop = () => { if (id) void act(() => api(`/api/videos/${id}/stop`, { method: "POST", json: {} })); };
  const running = job?.status === "running";
  const stepProps = detail ? { detail, logs, job, busy: busy || running || !detail.managed, act, stop } : null;
  const current = STEPS.find((s) => s.id === step)!;
  const completed = STEPS.filter((item) => complete(item.id, detail) && !!detail).length;
  const pageProvider = detail?.state.agent.provider ?? draft.agentProvider;

  return <Shell page={id ? "videos" : "new"} hasKey={hasKey}>
    <div className="page-heading vs-page-heading">
      <div><div className="eyebrow"><span className="tiny-mark" /> {id ? detail?.state.request.day || "Video" : "Video mới"}</div><h1>{detail?.state.request.title || id || "Video mới"}</h1></div>
      <PageAgentBinding
        provider={pageProvider}
        selectionLocked={agentConfig.selectionLocked}
        immutable={Boolean(id)}
        loading={setupLoading || Boolean(id && !detail && !loadError)}
        disabled={busy || setupLoading || !setupReady}
        onChange={(agentProvider) => setDraft((current) => ({ ...current, agentProvider }))}
      />
    </div>
    <div className="vs-production-rail">
      <div className="vs-production-rail-head"><span>LUỒNG SẢN XUẤT</span><strong>{detail ? `${completed}/5 cổng hoàn tất` : "Thiết lập video đầu tiên"}</strong></div>
      <Steps
        className="workflow vs-workflow"
        classNames={{
          item: "vs-workflow-item",
          itemWrapper: "vs-workflow-item-wrapper",
          itemIcon: "vs-workflow-item-icon",
          itemSection: "vs-workflow-item-section",
          itemTitle: "vs-workflow-item-title",
          itemContent: "vs-workflow-item-content",
        }}
        current={STEPS.findIndex((item) => item.id === step)}
        responsive={false}
        onChange={(index) => { const target = STEPS[index]; if (target.id === "plan" || detail) goToStep(target.id); }}
        items={STEPS.map((item) => ({
          title: item.title,
          content: item.description,
          disabled: item.id !== "plan" && !detail,
          status: complete(item.id, detail) && detail ? "finish" : step === item.id ? "process" : "wait",
        }))}
      />
    </div>
    {detail && <WorkflowHealth detail={detail} />}
    {setupError && <Alert className="feedback" type="error" showIcon title="Không tải được cấu hình Studio" description={setupError} action={<Button size="small" onClick={() => { void loadSetup(); }}>Thử lại</Button>} />}
    {error && <Alert className="feedback" type="error" showIcon closable title="Thao tác chưa hoàn tất" description={error} onClose={() => setError(null)} />}
    {loadError && <Alert className="feedback" type="error" showIcon title="Không tải được video" description={loadError} action={<Button size="small" onClick={() => { void refresh(); }}>Tải lại</Button>} />}
    {detail && !detail.managed && <Alert className="feedback" type="info" showIcon title="Video được làm ngoài Video Studio" description="Bạn chỉ có thể xem tệp và kết quả của video này." />}
    <div className="editor-layout">
      <section ref={editorPanel} className="editor-panel" aria-label={current.title}>
        <div className="panel-heading"><div><h2>{current.title}</h2></div><Tag className="pill-label">BƯỚC {STEPS.indexOf(current) + 1}</Tag></div>
        {step === "plan" && (detail ? <PlanSummary state={detail.state} styles={styles} /> : <PlanForm styles={styles} draft={draft} setDraft={setDraft} onCreate={create} busy={busy || setupLoading || !setupReady} loading={setupLoading} unavailable={!setupReady} />)}
        {step === "cues" && stepProps && <CuesStep {...stepProps} />}
        {step === "voice" && stepProps && <VoiceStep {...stepProps} hasKey={hasKey} setHasKey={setHasKey} />}
        {step === "scenes" && stepProps && <ScenesStep {...stepProps} />}
        {step === "render" && stepProps && <RenderStep {...stepProps} />}
        <WorkflowNavigation step={step} detail={detail} onChange={goToStep} />
      </section>
      <Preview detail={detail} styles={styles} draft={draft} hasKey={hasKey} />
    </div>
    <footer className="workspace-footer" />
  </Shell>;
}
