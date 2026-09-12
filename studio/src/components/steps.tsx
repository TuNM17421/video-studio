"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightOutlined, CheckCircleFilled, TeamOutlined, CopyOutlined, DeleteOutlined, ImportOutlined, KeyOutlined, LeftOutlined, LockOutlined, PlayCircleFilled, RightOutlined, SearchOutlined, SoundOutlined } from "@ant-design/icons";
import { Alert, Button, Checkbox, Empty, Form, Input, InputNumber, Modal, Pagination, Segmented, Select, Tag } from "antd";
import { api, dsUrl, fileUrl, formatFrames } from "@/lib/client";
import { NO_MUSIC, type MusicCatalog } from "@/lib/music";
import type { DryRun, ImportReport, JobInfo, LogEntry, VideoDetail, VoiceScript, VoiceSettings } from "@/lib/types";
import { AgentLog, AgentSummary, FeedbackBox, JobProgress, StageBadge, stageLogs } from "./agent-panel";
import { ConfirmDialog } from "./confirm-dialog";
import { MusicPicker } from "./music-picker";
import { SourcePickerField } from "./source-picker";
import { VoicePicker } from "./voice-picker";

export interface StepProps {
  detail: VideoDetail;
  logs: LogEntry[];
  job: JobInfo | null;
  busy: boolean;
  act: (fn: () => Promise<unknown>) => Promise<void>;
  stop: () => void;
}

const post = (url: string, json: unknown) => api(url, { method: "POST", json });

const QA_PAGE_SIZE = 24;

interface QaItem {
  path: string;
  file: string;
  scene: number | null;
  frame: number | null;
}

function qaItem(path: string): QaItem {
  const file = path.split("/").pop() || path;
  const match = file.match(/^s(\d+)(?:-f(\d+))?\.(?:png|jpe?g)$/i);
  return {
    path,
    file,
    scene: match ? Number(match[1]) : null,
    frame: match?.[2] ? Number(match[2]) : null,
  };
}

function sceneLabel(scene: number) {
  return `Cảnh ${String(scene).padStart(2, "0")}`;
}

