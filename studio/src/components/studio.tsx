"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CloseOutlined, ExportOutlined, LockOutlined } from "@ant-design/icons";
import { Button, Collapse, Empty, Steps, Tooltip } from "antd";
import { useSearchParams } from "next/navigation";
import { api, fileUrl, formatFrames, formatSize, scenePages, useKeyStatus, useVideo } from "@/lib/client";
import { inferDay } from "@/lib/day";
import type { AgentConfig, AgentProvider, StageId, StageStatus, StyleDef, VideoDetail, VoiceSource } from "@/lib/types";
import { agentProviderLabel } from "@/lib/agent-providers";
import { resolveReviewer } from "@/lib/review";
import { costLabels } from "@/lib/video-cost";
import { useJobNotice, useVideoTabTitle } from "@/lib/use-job-notice";
import { STUDIO_STEP_EVENT } from "@/lib/tours";
import { AgentName } from "./agent-mark";
import { Shell } from "./shell";
import { emptyDraft, PlanForm, PlanSummary, useModules, type PlanDraft } from "./plan-step";
import { moduleNamesFrom } from "@/lib/modules";
import { PageAgentBinding } from "./page-agent-binding";
import { ProductionState } from "./production-state";
import { StageBadge } from "./agent-panel";
import { CuesStep } from "./steps/cues-step";
import { RenderStep } from "./steps/render-step";
import { ScenesStep } from "./steps/scenes-step";
import { StepBar, type StepNav } from "./steps/shared";
import { VoiceStep } from "./steps/voice-step";


/** Nhãn và tỉ lệ khung của từng khổ — bản xem trước phải khớp khổ video thật sự dựng. */
const FORMAT_NAME: Record<string, string> = { "16x9": "Ngang 16:9", "9x16": "Dọc 9:16" };


