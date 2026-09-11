"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle, FilmStrip, Key, LockSimple, MagnifyingGlass, Play, Trash, Waveform, X } from "@phosphor-icons/react";
import { api, dsUrl, fileUrl, formatFrames } from "@/lib/client";
import type { DryRun, JobInfo, LogEntry, VideoDetail, VoiceSettings } from "@/lib/types";
import { AgentLog, AgentSummary, FeedbackBox, JobProgress, StageBadge, stageLogs } from "./agent-panel";

export interface StepProps {
  detail: VideoDetail;
  logs: LogEntry[];
  job: JobInfo | null;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  stop: () => void;
}

const post = (url: string, json: unknown) => api(url, { method: "POST", json });

function CueList({ detail }: { detail: VideoDetail }) {
  const info = detail.cues;
  if (!info?.cues.length) return null;
  let section: number | null = null;
  return <div className="scene-list vs-cue-list">{info.cues.map((c) => {
    const header = c.section !== null && c.section !== section ? info.sections[(c.section ?? 1) - 1] : null;
    section = c.section;
    return <div key={c.n}>
      {header && <div className="vs-cue-section">Phần {c.section} · {header}</div>}
      <div className="scene-list-item">
        <span className="scene-index">{String(c.n).padStart(2, "0")}</span>
        <span className="scene-list-copy"><strong>{c.title || (c.silent ? "Khoảng dừng" : "—")}</strong><span className="vs-cue-text">{c.silent ? "(không lời)" : c.text}</span></span>
        <span className="scene-time mono">{formatFrames(c.start)}<br /><span>{formatFrames(c.end - c.start)}</span></span>
      </div>
    </div>;
  })}</div>;
}

export function CuesStep({ detail, logs, job, busy, act, stop }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.cues;
  const voiced = detail.state.stages.voice === "done";
  const runLogs = stageLogs(logs, /agent · cues|agent \(cues\)/);
  const count = detail.cues?.cues.length ?? 0;
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} />{count > 0 && <span className="quiet-label">{count} CÂU · {formatFrames(detail.cues?.duration)} ƯỚC TÍNH</span>}</div>
      <JobProgress job={job?.kind === "cues" ? job : null} onStop={stop} />
      {status === "idle" && <div className="step-empty"><h3>Agent chưa chạy</h3><button className="button button-primary" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }))}><Play size={17} weight="fill" />Chạy agent</button></div>}
      {status === "error" && <div className="feedback feedback-error"><div><strong>Chưa xong</strong><p>{detail.state.lastError || "Xem nhật ký."}</p></div><button className="button button-secondary compact" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }))}>Chạy lại</button></div>}
      <AgentSummary logs={runLogs} />
      <CueList detail={detail} />
      {(status === "review" || (status === "done" && !voiced)) && <FeedbackBox disabled={busy} placeholder="Ví dụ: tách câu 12 thành hai câu; đổi tên nhân vật Minh thành Dũng…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "cues", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer">
      <span />
      {status === "review"
        ? <button className="button button-primary" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "cues" }))}><CheckCircle size={17} />Duyệt lời & cue</button>
        : status === "done" ? <span className="privacy-inline"><CheckCircle size={15} />Đã duyệt</span> : <span />}
    </div>
  </>;
}

const MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2" },
  { id: "eleven_v3", label: "Eleven v3" },
];

