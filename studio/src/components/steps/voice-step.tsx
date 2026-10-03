"use client";

import { useRef, useState } from "react";
import { CheckCircleFilled, CloseOutlined, DeleteOutlined, KeyOutlined, LockOutlined, PauseOutlined, CaretRightFilled, RedoOutlined, SearchOutlined, SoundOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Collapse, Form, Input, InputNumber, Segmented, Select, Tag } from "antd";
import { api, fileUrl, formatFrames } from "@/lib/client";
import type { DryRun, VideoDetail, VoiceSettings, VoiceSource } from "@/lib/types";
import { AgentLog, JobProgress, stageLogs } from "../agent-panel";
import { ProductionState } from "../production-state";
import { useVoiceCatalog, VoicePicker } from "../voice-picker";
import { ImagesPanel } from "./images-panel";
import { post, StepBar, type StepProps } from "./shared";
import { ImportPanel } from "./voice-import";
import { KagglePanel } from "./voice-kaggle";
import { LocalModelPanel } from "./voice-local";

const MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2" },
  { id: "eleven_v3", label: "Eleven v3" },
];
const modelLabel = (id: string) => MODELS.find((m) => m.id === id)?.label ?? id;

const SOURCES: { value: VoiceSource; label: string }[] = [
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "kaggle", label: "Kaggle" },
  { value: "import", label: "Audio có sẵn" },
  { value: "local", label: "Model local" },
];
const sourceLabel = (source: VoiceSource) => SOURCES.find((s) => s.value === source)?.label ?? source;

const VOICE_JOBS = ["voice", "import-scan", "omnivoice-setup", "omnivoice-generate", "align-setup", "kaggle-setup", "kaggle-generate", "voice-retake", "voice-retake-pick"];

/**
 * Who actually reads this video. The cast is not a setting — it comes from the script: every câu names its
 * speaker, and the dry-run (free) is the first place the real line-up can be seen and counted.
 */
function castOf(dry: DryRun | null) {
  const roles = new Map<string, { count: number; avatar: string | null }>();
  for (const c of dry?.cues ?? []) {
    if (!c.speaker) continue;
    const row = roles.get(c.speaker) || { count: 0, avatar: c.avatar };
    roles.set(c.speaker, { count: row.count + 1, avatar: row.avatar || c.avatar });
  }
  return [...roles];
}

function CastChips({ dry }: { dry: DryRun | null }) {
  const roles = castOf(dry);
  if (!roles.length) return null;
  return <ul className="vs-cast-chips" aria-label="Dàn vai">
    {roles.map(([name, { count, avatar }]) => <li key={name}>
      {avatar ? <img src={avatar} alt="" loading="lazy" /> : <TeamOutlined />}
      <span>{name}</span><small>{count} câu</small>
    </li>)}
  </ul>;
}

/**
 * The voice the video has, whatever made it: one card on top of the step, the same for every source.
 * Listening is the check that matters here, so every câu can be played on its own from the master.
 */
