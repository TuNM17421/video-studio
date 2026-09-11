"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, Check, CheckCircle, FilmStrip, Info, ListChecks, Microphone, Monitor, Palette, X } from "@phosphor-icons/react";
import { api, dsUrl, fileUrl, formatFrames, useKeyStatus, useVideo } from "@/lib/client";
import type { StageId, StyleDef, VideoDetail } from "@/lib/types";
import { Shell } from "./shell";
import { emptyDraft, PlanForm, PlanSummary, type PlanDraft } from "./plan-step";
import { CuesStep, RenderStep, ScenesStep, VoiceStep } from "./steps";

type Step = "plan" | "cues" | "voice" | "scenes" | "render";
const STEPS: { id: Step; title: string; description: string; icon: typeof Palette }[] = [
  { id: "plan", title: "Kế hoạch", description: "Style và nội dung", icon: Palette },
  { id: "cues", title: "Lời & cue", description: "Chốt lời đọc", icon: ListChecks },
  { id: "voice", title: "Giọng đọc", description: "ElevenLabs", icon: Microphone },
  { id: "scenes", title: "Dựng cảnh", description: "Theo giọng thật", icon: Monitor },
  { id: "render", title: "Render", description: "MP4 và bàn giao", icon: FilmStrip },
];

function complete(step: Step, d: VideoDetail | null) {
  if (!d) return false;
  const s = d.state.stages;
  return step === "plan" ? true : step === "cues" ? s.cues === "done" : step === "voice" ? s.voice === "done" : step === "scenes" ? s.scenes === "done" : s.render === "done" && s.deliver === "done";
}