function QaLightbox({ items, index, onClose, onMove }: { items: QaItem[]; index: number; onClose: () => void; onMove: (index: number) => void }) {
  const actionsRef = useRef({ onClose, onMove, index, length: items.length });
  const item = items[index];

  useEffect(() => {
    actionsRef.current = { onClose, onMove, index, length: items.length };
  }, [index, items.length, onClose, onMove]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = actionsRef.current;
      if (event.key === "ArrowLeft" && current.index > 0) {
        event.preventDefault();
        current.onMove(current.index - 1);
        return;
      }
      if (event.key === "ArrowRight" && current.index < current.length - 1) {
        event.preventDefault();
        current.onMove(current.index + 1);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return <Modal className="vs-lightbox-dialog" open centered width="min(1180px, 92vw)" footer={null} onCancel={() => actionsRef.current.onClose()} title={<div><span className="quiet-label">ẢNH QA · {index + 1}/{items.length}</span><h2>{item.scene === null ? "Ảnh kiểm tra tổng" : sceneLabel(item.scene)}{item.frame === null ? "" : ` · frame ${item.frame}`}</h2></div>}>
      <div className="vs-lightbox-image">
        <Button type="text" className="vs-lightbox-nav is-previous" aria-label="Ảnh QA trước" disabled={index === 0} icon={<LeftOutlined />} onClick={() => actionsRef.current.onMove(index - 1)} />
        <img src={fileUrl(item.path)} alt={`Ảnh QA ${item.scene === null ? item.file : sceneLabel(item.scene)}`} />
        <Button type="text" className="vs-lightbox-nav is-next" aria-label="Ảnh QA tiếp theo" disabled={index === items.length - 1} icon={<RightOutlined />} onClick={() => actionsRef.current.onMove(index + 1)} />
      </div>
      <div className="vs-lightbox-file mono">{item.file}</div>
  </Modal>;
}

function QaGallery({ paths }: { paths: string[] }) {
  const [mode, setMode] = useState<"keyframes" | "all">("keyframes");
  const [scene, setScene] = useState("all");
  const [page, setPage] = useState(0);
  const [zoomPath, setZoomPath] = useState<string | null>(null);
  const items = useMemo(() => paths.map(qaItem), [paths]);
  const scenes = useMemo(() => [...new Set(items.flatMap((item) => item.scene === null ? [] : [item.scene]))].sort((a, b) => a - b), [items]);
  const hasOther = items.some((item) => item.scene === null);
  const keyframes = useMemo(() => {
    const byScene = new Map<number, QaItem>();
    const other: QaItem[] = [];
    for (const item of items) {
      if (item.scene === null) {
        other.push(item);
        continue;
      }
      const current = byScene.get(item.scene);
      if (!current || (current.frame !== null && item.frame === null)) byScene.set(item.scene, item);
    }
    return [...byScene.values(), ...other];
  }, [items]);
  const filtered = useMemo(() => {
    const source = mode === "keyframes" ? keyframes : items;
    if (scene === "all") return source;
    if (scene === "other") return source.filter((item) => item.scene === null);
    return source.filter((item) => item.scene === Number(scene));
  }, [items, keyframes, mode, scene]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / QA_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * QA_PAGE_SIZE, (safePage + 1) * QA_PAGE_SIZE);
  const first = filtered.length ? safePage * QA_PAGE_SIZE + 1 : 0;
  const last = Math.min((safePage + 1) * QA_PAGE_SIZE, filtered.length);
  const zoomIndex = zoomPath === null ? -1 : filtered.findIndex((item) => item.path === zoomPath);
  const changeMode = (next: "keyframes" | "all") => { setMode(next); setPage(0); setZoomPath(null); };
  const changeScene = (next: string) => { setScene(next); setPage(0); setZoomPath(null); };

  return <section className="vs-qa-section" aria-labelledby="qa-gallery-title">
    <div className="vs-qa-toolbar">
      <div>
        <h3 id="qa-gallery-title">Kiểm tra khung hình</h3>
        <p>Ảnh xuất từ từng cảnh để rà chữ, bố cục và trạng thái animation.</p>
      </div>
      <Segmented className="vs-qa-mode" aria-label="Chế độ hiển thị ảnh QA" value={mode} onChange={(value) => changeMode(value as "keyframes" | "all")} options={[{ value: "keyframes", label: "Ảnh chính" }, { value: "all", label: "Mọi frame" }]} />
      <label className="vs-qa-filter">Cảnh<Select value={scene} onChange={changeScene} options={[{ value: "all", label: "Tất cả cảnh" }, ...scenes.map((value) => ({ value: String(value), label: sceneLabel(value) })), ...(hasOther ? [{ value: "other", label: "Ảnh kiểm tra tổng" }] : [])]} /></label>
      <span className="vs-qa-count" aria-live="polite">Hiển thị {first}–{last} / {filtered.length}</span>
    </div>
    <ul className="vs-qa">{visible.map((item) => <li key={item.path}><Button type="text" title={item.file} aria-label={`Mở ${item.scene === null ? item.file : sceneLabel(item.scene)}`} onClick={() => setZoomPath(item.path)}><img src={fileUrl(item.path)} alt="" loading="lazy" /><span><strong>{item.scene === null ? "Ảnh tổng" : sceneLabel(item.scene)}</strong><small>{item.frame === null ? item.file.replace(/\.(?:png|jpe?g)$/i, "") : `frame ${String(item.frame).padStart(3, "0")}`}</small></span></Button></li>)}</ul>
    {pageCount > 1 && <nav className="vs-qa-pagination" aria-label="Phân trang ảnh QA">
      <Pagination simple current={safePage + 1} pageSize={QA_PAGE_SIZE} total={filtered.length} showSizeChanger={false} onChange={(next) => setPage(next - 1)} />
    </nav>}
    {zoomIndex >= 0 && <QaLightbox items={filtered} index={zoomIndex} onClose={() => setZoomPath(null)} onMove={(next) => setZoomPath(filtered[next].path)} />}
  </section>;
}

function CueList({ detail }: { detail: VideoDetail }) {
  const info = detail.cues;
  if (!info?.cues.length) return null;
  return <div className="scene-list vs-cue-list">{info.cues.map((c, index) => {
    const previousSection = info.cues[index - 1]?.section ?? null;
    const header = c.section !== null && c.section !== previousSection ? info.sections[(c.section ?? 1) - 1] : null;
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

/**
 * The locked narration, exported so it can be read aloud or fed to a local model. The files land in
 * projects/<id>/voice-script/; voice-batch.jsonl is already in the shape OmniVoice's batch CLI wants,
 * so its results come back named 01.wav, 02.wav … and import with no renaming.
 */
function ScriptExport({ detail, busy, act }: { detail: VideoDetail; busy: boolean; act: StepProps["act"] }) {
  const id = detail.state.id;
  const [script, setScript] = useState<VoiceScript | null>(null);
  const [copied, setCopied] = useState(false);
  const written = script !== null || detail.artifacts.voiceScript;
  const dir = `projects/${id}/voice-script`;
  const files: [string, string][] = [
    ["Bản đọc (Markdown)", "doc-thu.md"],
    ["Lời thuần (TXT)", "doc-thu.txt"],
    ["Batch cho model local (JSONL)", "voice-batch.jsonl"],
  ];
  const write = () => act(async () => setScript(await post(`/api/videos/${id}/voice`, { action: "export-script" }) as VoiceScript));
  const copy = () => act(async () => {
    const result = script ?? (await post(`/api/videos/${id}/voice`, { action: "export-script" }) as VoiceScript);
    setScript(result);
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
  });

  return <section className="vs-script" aria-labelledby="script-export-title">
    <div className="vs-script-head">
      <div>
        <h3 id="script-export-title">Lời đọc để thu ngoài</h3>
        <p>Gửi cho người đọc, hoặc đưa vào model local rồi nhập audio ngược lại ở bước Giọng đọc.</p>
      </div>
      <div className="vs-script-actions">
        <Button disabled={busy} icon={<CopyOutlined />} onClick={copy}>{copied ? "Đã copy" : "Copy lời đọc"}</Button>
        <Button type="primary" disabled={busy} icon={<ImportOutlined />} onClick={write}>{written ? "Xuất lại" : "Xuất ra tệp"}</Button>
      </div>
    </div>
    {written && <ul className="vs-deliverables">
      {files.map(([label, file]) => <li key={file}>
        <CheckCircleFilled className="is-ok" />
        <span>{label}</span>
        <Button type="link" href={fileUrl(`${dir}/${file}`)} target="_blank">{file}</Button>
      </li>)}
      <li><CheckCircleFilled className="is-ok" /><span>Mỗi câu một tệp .txt</span><small className="mono">{dir}/cau/</small></li>
    </ul>}
    {script && <p className="vs-script-note">{script.spoken}/{script.cues} câu cần thu · đặt tên audio theo số câu: <span className="mono">01.wav, 02.wav …</span></p>}
  </section>;
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
      {status === "idle" && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy"><Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }))}>Chạy agent</Button></Empty>}
      {status === "error" && <Alert className="feedback" type="error" showIcon title="Chưa xong" description={detail.state.lastError || "Xem nhật ký."} action={<Button disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "cues" }))}>Chạy lại</Button>} />}
      <AgentSummary logs={runLogs} />
      <CueList detail={detail} />
      {status === "done" && <ScriptExport detail={detail} busy={busy} act={act} />}
      {(status === "review" || (status === "done" && !voiced)) && <FeedbackBox disabled={busy} placeholder="Ví dụ: tách câu 12 thành hai câu; đổi tên nhân vật Minh thành Dũng…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "cues", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer">
      <span />
      {status === "review"
        ? <Button type="primary" disabled={busy} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "cues" }))}>Duyệt lời & cue</Button>
        : status === "done" ? <Tag color="success" icon={<CheckCircleFilled />}>Đã duyệt</Tag> : <span />}
    </div>
  </>;
}