function VoiceResult({ detail, redo, onRedo }: { detail: VideoDetail; redo: boolean; onRedo: () => void }) {
  const catalog = useVoiceCatalog();
  const master = useRef<HTMLAudioElement>(null);
  const stopAt = useRef<number | null>(null);
  const [playing, setPlaying] = useState<number | null>(null);
  const bound = detail.state.voiceBound;
  const source = bound?.source ?? detail.state.voice.source;
  const voiceId = bound?.voiceId ?? detail.state.voice.voiceId;
  const model = bound?.model ?? detail.state.voice.model;
  const cast = castOf(detail.dryRun);
  const reader = cast.length > 1
    ? `${cast.length} nhân vật`
    : catalog?.voices.find((v) => v.id === voiceId)?.name ?? (cast[0]?.[0] || voiceId || "—");
  const cues = detail.cues?.cues.filter((c) => !c.silent && c.text.trim()) ?? [];

  const playCue = (n: number) => {
    const audio = master.current;
    const cue = cues.find((c) => c.n === n);
    if (!audio || !cue) return;
    if (playing === n) { audio.pause(); return; }
    audio.currentTime = cue.start / 30;
    stopAt.current = cue.end / 30;
    setPlaying(n);
    void audio.play();
  };

  return <section className="vs-voice-result" aria-labelledby="vs-voice-result-title">
    <h3 id="vs-voice-result-title">Giọng của video</h3>
    <dl className="vs-voice-facts">
      <div><dt>Nguồn</dt><dd>{sourceLabel(source)}</dd></div>
      <div><dt>Người đọc</dt><dd>{reader}</dd></div>
      {source === "elevenlabs" && <div><dt>Model</dt><dd>{modelLabel(model)}</dd></div>}
      <div><dt>Thời lượng</dt><dd className="mono">{formatFrames(detail.cues?.voiceDuration)}</dd></div>
      <div><dt>Mốc từng từ</dt><dd>{detail.cues?.wordTimings ? "Có" : "Chưa có"}</dd></div>
    </dl>
    {cast.length > 1 && <CastChips dry={detail.dryRun} />}
    <audio
      ref={master}
      className="vs-voice-master"
      controls
      preload="metadata"
      src={fileUrl(detail.artifacts.voiceWav!)}
      onTimeUpdate={(e) => {
        if (stopAt.current !== null && e.currentTarget.currentTime >= stopAt.current) {
          stopAt.current = null;
          e.currentTarget.pause();
        }
      }}
      onPause={() => { setPlaying(null); stopAt.current = null; }}
    />
    {cues.length > 0 && <Collapse className="vs-voice-cues" size="small" items={[{
      key: "cues",
      label: <span>Nghe từng câu <span className="quiet-label">{cues.length} câu</span></span>,
      children: <ol>{cues.map((c) => <li key={c.n}>
        <Button type="text" size="small" shape="circle" aria-label={`${playing === c.n ? "Dừng" : "Nghe"} câu ${c.n}`} icon={playing === c.n ? <PauseOutlined /> : <CaretRightFilled />} onClick={() => playCue(c.n)} />
        <span className="mono vs-voice-cue-n">{String(c.n).padStart(2, "0")}</span>
        <span className="vs-voice-cue-text">{c.text}</span>
        <span className="mono vs-voice-cue-time">{formatFrames(c.start)}</span>
      </li>)}</ol>,
    }]} />}
    <div className="vs-voice-redo">
      <Button size="small" icon={redo ? <CloseOutlined /> : <RedoOutlined />} onClick={onRedo}>{redo ? "Đóng cấu hình" : "Làm lại giọng…"}</Button>
      {!redo && <small>Mở lại phần cấu hình. Chưa tốn credit cho tới khi bấm Tạo giọng.</small>}
    </div>
  </section>;
}