/** First step that still needs work. */
function nextStep(d: VideoDetail): Step {
  const s = d.state.stages;
  if (s.cues !== "done") return "cues";
  if (s.voice !== "done") return "voice";
  if (s.scenes !== "done") return "scenes";
  return "render";
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

function Preview({ detail, styles, draftStyle, hasKey }: { detail: VideoDetail | null; styles: StyleDef[]; draftStyle: string; hasKey: boolean }) {
  const style = styles.find((s) => s.id === (detail?.state.request.style || draftStyle));
  const id = detail?.state.id;
  const scenes = detail?.artifacts.scenes;
  const cues = detail?.cues;
  const running = detail?.state && (Object.entries(detail.state.stages) as [StageId, string][]).find(([, v]) => v === "running");
  const review = detail?.state && (Object.entries(detail.state.stages) as [StageId, string][]).find(([, v]) => v === "review");
  const agent = running ? `Đang chạy · ${running[0]}` : review ? `Chờ duyệt · ${review[0]}` : detail ? "Đang chờ" : "—";
  // a settled frame of the first narrated câu (the scene kit renders one exact frame for ?frame=)
  const first = cues?.cues.find((c) => !c.silent);
  const previewFrame = first ? Math.max(0, first.end - 20) : 0;
  const cover = style && [...(style.base?.showcase || []), ...style.showcase][style.base ? style.base.showcase.length : 0];
  return <aside className="preview-panel">
    <div className="panel-heading"><h2>{id || "Video mới"}</h2><span className="quiet-label">16:9</span></div>
    <div className="slide-visual vs-preview-frame">
      {scenes && id
        ? <FramePreview src={dsUrl(`ui_kits/lesson-video/index.html?scene=${encodeURIComponent(id)}&frame=${previewFrame}`)} />
        : cover ? <img src={fileUrl(`styles/previews/${cover.image}`)} alt="" /> : <div className="preview-empty"><FilmStrip size={32} weight="light" /></div>}
    </div>
    {scenes && id && <div className="preview-caption"><a className="text-button" href={dsUrl(`ui_kits/lesson-video/videos/${id}/player.html`)} target="_blank" rel="noreferrer">Mở trình phát<ArrowSquareOut size={13} /></a></div>}
    <div className="project-summary"><h3>{detail?.state.request.title || id || "Chưa đặt tên"}</h3></div>
    <dl className="project-facts">
      <div><dt>Style</dt><dd>{style?.name || "—"}</dd></div>
      <div><dt>Ngày</dt><dd>{detail?.state.request.day || "—"}</dd></div>
      <div><dt>Số câu</dt><dd>{cues?.cues.length ?? "—"}</dd></div>
      <div><dt>Thời lượng {cues?.voiced ? "thật" : "ước tính"}</dt><dd className="mono">{formatFrames(cues?.voiceDuration ?? cues?.duration)}</dd></div>
      <div><dt>Agent</dt><dd>{agent}</dd></div>
      <div><dt>Key ElevenLabs</dt><dd>{hasKey ? "Đã nhập" : "Chưa nhập"}</dd></div>
    </dl>
  </aside>;
}

export default function Studio() {
  const [id, setId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("plan");
  const [styles, setStyles] = useState<StyleDef[]>([]);
  const [draft, setDraft] = useState<PlanDraft>(emptyDraft("lesson-lab"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoStep, setAutoStep] = useState(true);
  const { detail, logs, job, error: loadError } = useVideo(id);
  const { hasKey, setHasKey } = useKeyStatus();

  useEffect(() => {
    const read = () => { const v = new URLSearchParams(window.location.search).get("id"); setId(v); setAutoStep(true); if (!v) setStep("plan"); };
    read();
    window.addEventListener("popstate", read);
    api<StyleDef[]>("/api/styles").then((list) => { setStyles(list); if (list.length) setDraft((d) => (list.some((s) => s.id === d.request.style) ? d : emptyDraft(list[list.length - 1].id))); }).catch((e) => setError(e.message));
    return () => window.removeEventListener("popstate", read);
  }, []);
  useEffect(() => { if (detail && autoStep) { setStep(nextStep(detail)); setAutoStep(false); } }, [detail, autoStep]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  }
  async function create() {
    await act(async () => {
      await api(`/api/videos`, { method: "POST", json: { id: draft.id, request: draft.request, script: draft.script } });
      await api(`/api/videos/${draft.id}/agent`, { method: "POST", json: { stage: "cues" } });
      window.history.pushState(null, "", `/?id=${draft.id}`);
      setId(draft.id);
      setAutoStep(false);
      setStep("cues");
    });
  }
  const stop = () => { if (id) void act(() => api(`/api/videos/${id}/stop`, { method: "POST", json: {} })); };
  const running = job?.status === "running";
  const stepProps = detail ? { detail, logs, job, busy: busy || running || !detail.managed, act, stop } : null;
  const current = STEPS.find((s) => s.id === step)!;
  const shown = error || loadError;

  return <Shell page={id ? "videos" : "new"} crumb={id || "Video mới"} hasKey={hasKey}>
    <div className="page-heading"><div><div className="eyebrow"><span className="tiny-mark" /> {id ? detail?.state.request.day || "Video" : "Video mới"}</div><h1>{detail?.state.request.title || id || "Video mới"}</h1></div></div>
    <nav className="workflow vs-workflow" aria-label="Các bước dựng video">{STEPS.map((item, index) => {
      const enabled = item.id === "plan" || !!detail;
      const done = complete(item.id, detail) && !!detail;
      return <button key={item.id} disabled={!enabled} aria-current={step === item.id ? "step" : undefined} className={`workflow-step ${step === item.id ? "is-current" : ""} ${done ? "is-complete" : ""}`} onClick={() => setStep(item.id)}>
        <span className="step-number">{done && step !== item.id ? <Check size={16} weight="bold" /> : index + 1}</span>
        <span className="step-copy"><strong>{item.title}</strong><span>{item.description}</span></span>
        {index < STEPS.length - 1 && <span className="step-connector" />}
      </button>;
    })}</nav>
    {shown && <div className="feedback feedback-error" role="alert"><Info size={21} /><div><strong>Thao tác chưa hoàn tất</strong><p>{shown}</p></div><button className="icon-button" aria-label="Đóng thông báo lỗi" onClick={() => setError(null)}><X size={18} /></button></div>}
    {detail && !detail.managed && <div className="feedback feedback-success"><CheckCircle size={20} /><p>Video này được làm ngoài Video Studio: chỉ xem được file và kết quả.</p></div>}
    <div className="editor-layout">
      <section className="editor-panel" aria-label={current.title}>
        <div className="panel-heading"><div><h2>{current.title}</h2></div><span className="pill-label">BƯỚC {STEPS.indexOf(current) + 1}</span></div>
        {step === "plan" && (detail ? <PlanSummary state={detail.state} styles={styles} /> : <PlanForm styles={styles} draft={draft} setDraft={setDraft} onCreate={create} busy={busy} />)}
        {step === "cues" && stepProps && <CuesStep {...stepProps} />}
        {step === "voice" && stepProps && <VoiceStep {...stepProps} hasKey={hasKey} setHasKey={setHasKey} />}
        {step === "scenes" && stepProps && <ScenesStep {...stepProps} />}
        {step === "render" && stepProps && <RenderStep {...stepProps} />}
      </section>
      <Preview detail={detail} styles={styles} draftStyle={draft.request.style} hasKey={hasKey} />
    </div>
    <footer className="workspace-footer" />
  </Shell>;
}