const MODELS = [
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5" },
  { id: "eleven_multilingual_v2", label: "Multilingual v2" },
  { id: "eleven_v3", label: "Eleven v3" },
];

const SOURCES = [
  { value: "elevenlabs", label: "Tạo bằng ElevenLabs" },
  { value: "import", label: "Nhập audio có sẵn" },
];

/** Whether a scan still describes the folder on screen — same rule as the ElevenLabs dry-run. */
const scanKey = (s: VoiceSettings) => JSON.stringify([s.importDir, s.pause]);

/** One decimal, Vietnamese comma — 4.86 and 22.8 should not read as different kinds of number. */
const seconds = (v: number) => `${v.toFixed(1).replace(".", ",")}s`;

/** Below this share of the câu's words, spokenAt() is mostly interpolating rather than measuring. */
const WEAK_MATCH = 0.65;

/**
 * Narration recorded by a member or made by a local model: one audio file per câu in one folder.
 *
 * The report is the whole point of this panel. A folder that is quietly off by one — a câu skipped
 * while recording, the rest shifted up — reaches the MP4 looking fine, so every file is shown against
 * the câu it landed on, with how much of that câu's words were actually heard in it.
 */
function ImportPanel({ detail, settings, setSettings, busy, act }: {
  detail: VideoDetail;
  settings: VoiceSettings;
  setSettings: (v: VoiceSettings) => void;
  busy: boolean;
  act: StepProps["act"];
}) {
  const id = detail.state.id;
  const [report, setReport] = useState<ImportReport | null>(detail.importReport);
  const [scanned, setScanned] = useState(detail.importReport ? scanKey(detail.state.voice) : "");
  const [force, setForce] = useState(false);
  const master = useRef<HTMLAudioElement>(null);
  const fresh = !!report && scanned === scanKey(settings);
  const problems = report?.rows.filter((r) => r.level === "error").length ?? 0;
  const warnings = report?.rows.filter((r) => r.level === "warn").length ?? 0;
  const bound = detail.artifacts.voice ? detail.cues?.cues ?? [] : [];

  const scan = () => act(async () => {
    const result = await post(`/api/videos/${id}/voice`, { action: "scan-import", settings }) as ImportReport;
    setReport(result);
    setScanned(scanKey(settings));
    setForce(false);
  });
  const play = (n: number) => {
    const cue = bound.find((c) => c.n === n);
    const audio = master.current;
    if (!cue || !audio) return;
    audio.currentTime = cue.start / 30;
    void audio.play();
  };

  return <>
    <SourcePickerField label="Thư mục audio" purpose="voice" value={settings.importDir} disabled={busy} onChange={(importDir) => setSettings({ ...settings, importDir })} />
    <div className="vs-import-run">
      <Form.Item className="field" label="Nghỉ giữa câu (giây)"><InputNumber min={0} max={5} step={0.1} value={settings.pause} onChange={(pause) => setSettings({ ...settings, pause: pause ?? 0 })} /></Form.Item>
      <div className="vs-import-action">
      <Button disabled={busy || !settings.importDir.trim()} icon={<SearchOutlined />} onClick={scan}>Kiểm tra thư mục</Button>
      {report && <p className={`vs-import-summary ${fresh ? (problems ? "is-error" : warnings ? "is-warn" : "is-ok") : "is-stale"}`}>
        <strong>{report.matched}/{report.needFile} câu có file</strong>
        {problems > 0 && <span> · {problems} lỗi</span>}
        {warnings > 0 && <span> · {warnings} cảnh báo</span>}
        {problems === 0 && warnings === 0 && <span> · không có vấn đề</span>}
        {report.align.used && <small>Đối chiếu nội dung bằng Whisper {report.align.model}</small>}
        {!fresh && <small>Thư mục hoặc khoảng nghỉ đã đổi — bấm Kiểm tra lại.</small>}
      </p>}
      </div>
    </div>
    {report?.align.note && <Alert className="feedback" type="warning" showIcon message={report.align.note} />}
    {report && <div className="vs-map">
      <div className={`vs-map-row is-head ${bound.length ? "has-play" : ""}`}>
        <span>Câu</span><span>Tệp</span><span>Lời</span><span>Dài</span><span>Khớp</span>{bound.length > 0 && <span className="vs-map-play-head" />}
      </div>
      {report.rows.map((r) => {
        // The silent row's only note repeats what its own text column already says.
        const notes = r.silent ? [] : r.notes;
        const weak = r.matchRatio != null && r.matchRatio < WEAK_MATCH;
        return <div key={r.n} className={`vs-map-row is-${r.level} ${bound.length ? "has-play" : ""}`}>
          <span className="vs-map-key mono">{r.key}</span>
          <span className={`vs-map-file ${r.silent ? "is-none" : "mono"}`} title={r.file || undefined}>{r.file ?? (r.silent ? "không cần" : "—")}</span>
          <span className="vs-map-text" title={r.silent ? undefined : r.text}>{r.silent ? `Khoảng dừng ${r.expectedSeconds} giây` : r.text}</span>
          <span className="vs-map-len mono">{r.seconds != null ? seconds(r.seconds) : "—"}</span>
          <span className={`vs-map-match mono ${weak ? "is-weak" : ""}`}>{r.matchRatio != null ? `${Math.round(r.matchRatio * 100)}%` : "—"}</span>
          {bound.length > 0 && <span className="vs-map-play">{!r.silent && <Button type="text" size="small" aria-label={`Nghe câu ${r.key}`} icon={<PlayCircleFilled />} onClick={() => play(r.n)} />}</span>}
          {notes.length > 0 && <span className="vs-map-notes">{notes.join(" · ")}</span>}
        </div>;
      })}
    </div>}
    {report && (report.extra.length > 0 || report.clashes.length > 0) && <ul className="vs-map-aside">
      {report.extra.map((e) => <li key={e.file}>Thừa: <span className="mono">{e.file}</span> — {e.reason}</li>)}
      {report.clashes.map((c) => <li key={c.file}>Câu {c.n} trùng: dùng <span className="mono">{c.kept}</span>, bỏ qua <span className="mono">{c.file}</span></li>)}
    </ul>}
    {detail.artifacts.voiceWav && <div className="audio-result vs-audio">
      <div><span><CheckCircleFilled />Giọng đã gắn vào video · {formatFrames(detail.cues?.voiceDuration)}{detail.cues?.wordTimings ? " · có mốc từng từ" : " · chưa có mốc từng từ"}</span></div>
      <audio ref={master} controls src={fileUrl(detail.artifacts.voiceWav)} preload="none" />
    </div>}
    {fresh && problems > 0 && <Checkbox className="vs-force" checked={force} onChange={(e) => setForce(e.target.checked)}>
      Vẫn nhập dù {problems} câu có vấn đề — tôi đã nghe lại và chấp nhận
    </Checkbox>}
    <Button type="primary" block disabled={busy || !fresh || (problems > 0 && !force)} icon={fresh && (problems === 0 || force) ? <ImportOutlined /> : <LockOutlined />}
      onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "import", force }))}>
      {!fresh ? "Kiểm tra thư mục trước" : `${detail.artifacts.voice ? "Nhập lại giọng" : "Nhập giọng"} · ${report?.matched ?? 0} câu`}
    </Button>
  </>;
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
  const [dry, setDry] = useState<DryRun | null>(detail.dryRun);
  const [checked, setChecked] = useState<string>(detail.dryRun ? JSON.stringify(detail.state.voice) : "");
  const [key, setKey] = useState("");
  const fresh = !!dry && checked === JSON.stringify(settings);
  const locked = !hasKey || !fresh;
  const saveKey = () => act(async () => { await api("/api/voice-key", { method: "POST", json: { key } }); setHasKey(true); setKey(""); });
  const check = () => act(async () => {
    setDry(await api<DryRun>(`/api/videos/${id}/voice`, { method: "POST", json: { action: "dry-run", settings } }));
    setChecked(JSON.stringify(settings));
  });

  return <>
    <div className="vs-key-row">
      <KeyOutlined />
      {hasKey
        ? <><Tag color="success" className="vs-key-on">Đã nhập key</Tag><Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => act(async () => { await api("/api/voice-key", { method: "DELETE" }); setHasKey(false); })}>Xoá key</Button></>
        : <><Input.Password className="vs-key-field" value={key} onChange={(e) => setKey(e.target.value)} placeholder="API key ElevenLabs" aria-label="API key ElevenLabs" autoComplete="off" spellCheck={false} /><Button disabled={!key.trim() || busy} onClick={saveKey}>Dùng key</Button></>}
    </div>
    <Form.Item className="field vs-voice-field" label="Giọng đọc">
      <VoicePicker value={settings.voiceId} onChange={(voiceId) => setSettings({ ...settings, voiceId })} disabled={busy} />
    </Form.Item>
    <div className="field-grid vs-grid-3">
      <Form.Item className="field" label="Model"><Select value={settings.model} onChange={(model) => setSettings({ ...settings, model })} options={MODELS.map((model) => ({ value: model.id, label: model.label }))} /></Form.Item>
      <Form.Item className="field" label="Ngôn ngữ"><Select value={settings.language} onChange={(language) => setSettings({ ...settings, language })} options={[{ value: "vi", label: "Tiếng Việt" }, { value: "auto", label: "Tự nhận (v3)" }]} /></Form.Item>
      <Form.Item className="field" label="Nghỉ giữa câu (giây)"><InputNumber min={0} max={5} step={0.1} value={settings.pause} onChange={(pause) => setSettings({ ...settings, pause: pause ?? 0 })} /></Form.Item>
    </div>
    <div className="vs-dry">
      <Button disabled={busy || !settings.voiceId} icon={<SearchOutlined />} onClick={check}>Kiểm tra</Button>
      {dry && <div className={`vs-dry-result ${fresh ? "" : "is-stale"}`}>
        <strong>{dry.cues.length} câu · {dry.cues.filter((c) => c.cached).length} có sẵn trong cache · {dry.toGenerate} câu mới · {dry.billable.toLocaleString("vi-VN")} ký tự sẽ gửi</strong>
        {!fresh && <small>Cài đặt đã đổi, bấm Kiểm tra lại.</small>}
      </div>}
    </div>
    <Cast dry={dry} />
    <div className="vs-dry">
    </div>
    {detail.artifacts.voiceWav && <div className="audio-result vs-audio"><div><span><CheckCircleFilled />Giọng đã gắn vào video · {formatFrames(detail.cues?.voiceDuration)}{detail.cues?.wordTimings ? " · có mốc từng từ" : ""}</span></div><audio controls src={fileUrl(detail.artifacts.voiceWav)} preload="none" /></div>}
    <Button type="primary" block disabled={locked || busy} icon={locked ? <LockOutlined /> : <SoundOutlined />} onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "generate" }))}>
      {dry && fresh && dry.billable === 0 ? "Ghép giọng từ cache" : `Tạo giọng${dry && fresh ? ` · ${dry.toGenerate} câu, ${dry.billable.toLocaleString("vi-VN")} ký tự` : ""}`}
    </Button>
  </>;
}