function ElevenLabsPanel({ detail, settings, setSettings, busy, act, hasKey, setHasKey }: {
  detail: VideoDetail;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  busy: boolean;
  act: StepProps["act"];
  hasKey: boolean;
  setHasKey: (v: boolean) => void;
}) {
  const id = detail.state.id;
  const catalog = useVoiceCatalog();
  const [dry, setDry] = useState<DryRun | null>(detail.dryRun);
  const [checked, setChecked] = useState<string>(detail.dryRun ? JSON.stringify(detail.state.voice) : "");
  const [key, setKey] = useState("");
  const fresh = !!dry && checked === JSON.stringify(settings);
  const locked = !hasKey || !fresh;
  const customId = !!catalog && !!settings.voiceId && !catalog.voices.some((v) => v.id === settings.voiceId);
  const saveKey = () => act(async () => { await api("/api/voice-key", { method: "POST", json: { key } }); setHasKey(true); setKey(""); });
  const check = () => act(async () => {
    setDry(await api<DryRun>(`/api/videos/${id}/voice`, { method: "POST", json: { action: "dry-run", settings } }));
    setChecked(JSON.stringify(settings));
  });
  const tuned = [modelLabel(settings.model), settings.language === "vi" ? "Tiếng Việt" : "Tự nhận", `nghỉ ${String(settings.pause).replace(".", ",")}s`, customId ? "ID riêng" : null].filter(Boolean).join(" · ");

  return <ol className="vs-flow">
    <li className="vs-flow-step">
      <span className="vs-flow-num">1</span>
      <div className="vs-flow-body">
        <h4>Chọn giọng</h4>
        <VoicePicker value={settings.voiceId} onChange={(voiceId) => setSettings({ ...settings, voiceId })} disabled={busy} custom={false} />
        <Collapse className="vs-flow-more" size="small" defaultActiveKey={customId ? ["tune"] : []} items={[{
          key: "tune",
          label: <span>Tuỳ chỉnh <span className="quiet-label">{tuned}</span></span>,
          children: <div className="vs-tune">
            <div className="field-grid vs-grid-3">
              <Form.Item className="field" label="Model"><Select disabled={busy} value={settings.model} onChange={(model) => setSettings({ ...settings, model })} options={MODELS.map((model) => ({ value: model.id, label: model.label }))} /></Form.Item>
              <Form.Item className="field" label="Ngôn ngữ"><Select disabled={busy} value={settings.language} onChange={(language) => setSettings({ ...settings, language })} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "auto", label: "Tự nhận (v3)" }]} /></Form.Item>
              <Form.Item className="field" label="Nghỉ giữa câu (giây)"><InputNumber disabled={busy} min={0} max={5} step={0.1} value={settings.pause} onChange={(pause) => setSettings({ ...settings, pause: pause ?? 0 })} /></Form.Item>
            </div>
            <Form.Item className="field" label="Voice ID khác" extra="Giọng chưa có trong voices.json — dán voice id lấy từ ElevenLabs.">
              <Input value={customId ? settings.voiceId : ""} onChange={(e) => setSettings({ ...settings, voiceId: e.target.value.trim() })} disabled={busy} placeholder="Ví dụ 6adFm46eyy74snVn6YrT" spellCheck={false} autoComplete="off" />
            </Form.Item>
          </div>,
        }]} />
        <div className="vs-key-line">
          <KeyOutlined />
          {hasKey
            ? <><span>Key ElevenLabs đã nhập</span><Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => act(async () => { await api("/api/voice-key", { method: "DELETE" }); setHasKey(false); })}>Xoá key</Button></>
            : <><Input.Password className="vs-key-field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API key ElevenLabs" aria-label="API key ElevenLabs" autoComplete="off" spellCheck={false} /><Button disabled={!key.trim() || busy} onClick={saveKey}>Dùng key</Button></>}
        </div>
      </div>
    </li>
    <li className="vs-flow-step">
      <span className={`vs-flow-num ${fresh ? "is-done" : ""}`}>{fresh ? <CheckCircleFilled /> : 2}</span>
      <div className="vs-flow-body">
        <h4>Kiểm tra <span className="vs-flow-hint">miễn phí · chưa gửi gì lên ElevenLabs</span></h4>
        <div className="vs-dry">
          <Button disabled={busy || !settings.voiceId} icon={<SearchOutlined />} onClick={check}>{dry ? "Kiểm tra lại" : "Kiểm tra"}</Button>
          {dry && <div className={`vs-dry-result ${fresh ? "" : "is-stale"}`}>
            <strong>{dry.cues.length} câu · {dry.cues.filter((c) => c.cached).length} có sẵn trong cache · {dry.toGenerate} câu mới · {dry.billable.toLocaleString("vi-VN")} ký tự sẽ gửi</strong>
            {!fresh && <small>Cài đặt đã đổi, bấm Kiểm tra lại.</small>}
          </div>}
        </div>
        <CastChips dry={dry} />
      </div>
    </li>
    <li className="vs-flow-step">
      <span className="vs-flow-num">3</span>
      <div className="vs-flow-body">
        <h4>Tạo giọng</h4>
        <p className="vs-flow-note">Gửi các câu mới lên ElevenLabs, ghép thành một bản thu rồi đo mốc từng từ.</p>
        <Button type="primary" disabled={locked || busy} icon={locked ? <LockOutlined /> : <SoundOutlined />} onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "generate" }))}>
          {!hasKey ? "Nhập key trước" : !fresh ? "Kiểm tra trước" : dry.billable === 0 ? "Ghép giọng từ cache" : `Tạo giọng · ${dry.billable.toLocaleString("vi-VN")} ký tự`}
        </Button>
      </div>
    </li>
  </ol>;
}