export function VoiceStep({ detail, logs, job, busy, act, stop, hasKey, setHasKey }: StepProps & { hasKey: boolean; setHasKey: (v: boolean) => void }) {
  const id = detail.state.id;
  const status = detail.state.stages.voice;
  const [settings, setSettings] = useState<VoiceSettings>(detail.state.voice);
  const [dry, setDry] = useState<DryRun | null>(detail.dryRun);
  const [checked, setChecked] = useState<string>(detail.dryRun ? JSON.stringify(detail.state.voice) : "");
  const [key, setKey] = useState("");
  useEffect(() => { setSettings(detail.state.voice); }, [detail.state.voice]);
  const cuesApproved = detail.state.stages.cues === "done";
  const fresh = !!dry && checked === JSON.stringify(settings);
  const runLogs = stageLogs(logs, /^Tạo giọng ·/);
  async function saveKey() {
    await act(async () => { await api("/api/voice-key", { method: "POST", json: { key } }); setHasKey(true); setKey(""); });
  }
  async function check() {
    await act(async () => {
      const result = await api<DryRun>(`/api/videos/${id}/voice`, { method: "POST", json: { action: "dry-run", settings } });
      setDry(result);
      setChecked(JSON.stringify(settings));
    });
  }
  const locked = !hasKey || !fresh || !cuesApproved;
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} /></div>
      {!cuesApproved && <div className="step-empty"><h3>Duyệt lời & cue trước</h3></div>}
      {cuesApproved && <>
        <div className="vs-key-row">
          <Key size={18} />
          {hasKey
            ? <><span className="vs-key-on"><span className="connection-dot is-connected" />Đã nhập key</span><button className="text-button" onClick={() => act(async () => { await api("/api/voice-key", { method: "DELETE" }); setHasKey(false); })}><Trash size={14} />Xoá key</button></>
            : <><label className="field vs-key-field"><span className="sr-only">API key ElevenLabs</span><input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API key ElevenLabs" autoComplete="off" spellCheck={false} /></label><button className="button button-secondary compact" disabled={!key.trim() || busy} onClick={saveKey}>Dùng key</button></>}
        </div>
        <div className="field-grid vs-grid-4">
          <label className="field">Voice ID<input value={settings.voiceId} onChange={(e) => setSettings({ ...settings, voiceId: e.target.value.trim() })} spellCheck={false} autoComplete="off" /></label>
          <label className="field">Model<select value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value })}>{MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label className="field">Ngôn ngữ<select value={settings.language} onChange={(e) => setSettings({ ...settings, language: e.target.value })}><option value="vi">Tiếng Việt</option><option value="auto">Tự nhận (v3)</option></select></label>
          <label className="field">Nghỉ giữa câu (giây)<input type="number" min={0} max={5} step={0.1} value={settings.pause} onChange={(e) => setSettings({ ...settings, pause: Number(e.target.value) })} /></label>
        </div>
        <div className="vs-dry">
          <button className="button button-secondary compact" disabled={busy || !settings.voiceId} onClick={check}><MagnifyingGlass size={15} />Kiểm tra</button>
          {dry && <div className={`vs-dry-result ${fresh ? "" : "is-stale"}`}>
            <strong>{dry.cues.length} câu · {dry.cues.filter((c) => c.cached).length} có sẵn trong cache · {dry.toGenerate} câu mới · {dry.billable.toLocaleString("vi-VN")} ký tự sẽ gửi</strong>
            {!fresh && <small>Cài đặt đã đổi, bấm Kiểm tra lại.</small>}
          </div>}
        </div>
        <JobProgress job={job?.kind === "voice" ? job : null} onStop={stop} />
        {status === "error" && <div className="feedback feedback-error"><div><strong>Chưa xong</strong><p>{detail.state.lastError || "Xem nhật ký."}</p></div></div>}
        {detail.artifacts.voice && <div className="audio-result vs-audio"><div><span><CheckCircle size={18} />Giọng đã gắn vào video · {formatFrames(detail.cues?.voiceDuration)}{detail.cues?.wordTimings ? " · có mốc từng từ" : ""}</span></div><audio controls src={fileUrl(`tts-elevenlabs/out/${id}/voice.wav`)} preload="none" /></div>}
        <button className="button button-primary full-width" disabled={locked || busy} onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "generate" }))}>
          {locked ? <LockSimple size={18} /> : <Waveform size={19} />}
          {dry && fresh && dry.billable === 0 ? "Ghép giọng từ cache" : `Tạo giọng${dry && fresh ? ` · ${dry.toGenerate} câu, ${dry.billable.toLocaleString("vi-VN")} ký tự` : ""}`}
        </button>
        <AgentLog logs={runLogs} open={status === "running"} />
      </>}
    </div>
    <div className="panel-footer"><span />{status === "done" && <span className="privacy-inline"><CheckCircle size={15} />Giọng đã sẵn sàng</span>}</div>
  </>;
}