/**
 * Who actually reads this video. The cast is not a setting — it comes from the script: every câu names its
 * speaker, and the dry-run (free) is the first place the real line-up can be seen and counted.
 */
function Cast({ dry }: { dry: DryRun | null }) {
  if (!dry) return null;
  const roles = new Map<string, { count: number; avatar: string | null }>();
  for (const c of dry.cues) {
    if (!c.speaker) continue;
    const row = roles.get(c.speaker) || { count: 0, avatar: c.avatar };
    roles.set(c.speaker, { count: row.count + 1, avatar: row.avatar || c.avatar });
  }
  if (!roles.size) return null;
  return <div className="vs-cast">
    <strong><TeamOutlined />Dàn vai · {roles.size} nhân vật</strong>
    <ul>
      {[...roles].map(([name, { count, avatar }]) => <li key={name}>
        {avatar ? <img src={avatar} alt="" loading="lazy" /> : null}
        <span>{name}</span><small>{count} câu</small>
      </li>)}
    </ul>
    <small>Lấy từ `speaker` của từng câu trong cues.js. Đổi vai thì sửa kịch bản, không sửa ở đây.</small>
  </div>;
}

export function VoiceStep({ detail, logs, job, busy, act, stop, hasKey, setHasKey }: StepProps & { hasKey: boolean; setHasKey: (v: boolean) => void }) {
  const id = detail.state.id;
  const status = detail.state.stages.voice;
  const [settings, setSettings] = useState<VoiceSettings>(detail.state.voice);
  // Voice settings can change after a server-side job refreshes this video.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSettings(detail.state.voice); }, [detail.state.voice]);
  const cuesApproved = detail.state.stages.cues === "done";
  const runLogs = stageLogs(logs, /^Tạo giọng ·|^Nhập giọng ·/);
  const panel = { detail, settings, setSettings, busy, act };
  /** Remember the choice server-side, so a reload does not drop the member back onto the API tab. */
  const changeSource = (source: VoiceSettings["source"]) => {
    setSettings({ ...settings, source });
    void act(() => post(`/api/videos/${id}/voice`, { action: "source", settings: { ...settings, source } }));
  };

  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} /></div>
      {!cuesApproved && <div className="step-empty"><h3>Duyệt lời & cue trước</h3></div>}
      {cuesApproved && <>
        <Segmented className="vs-source" aria-label="Nguồn giọng đọc" value={settings.source} onChange={(value) => changeSource(value as VoiceSettings["source"])} options={SOURCES} block />
        {/* Labels stack above their field, as in the plan form; without it antd lays them out inline. */}
        <Form layout="vertical" requiredMark={false} component={false}>
          {settings.source === "import"
            ? <ImportPanel {...panel} />
            : <ElevenLabsPanel {...panel} hasKey={hasKey} setHasKey={setHasKey} />}
        </Form>
        <JobProgress job={job && ["voice", "import-scan"].includes(job.kind) ? job : null} onStop={stop} />
        {status === "error" && <Alert className="feedback" type="error" showIcon title="Chưa xong" description={detail.state.lastError || "Xem nhật ký."} />}
        <AgentLog logs={runLogs} open={status === "running"} />
      </>}
    </div>
    <div className="panel-footer"><span />{status === "done" && <Tag color="success" icon={<CheckCircleFilled />}>Giọng đã sẵn sàng</Tag>}</div>
  </>;
}