/** Bốn nguồn giọng, gọi đúng tên ở thẻ tóm tắt — "ElevenLabs" cho cả bốn là sai với ba cái kia. */
const VOICE_SOURCE_LABEL: Record<VoiceSource, string> = {
  elevenlabs: "ElevenLabs",
  kaggle: "OmniVoice (Kaggle)",
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

/** Where a step stands, as one status: render and deliver are one step on the page. */
function stepStatus(step: Step, d: VideoDetail): StageStatus | null {
  const s = d.state.stages;
  if (step === "plan") return null;
  if (step !== "render") return s[step];
  // Rendered but not handed over yet is still "done" for the MP4; the bar says what is missing.
  if (s.render === "done") return s.deliver === "idle" ? "done" : s.deliver;
  return s.render;
}

/** The steps either side of `step`: the bar's Quay lại / Tiếp lead there. */
function neighbours(step: Step) {
  const index = STEPS.findIndex((item) => item.id === step);
  return { previous: STEPS[index - 1], next: STEPS[index + 1] };
}

/**
 * Cost and automation of this video's runs, folded to one line: it is for tuning the workflow, not for the
 * decision in front of the user — what the checks found lives in each step's Kiểm tra tự động panel.
 */
function WorkflowHealth({ detail }: { detail: VideoDetail }) {
  const report = detail.workflow;
  const cost = costLabels(detail.cost);
  if (!report.runs.total && !cost.agent && !cost.tts) return null;
  const tokens = report.usage.inputTokens + report.usage.outputTokens;
  return <div className="vs-workflow-tiles">
    {/* Cost first: it is what a member is asked about. Each tile says what its sum leaves out (lib/video-cost.ts). */}
    {cost.agent && <div title={cost.agent.note}><span>Chi phí agent</span><strong>{cost.agent.value}</strong><small>{cost.agent.missing ?? (detail.cost.pricedRuns ? `${detail.cost.agentRuns} lượt · giá API quy đổi` : `${detail.cost.agentRuns} lượt · CLI không báo giá`)}</small></div>}
    {cost.tts && <div title={cost.tts.note}><span>ElevenLabs</span><strong>{cost.tts.value}</strong><small>{cost.tts.missing ?? `${detail.cost.ttsRuns} lượt tạo giọng`}</small></div>}
    {report.runs.total > 0 && <>
      <div><span>Lượt chạy</span><strong>{report.runs.total}</strong><small>{report.runs.deterministic} lượt không cần agent · {Math.round(report.automationRatio * 100)}% tự động</small></div>
      <div><span>Token agent</span><strong>{tokens.toLocaleString("vi-VN")}</strong><small>đo được {report.usage.measuredRuns}/{report.runs.agent} lượt</small></div>
      <div><span>Lượt lỗi</span><strong>{report.runs.failures}</strong><small>trên {report.runs.total} lượt</small></div>
      <div><span>Tốn token nhất</span><strong>{report.mostExpensiveStage || "—"}</strong><small>stage dùng nhiều token agent nhất</small></div>
    </>}
  </div>;
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
  return { ...next, agentProvider: config.defaultProvider, review: { ...config.review.defaults } };
}

/**
 * One exact frame (the scene kit's ?frame= capture mode) at the format's real size, scaled down to the panel
 * width. The iframe must be the format's own viewport: a 1080×1920 scene in a 1920×1080 iframe is cut at
 * 1080 px and drawn at half the box width.
 */
function FramePreview({ src, width, height }: { src: string; width: number; height: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setScale(el.clientWidth / width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);
  return <div ref={box} className="vs-frame-box">
    {scale > 0 && <iframe title="Xem trước cảnh" src={src} tabIndex={-1} style={{ width, height, transform: `scale(${scale})` }} />}
  </div>;
}

function Preview({ detail, styles, draft, hasKey, installed }: { detail: VideoDetail | null; styles: StyleDef[]; draft: PlanDraft; hasKey: boolean; installed: AgentProvider[] }) {
  const modules = useModules();
  const request = detail?.state.request ?? draft.request;
  const style = styles.find((s) => s.id === request.style);
  const id = detail?.state.id || draft.id;
  // Trang mà bước Render sẽ chụp: cảnh của agent ở máy, hoặc trang nhập về từ Claude Design.
  const pages = detail ? scenePages(detail) : null;
  const awaitingImport = Boolean(detail?.claudeDesign && !pages);
  const size = formatSize(request.format);
  const cues = detail?.cues;
  const stages = detail ? Object.entries(detail.state.stages) as [StageId, StageStatus][] : [];
  const running = stages.find(([, v]) => v === "running");
  const review = stages.find(([, v]) => v === "review");
  const agentStatus = running ? `Đang chạy · ${running[0]}` : review ? `Chờ duyệt · ${review[0]}` : stages.every(([, v]) => v === "done") ? "Hoàn tất" : "Chờ bước tiếp";
  const source = detail?.state.voiceBound?.source ?? detail?.state.voice.source ?? "elevenlabs";
  const provider = detail?.state.agent.provider || draft.agentProvider;
  // a settled frame of the first narrated câu (the scene kit renders one exact frame for ?frame=)
  const first = cues?.cues.find((c) => !c.silent);
  const previewFrame = first ? Math.max(0, first.end - 20) : 0;
  const cover = style && [...(style.base?.showcase || []), ...style.showcase][style.base ? style.base.showcase.length : 0];
  return <aside className="preview-panel">
    <div className="panel-heading">
      <h2>Xem trước</h2>
      <span className="quiet-label">{size.aspect}</span>
    </div>
    {/* Khung xem trước phải đúng tỉ lệ của khổ: ép một cảnh dọc vào hộp 16:9 thì bản xem trước nói dối. */}
    <div className="slide-visual vs-preview-frame" style={{ aspectRatio: size.ratio }}>
      {pages
        ? <FramePreview src={pages.frame(previewFrame)} width={size.width} height={size.height} />
        : awaitingImport ? <Empty className="preview-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa nhập cảnh từ Claude Design" />
        : cover ? <img src={fileUrl(`styles/previews/${cover.image}`)} alt="" /> : <Empty className="preview-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có bản xem trước" />}
    </div>
    {pages && <div className="preview-caption"><Button type="link" href={pages.player} target="_blank" icon={<ExportOutlined />} iconPlacement="end">Mở trình phát</Button></div>}
    <div className="project-summary">
      <h3>{request.title || id || "Chưa đặt tên"}</h3>
      <p>{request.day || "Chưa chọn ngày"} · {style?.name || "Chưa chọn style"}</p>
    </div>
    {/* Facts the step on the left already shows stay folded; the frame and the player are what this panel is for. */}
    {detail
      ? <Collapse className="vs-preview-facts" size="small" items={[{
          key: "facts",
          label: <span>Thông số <span className="quiet-label">{cues?.cues.length ?? "—"} câu · {formatFrames(cues?.voiceDuration ?? cues?.duration)}</span></span>,
          children: <>
            <dl className="project-facts">
              <div><dt>Trạng thái</dt><dd>{agentStatus}</dd></div>
              <div><dt>Thời lượng {cues?.voiced ? "thật" : "ước tính"}</dt><dd className="mono">{formatFrames(cues?.voiceDuration ?? cues?.duration)}</dd></div>
              <div><dt>Nguồn giọng</dt><dd>{VOICE_SOURCE_LABEL[source]}</dd></div>
              {/* Key chỉ có nghĩa với ElevenLabs; các nguồn khác không đụng tới nó nên đừng bắt nhìn. */}
              {source === "elevenlabs" && <div><dt>Key ElevenLabs</dt><dd>{hasKey ? "Đã nhập" : "Chưa nhập"}</dd></div>}
            </dl>
            <WorkflowHealth detail={detail} />
          </>,
        }]} />
      : <PlanChecklist draft={draft} provider={provider} modules={moduleNamesFrom(modules, draft.request.modules)} installed={installed} />}
  </aside>;
}

/** Before the video exists the panel is the summary to read before pressing Tạo video. */
function PlanChecklist({ draft, provider, modules, installed }: { draft: PlanDraft; provider: AgentProvider; modules: string[]; installed: AgentProvider[] }) {
  const reviewer = resolveReviewer(provider, draft.review, installed);
  const missing = <span className="vs-preview-missing">Chưa chọn</span>;
  return <dl className="project-facts">
    <div><dt>Kịch bản</dt><dd>{draft.script ? <span className="vs-preview-file">{draft.script.name}</span> : missing}</dd></div>
    <div><dt>Mã video</dt><dd>{draft.id ? <span className="mono">{draft.id}</span> : missing}</dd></div>
    {/* Hai lựa chọn đổi cả cách dựng — khổ đổi cách bày cảnh, chỗ dựng đổi cả bước Dựng cảnh — nên phải đọc được trước khi bấm Tạo video. */}
    <div><dt>Khổ hình</dt><dd>{FORMAT_NAME[draft.request.format || "16x9"] || draft.request.format}</dd></div>
    <div><dt>Dựng cảnh</dt><dd>{draft.request.sceneBuilder === "claude-design" ? "Claude Design" : "Agent ở máy"}</dd></div>
    <div><dt>Tính năng</dt><dd>{modules.length ? modules.join(", ") : "Clip một người dẫn"}</dd></div>
    <div><dt>Agent</dt><dd><AgentName provider={provider} /></dd></div>
    <div><dt>Review chéo</dt><dd>{!draft.review.enabled ? "Tắt" : reviewer.ok ? agentProviderLabel(reviewer.provider) : "Chưa chọn được"}</dd></div>
  </dl>;
}

/** The agent is fixed when the video is created: one line under the title, not a card beside it. */
function AgentLine({ detail }: { detail: VideoDetail }) {
  const review = detail.state.review;
  const reviewer = resolveReviewer(detail.state.agent.provider, review, detail.installedAgents);
  return <p className="vs-agent-line">
    Agent dựng <strong><AgentName provider={detail.state.agent.provider} /></strong> <LockOutlined aria-label="đã khoá" />
    <span aria-hidden="true"> · </span>
    Review chéo <strong>{!review.enabled ? "tắt" : reviewer.ok ? agentProviderLabel(reviewer.provider) : "chưa chọn được"}</strong>
  </p>;
}

export default function Studio() {
  const params = useSearchParams();
  const id = params.get("id");
  const fromResearch = params.get("fromResearch");
  const [step, setStep] = useState<Step>("plan");
  const [workflowTooltip, setWorkflowTooltip] = useState<Step | null>(null);
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft("lesson-lab"));
  const [agentConfig, setAgentConfig] = useState<AgentConfig>({ defaultProvider: "claude", selectionLocked: true, review: { defaults: { enabled: true, provider: "auto" }, installed: [] } });
  const [setupReady, setSetupReady] = useState(false);
  const [setupLoading, setSetupLoading] = useState(true);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStep, setAutoStep] = useState(true);
  const jobNotice = useJobNotice(id);
  const { detail, logs, job, error: loadError, refresh } = useVideo(id, jobNotice.onJobEnd);
  useVideoTabTitle(jobNotice, detail ? detail.state.request.title || detail.state.id : null, job);

  // "Tạo video từ kịch bản này" ở trang Đóng gói kịch bản: điền sẵn kịch bản đã duyệt vào form, như thể
  // người dùng vừa chọn tệp. Mã video, style, ngày vẫn do người dùng chọn.
  useEffect(() => {
    if (id || !fromResearch) return;
    let alive = true;
    api<{ name: string; content: string; title: string }>(`/api/research/${encodeURIComponent(fromResearch)}/script`)
      .then(({ name, content, title }) => {
        if (!alive) return;
        setDraft((current) => ({
          ...current,
          script: { name, content },
          request: { ...current.request, scriptName: name, title: current.request.title || title, day: inferDay(name, content) ?? current.request.day },
        }));
      })
      .catch((e: unknown) => { if (alive) setError(`Không lấy được kịch bản từ Đóng gói kịch bản: ${e instanceof Error ? e.message : String(e)}`); });
    return () => { alive = false; };
  }, [id, fromResearch]);
  const { hasKey, setHasKey } = useKeyStatus();
  const editorPanel = useRef<HTMLElement>(null);

  // A step picked by the user scrolls its panel into view; the ref is only touched in the effect, so the
  // callbacks handed to the step bar stay free of refs.
  const [scrollNonce, setScrollNonce] = useState(0);
  const goToStep = useCallback((target: Step) => {
    setStep(target);
    setScrollNonce((n) => n + 1);
  }, []);
  useEffect(() => {
    if (scrollNonce) requestAnimationFrame(() => editorPanel.current?.scrollIntoView({ block: "start" }));
  }, [scrollNonce]);

  // The practice tour (components/tour.tsx) opens each production step of the sample video in turn.
  useEffect(() => {
    const open = (event: Event) => {
      const target = (event as CustomEvent<Step>).detail;
      if (STEPS.some((s) => s.id === target) && (target === "plan" || detail)) {
        setAutoStep(false);
        setStep(target);
      }
    };
    window.addEventListener(STUDIO_STEP_EVENT, open);
    return () => window.removeEventListener(STUDIO_STEP_EVENT, open);
  }, [detail]);

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
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function create() {
    if (!setupReady) return;
    await act(async () => {
      await api(`/api/videos`, { method: "POST", json: { id: draft.id, agentProvider: draft.agentProvider, review: draft.review, request: draft.request, script: draft.script } });
      // The video exists from here on, so open it before starting the agent: when that start failed, the
      // page stayed on the form and a second "Tạo video" answered 409, with the new video out of reach.
      window.history.pushState(null, "", `/?id=${draft.id}`);
      setAutoStep(false);
      setStep("cues");
      await api(`/api/videos/${draft.id}/agent`, { method: "POST", json: { stage: "cues" } });
    });
  }
  const stop = () => { if (id) void act(() => api(`/api/videos/${id}/stop`, { method: "POST", json: {} })); };
  const running = job?.status === "running";
  const { previous, next } = neighbours(step);
  // Tiếp only appears once this step is complete — until then the step's own action is the primary one.
  const nav: StepNav = {
    back: previous && { label: previous.title, onClick: () => goToStep(previous.id) },
    next: next && { label: next.title, onClick: () => goToStep(next.id), ready: complete(step, detail) },
  };
  const stepProps = detail ? { detail, logs, job, busy: busy || running || !detail.managed, act, stop, nav, refresh } : null;
  const current = STEPS.find((s) => s.id === step)!;
  const completed = STEPS.filter((item) => complete(item.id, detail) && !!detail).length;
  const pageProvider = detail?.state.agent.provider ?? draft.agentProvider;
  const workflowItems = STEPS.map((item) => {
    const disabled = item.id !== "plan" && !detail;
    let status: "finish" | "process" | "wait" = "wait";
    if (complete(item.id, detail) && detail) status = "finish";
    else if (step === item.id) status = "process";
    return {
      title: <Tooltip title={item.description} placement="bottom" open={workflowTooltip === item.id} destroyOnHidden>
        <span>{item.title}</span>
      </Tooltip>,
      disabled,
      status,
      tabIndex: 0,
      "aria-label": `${item.title}: ${item.description}`,
      "aria-disabled": disabled || undefined,
      onMouseEnter: () => setWorkflowTooltip(item.id),
      onMouseLeave: () => setWorkflowTooltip((current) => current === item.id ? null : current),
      onFocus: () => setWorkflowTooltip(item.id),
      onBlur: () => setWorkflowTooltip((current) => current === item.id ? null : current),
    };
  });

  return <Shell page={id ? "videos" : "new"}>
    <div className="page-heading vs-page-heading">
      <div>
        <div className="eyebrow"><span className="tiny-mark" /> {id ? detail?.state.request.day || "Video" : "Video mới"}</div>
        <h1>{detail?.state.request.title || id || "Video mới"}</h1>
        {detail && <AgentLine detail={detail} />}
      </div>
      {!id && <PageAgentBinding
        provider={pageProvider}
        selectionLocked={agentConfig.selectionLocked}
        immutable={Boolean(id)}
        loading={setupLoading || Boolean(id && !detail && !loadError)}
        disabled={busy || setupLoading || !setupReady}
        onChange={(agentProvider) => setDraft((current) => ({ ...current, agentProvider }))}
      />}
    </div>
    <div className="vs-production-rail" data-tour="studio.rail">
      <div className="vs-production-rail-head"><span>LUỒNG SẢN XUẤT</span><strong>{detail ? `${completed}/5 cổng hoàn tất` : "Thiết lập video đầu tiên"}</strong></div>
      <Steps
        className="workflow vs-workflow"
        classNames={{
          item: "vs-workflow-item",
          itemWrapper: "vs-workflow-item-wrapper",
          itemIcon: "vs-workflow-item-icon",
          itemSection: "vs-workflow-item-section",
          itemTitle: "vs-workflow-item-title",
        }}
        current={STEPS.findIndex((item) => item.id === step)}
        responsive={false}
        onChange={(index) => { const target = STEPS[index]; if (target.id === "plan" || detail) goToStep(target.id); }}
        items={workflowItems}
      />
    </div>
    {setupError && <ProductionState className="vs-production-state" status="error" title="Không tải được cấu hình Studio" detail={setupError} action={<Button size="small" onClick={() => { void loadSetup(); }}>Thử lại</Button>} />}
    {error && <ProductionState className="vs-production-state" status="error" title="Thao tác chưa hoàn tất" detail={error} action={<Button type="text" size="small" aria-label="Đóng thông báo" icon={<CloseOutlined />} onClick={() => setError(null)} />} />}
    {loadError && <ProductionState className="vs-production-state" status="error" title="Không tải được video" detail={loadError} action={<Button size="small" onClick={() => { void refresh(); }}>Tải lại</Button>} />}
    {detail && !detail.managed && (detail.state.sample
      ? <ProductionState className="vs-production-state" tour="studio.sample" status="idle" title="Video mẫu của chế độ tập" detail="Một video đã đi đủ năm bước, để bạn xem từng bước trông thế nào khi xong. Chỉ xem — không chạy lại được bước nào." />
      : <ProductionState className="vs-production-state" status="idle" title="Video được làm ngoài Video Studio" detail="Bạn chỉ có thể xem tệp và kết quả của video này." />)}
    <div className="editor-layout">
      <section ref={editorPanel} className="editor-panel" data-tour="studio.editor" aria-label={current.title}>
        <div className="panel-heading vs-step-heading"><div><h2>{current.title}</h2></div>{detail && stepStatus(step, detail) && <StageBadge status={stepStatus(step, detail)!} />}</div>
        {step === "plan" && (detail ? <><PlanSummary state={detail.state} styles={styles} /><StepBar nav={nav} tone="done" status="Kế hoạch đã chốt khi tạo video" /></> : <PlanForm styles={styles} draft={draft} setDraft={setDraft} onCreate={create} busy={busy || setupLoading || !setupReady} loading={setupLoading} unavailable={!setupReady} installedAgents={agentConfig.review.installed} />)}
        {step === "cues" && stepProps && <CuesStep {...stepProps} />}
        {step === "voice" && stepProps && <VoiceStep {...stepProps} hasKey={hasKey} setHasKey={setHasKey} />}
        {step === "scenes" && stepProps && <ScenesStep {...stepProps} />}
        {step === "render" && stepProps && <RenderStep {...stepProps} />}
      </section>
      <Preview detail={detail} styles={styles} draft={draft} hasKey={hasKey} installed={agentConfig.review.installed} />
    </div>
    <footer className="workspace-footer" />
  </Shell>;
}