export function ScenesStep({ detail, logs, job, busy, act, stop }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.scenes;
  const [zoom, setZoom] = useState<string | null>(null);
  const runLogs = stageLogs(logs, /agent · scenes|agent \(scenes\)/);
  const voiced = detail.state.stages.voice === "done";
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} />{detail.qa.length > 0 && <span className="quiet-label">{detail.qa.length} ẢNH QA</span>}</div>
      <JobProgress job={job?.kind === "scenes" ? job : null} onStop={stop} />
      {!voiced && <div className="step-empty"><h3>Tạo giọng đọc trước</h3></div>}
      {voiced && status === "idle" && <div className="step-empty"><h3>Agent chưa chạy</h3><button className="button button-primary" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes" }))}><Play size={17} weight="fill" />Bắt đầu dựng cảnh</button></div>}
      {status === "error" && <div className="feedback feedback-error"><div><strong>Chưa xong</strong><p>{detail.state.lastError || "Xem nhật ký."}</p></div><button className="button button-secondary compact" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes" }))}>Chạy lại</button></div>}
      <AgentSummary logs={runLogs} />
      {detail.qa.length > 0 && <ul className="vs-qa">{detail.qa.map((p) => <li key={p}><button onClick={() => setZoom(p)}><img src={fileUrl(p)} alt={p.split("/").pop()} loading="lazy" /><span className="mono">{p.split("/").pop()?.replace(/\.png$/, "")}</span></button></li>)}</ul>}
      {(status === "review" || status === "done") && detail.state.stages.render !== "running" && <FeedbackBox disabled={busy} placeholder="Ví dụ: cảnh 12 đổi Gate sang StopGate; cảnh 20 chữ bị tràn khung…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer">
      <span />
      {status === "review"
        ? <button className="button button-primary" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "scenes" }))}><CheckCircle size={17} />Duyệt dựng cảnh</button>
        : status === "done" ? <span className="privacy-inline"><CheckCircle size={15} />Đã duyệt</span> : <span />}
    </div>
    {zoom && <div className="vs-lightbox" role="dialog" aria-label={zoom} onClick={() => setZoom(null)}>
      <img src={fileUrl(zoom)} alt={zoom} />
      <button className="icon-button" aria-label="Đóng" onClick={() => setZoom(null)}><X size={20} /></button>
    </div>}
  </>;
}

export function RenderStep({ detail, logs, job, busy, act, stop }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.render;
  const deliver = detail.state.stages.deliver;
  const a = detail.artifacts;
  const runLogs = stageLogs(logs, /^Build design system/);
  const ready = detail.state.stages.scenes === "done";
  const files: [string, string | null][] = [["Video MP4", a.mp4], ["Transcript", a.transcript], ["File chương", a.chapters], ["Ghi chú dựng", a.prompts]];
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} />{status === "done" && <><span className="quiet-label">BÀN GIAO</span><StageBadge status={deliver} /></>}</div>
      <JobProgress job={job && ["render", "deliver"].includes(job.kind) ? job : null} onStop={stop} />
      {!ready && <div className="step-empty"><h3>Duyệt phần dựng cảnh trước</h3></div>}
      {a.mp4 && <video className="video-player" src={fileUrl(a.mp4)} controls preload="metadata" />}
      {ready && <div className="render-specs">
        <div><span>Định dạng</span><strong>MP4 · 1920×1080 · 30 fps</strong></div>
        <div><span>Giọng</span><strong>{detail.state.voice.model}</strong></div>
        <div><span>Thời lượng</span><strong className="mono">{formatFrames(detail.cues?.voiceDuration ?? detail.cues?.duration)}</strong></div>
      </div>}
      {status === "error" && <div className="feedback feedback-error"><div><strong>Chưa xong</strong><p>{detail.state.lastError || "Xem nhật ký."}</p></div></div>}
      {ready && <ul className="vs-deliverables">{files.map(([label, path]) => <li key={label}>
        {path ? <CheckCircle size={17} className="is-ok" /> : <span className="vs-dot" />}
        <span>{label}</span>
        {path ? <a className="text-button" href={fileUrl(path)} target="_blank" rel="noreferrer">{path}</a> : <small>chưa có</small>}
      </li>)}</ul>}
      {ready && <button className="button button-primary full-width" disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/render`, {}))}><FilmStrip size={19} />{a.mp4 ? "Render lại" : "Render video"}</button>}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer"><span />{a.mp4 && <a className="text-button" href={dsUrl(`ui_kits/lesson-video/videos/${id}/player.html`)} target="_blank" rel="noreferrer">Mở trình phát<ArrowRight size={15} /></a>}</div>
  </>;
}