export function ScenesStep({ detail, logs, job, busy, act, stop }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.scenes;
  const runLogs = stageLogs(logs, /agent · scenes|agent \(scenes\)/);
  const voiced = detail.state.stages.voice === "done";
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} />{detail.qa.length > 0 && <span className="quiet-label">{detail.qa.length} ẢNH QA</span>}</div>
      <JobProgress job={job?.kind === "scenes" ? job : null} onStop={stop} />
      {!voiced && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Tạo giọng đọc trước" />}
      {voiced && status === "idle" && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Agent chưa chạy"><Button type="primary" disabled={busy} icon={<PlayCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes" }))}>Bắt đầu dựng cảnh</Button></Empty>}
      {status === "error" && <Alert className="feedback" type="error" showIcon title="Chưa xong" description={detail.state.lastError || "Xem nhật ký."} action={<Button disabled={busy} onClick={() => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes" }))}>Chạy lại</Button>} />}
      <AgentSummary logs={runLogs} />
      {detail.qa.length > 0 && <QaGallery paths={detail.qa} />}
      {(status === "review" || status === "done") && detail.state.stages.render !== "running" && <FeedbackBox disabled={busy} placeholder="Ví dụ: cảnh 12 đổi Gate sang StopGate; cảnh 20 chữ bị tràn khung…" onSend={(message) => act(() => post(`/api/videos/${id}/agent`, { stage: "scenes", message }))} />}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer">
      <span />
      {status === "review"
        ? <Button type="primary" disabled={busy} icon={<CheckCircleFilled />} onClick={() => act(() => post(`/api/videos/${id}/approve`, { stage: "scenes" }))}>Duyệt dựng cảnh</Button>
        : status === "done" ? <Tag color="success" icon={<CheckCircleFilled />}>Đã duyệt</Tag> : <span />}
    </div>
  </>;
}

export function RenderStep({ detail, logs, job, busy, act, stop }: StepProps) {
  const id = detail.state.id;
  const status = detail.state.stages.render;
  const deliver = detail.state.stages.deliver;
  const a = detail.artifacts;
  const runLogs = stageLogs(logs, /^Build design system/);
  const ready = detail.state.stages.scenes === "done";
  const [confirmRender, setConfirmRender] = useState(false);
  // the bed is a finishing decision, so it is chosen here and sent with the render request
  const [music, setMusic] = useState(detail.state.music.background);
  const [quizMusic, setQuizMusic] = useState(detail.state.music.quiz);
  const [catalog, setCatalog] = useState<MusicCatalog>({ background: [], quiz: [] });
  const quizCues = detail.cues?.cues.filter((c) => c.quiz).length ?? 0;
  useEffect(() => { api<MusicCatalog>("/api/music").then(setCatalog).catch(() => {}); }, []);
  const startRender = () => act(() => post(`/api/videos/${id}/render`, { music, quizMusic }));
  const files: [string, string | null][] = [["Video MP4", a.mp4], ["Transcript", a.transcript], ["File chương", a.chapters], ["Ghi chú dựng", a.prompts]];
  return <>
    <div className="vs-step-body">
      <div className="vs-step-status"><StageBadge status={status} />{status === "done" && <><span className="quiet-label">BÀN GIAO</span><StageBadge status={deliver} /></>}</div>
      <JobProgress job={job && ["render", "deliver"].includes(job.kind) ? job : null} onStop={stop} />
      {!ready && <Empty className="step-empty" image={Empty.PRESENTED_IMAGE_SIMPLE} description="Duyệt phần dựng cảnh trước" />}
      {a.mp4 && <video className="video-player" src={fileUrl(a.mp4)} controls preload="metadata" />}
      {ready && <div className="render-specs">
        <div><span>Định dạng</span><strong>MP4 · 1920×1080 · 30 fps</strong></div>
        <div><span>Giọng</span><strong>{detail.state.voice.model}</strong></div>
        <div><span>Thời lượng</span><strong className="mono">{formatFrames(detail.cues?.voiceDuration ?? detail.cues?.duration)}</strong></div>
      </div>}
      {status === "error" && <Alert className="feedback" type="error" showIcon title="Chưa xong" description={detail.state.lastError || "Xem nhật ký."} />}
      {ready && <ul className="vs-deliverables">{files.map(([label, path]) => <li key={label}>
        {path ? <CheckCircleFilled className="is-ok" /> : <span className="vs-dot" />}
        <span>{label}</span>
        {path ? <Button type="link" href={fileUrl(path)} target="_blank">{path}</Button> : <small>chưa có</small>}
      </li>)}</ul>}
      {ready && <div className="vs-music-section">
        <div className="vs-section-title">Nhạc nền</div>
        <MusicPicker tracks={catalog.background} value={music} disabled={busy} noneLabel="Không có nhạc nền" onChange={setMusic} />
        {/* Which câu the question covers was settled in cues.js; only the track is still open here. */}
        {quizCues > 0 && <>
          <div className="vs-section-title">Nhạc quiz</div>
          <p className="vs-music-note">{quizCues} câu được đánh dấu <code>quiz: true</code>. Nhạc nền tắt hẳn trong các đoạn đó.</p>
          <MusicPicker tracks={catalog.quiz} value={quizMusic} disabled={busy} noneLabel="Không có nhạc quiz" onChange={setQuizMusic} />
        </>}
        {quizCues === 0 && quizMusic !== NO_MUSIC && <p className="vs-music-note">
          Đã chọn nhạc quiz nhưng <code>cues.js</code> chưa câu nào đánh dấu <code>quiz: true</code> — nhạc quiz sẽ bị bỏ qua.
        </p>}
      </div>}
      {ready && <Button type="primary" block disabled={busy} icon={<PlayCircleFilled />} onClick={() => { if (a.mp4) setConfirmRender(true); else void startRender(); }}>{a.mp4 ? "Render lại" : "Render video"}</Button>}
      <AgentLog logs={runLogs} open={status === "running"} />
    </div>
    <div className="panel-footer"><span />{a.mp4 && <Button type="link" href={dsUrl(`ui_kits/lesson-video/videos/${id}/player.html`)} target="_blank" icon={<ArrowRightOutlined />} iconPlacement="end">Mở trình phát</Button>}</div>
    {confirmRender && <ConfirmDialog
      title={`Render lại ${id}?`}
      description="Bản MP4 hiện có sẽ được thay bằng kết quả render mới. File nguồn và transcript không bị xoá."
      confirmLabel="Render lại"
      onCancel={() => setConfirmRender(false)}
      onConfirm={() => { setConfirmRender(false); void startRender(); }}
    />}
  </>;
}