export function VoiceStep({ detail, logs, job, busy, act, stop, nav, refresh, hasKey, setHasKey }: StepProps & { hasKey: boolean; setHasKey: (v: boolean) => void }) {
  const status = detail.state.stages.voice;
  const [settings, setSettings] = useState<VoiceSettings>(detail.state.voice);
  // A server-side job can change the voice settings, so take them over when they change — by value. Every
  // refresh brings a new object (the image panel refreshes every 3 s while its job runs), and following
  // the object reset the folder, voice or pause the user had just picked before they could use it.
  const serverVoice = JSON.stringify(detail.state.voice);
  const [seenVoice, setSeenVoice] = useState(serverVoice);
  if (seenVoice !== serverVoice) {
    setSeenVoice(serverVoice);
    setSettings(detail.state.voice);
  }
  // Which source's setup is on screen. Looking is not choosing: the source is saved by the action that
  // uses it (dry-run, scan, generate, import), never by clicking a tab.
  const [view, setView] = useState<VoiceSource>(detail.state.voiceBound?.source ?? detail.state.voice.source);
  const [redo, setRedo] = useState(false);
  const cuesApproved = detail.state.stages.cues === "done";
  const hasVoice = Boolean(detail.artifacts.voiceWav && detail.artifacts.voice);
  const configOpen = !hasVoice || redo || status === "running" || status === "error";
  const runLogs = stageLogs(logs, ["voice"]);
  // Những bước đã làm trên giọng đang gắn — làm lại giọng thì chúng mở lại (lib/server/voice.ts → reopenAfterVoice).
  const builtOnVoice = [
    ["review", "done"].includes(detail.state.stages.scenes) ? "Cảnh đã dựng" : null,
    detail.state.stages.render === "done" ? "MP4 đã render" : null,
  ].filter((x): x is string => x !== null);
  const panel = { detail, settings: { ...settings, source: view }, setSettings, busy, act };

  return <>
    <div className="vs-step-body">
      {!cuesApproved && <div className="step-empty"><h3>Duyệt lời & cue trước</h3></div>}
      {cuesApproved && <>
        {hasVoice && <VoiceResult detail={detail} redo={redo} onRedo={() => setRedo((open) => !open)} />}
        {configOpen && hasVoice && builtOnVoice.length > 0 && <Alert type="warning" showIcon
          title={`${builtOnVoice.join(" và ")} đang theo giọng hiện tại.`}
          description="Gắn giọng mới là ghi lại mốc của từng câu. Khi giọng mới gắn xong, bước Dựng cảnh mở lại để soát theo nhịp mới và video phải render lại. Giọng cũ vẫn được dùng cho tới lúc đó." />}
        {configOpen && <>
          <div className="vs-source-row">
            <span className="quiet-label">Nguồn giọng</span>
            <Segmented className="vs-source" aria-label="Nguồn giọng đọc" value={view} onChange={(value) => setView(value as VoiceSource)} options={SOURCES} />
          </div>
          {/* Labels stack above their field, as in the plan form; without it antd lays them out inline. */}
          <Form layout="vertical" requiredMark={false} component={false}>
            {view === "local" ? <LocalModelPanel {...panel} />
              : view === "kaggle" ? <KagglePanel {...panel} />
              : view === "import" ? <ImportPanel {...panel} />
              : <ElevenLabsPanel {...panel} hasKey={hasKey} setHasKey={setHasKey} />}
          </Form>
        </>}
        <JobProgress job={job && VOICE_JOBS.includes(job.kind) ? job : null} onStop={stop} />
        {status === "error" && <ProductionState className="vs-production-state" status="error" title="Chưa xong" detail={detail.state.lastError || "Xem nhật ký."} />}
        <AgentLog logs={runLogs} open={status === "running"} />
      </>}
      {/* Ảnh được chọn trong lúc giọng đang thu: hai việc không phụ thuộc nhau. */}
      <ImagesPanel detail={detail} act={act} refresh={refresh} />
    </div>
    <StepBar
      nav={nav}
      tone={status === "done" ? "done" : status === "running" ? "running" : status === "error" ? "error" : "idle"}
      status={status === "done" ? <>Giọng đã gắn vào video{hasVoice && <Tag className="vs-step-bar-tag"><CheckCircleFilled /> {formatFrames(detail.cues?.voiceDuration)}</Tag>}</>
        : status === "running" ? "Đang làm giọng…"
        : status === "error" ? "Chưa gắn được giọng"
        : cuesApproved ? "Chưa có giọng" : "Chờ duyệt lời & cue"}
    />
  </>;
}
