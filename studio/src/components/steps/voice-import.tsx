"use client";

import { useState } from "react";
import { CheckCircleFilled, CopyOutlined, ImportOutlined, LockOutlined, SearchOutlined } from "@ant-design/icons";
import { Button, Checkbox, Form, InputNumber } from "antd";
import { fileUrl } from "@/lib/client";
import type { ImportReport, VideoDetail, VoiceScript, VoiceSettings } from "@/lib/types";
import { ProductionState } from "../production-state";
import { SourcePickerField } from "../source-picker";
import { post, type StepProps } from "./shared";

/** Whether a scan still describes the folder on screen — same rule as the ElevenLabs dry-run. */
export const scanKey = (s: VoiceSettings) => JSON.stringify([s.importDir, s.pause]);

/** One decimal, Vietnamese comma — 4.86 and 22.8 should not read as different kinds of number. */
const seconds = (v: number) => `${v.toFixed(1).replace(".", ",")}s`;

/** Below this share of the câu's words, spokenAt() is mostly interpolating rather than measuring. */
const WEAK_MATCH = 0.65;

/**
 * Bảng ghép: tệp nào rơi vào câu nào, và mọi thứ trông sai. Dùng chung cho nguồn "Audio có sẵn" và bước
 * nhập của model local — bước đó mà chỉ có một dòng tổng kết thì hễ báo lỗi là lại phải sang tab kia mới
 * biết câu nào.
 */
export function ImportMap({ report }: { report: ImportReport }) {
  return <>
    <div className="vs-map">
      <div className="vs-map-row is-head">
        <span>Câu</span><span>Tệp</span><span>Lời</span><span>Dài</span><span>Khớp</span>
      </div>
      {report.rows.map((r) => {
        // The silent row's only note repeats what its own text column already says.
        const notes = r.silent ? [] : r.notes;
        const weak = r.matchRatio != null && r.matchRatio < WEAK_MATCH;
        return <div key={r.n} className={`vs-map-row is-${r.level}`}>
          <span className="vs-map-key mono">{r.key}</span>
          <span className={`vs-map-file ${r.silent ? "is-none" : "mono"}`} title={r.file || undefined}>{r.file ?? (r.silent ? "không cần" : "—")}</span>
          <span className="vs-map-text" title={r.silent ? undefined : r.text}>{r.silent ? `Khoảng dừng ${r.expectedSeconds} giây` : r.text}</span>
          <span className="vs-map-len mono">{r.seconds != null ? seconds(r.seconds) : "—"}</span>
          <span className={`vs-map-match mono ${weak ? "is-weak" : ""}`}>{r.matchRatio != null ? `${Math.round(r.matchRatio * 100)}%` : "—"}</span>
          {notes.length > 0 && <span className="vs-map-notes">{notes.join(" · ")}</span>}
        </div>;
      })}
    </div>
    {(report.extra.length > 0 || report.clashes.length > 0) && <ul className="vs-map-aside">
      {report.extra.map((e) => <li key={e.file}>Thừa: <span className="mono">{e.file}</span> — {e.reason}</li>)}
      {report.clashes.map((c) => <li key={c.file}>Câu {c.n} trùng: dùng <span className="mono">{c.kept}</span>, bỏ qua <span className="mono">{c.file}</span></li>)}
    </ul>}
  </>;
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

  return <>
    <div className="vs-script-actions">
      <Button disabled={busy} icon={<CopyOutlined />} onClick={copy}>{copied ? "Đã copy" : "Copy lời đọc"}</Button>
      <Button disabled={busy} icon={<ImportOutlined />} onClick={write}>{written ? "Xuất lại ra tệp" : "Xuất ra tệp"}</Button>
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
  </>;
}

/**
 * Narration recorded by a member: one audio file per câu in one folder, in the same three steps as the
 * other sources — prepare, check, bind.
 *
 * The report is the whole point of this panel. A folder that is quietly off by one — a câu skipped
 * while recording, the rest shifted up — reaches the MP4 looking fine, so every file is shown against
 * the câu it landed on, with how much of that câu's words were actually heard in it.
 */
export function ImportPanel({ detail, settings, setSettings, busy, act }: {
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
  const fresh = !!report && scanned === scanKey(settings);
  const problems = report?.rows.filter((r) => r.level === "error").length ?? 0;
  const warnings = report?.rows.filter((r) => r.level === "warn").length ?? 0;

  const scan = () => act(async () => {
    const result = await post(`/api/videos/${id}/voice`, { action: "scan-import", settings }) as ImportReport;
    setReport(result);
    setScanned(scanKey(settings));
    setForce(false);
  });

  return <ol className="vs-flow">
    <li className="vs-flow-step">
      <span className="vs-flow-num">1</span>
      <div className="vs-flow-body">
        <h4>Thu lời đọc</h4>
        <p className="vs-flow-note">Gửi lời đọc cho người thu, mỗi câu một tệp đặt tên theo số câu.</p>
        <ScriptExport detail={detail} busy={busy} act={act} />
      </div>
    </li>
    <li className="vs-flow-step">
      <span className={`vs-flow-num ${fresh && !problems ? "is-done" : ""}`}>{fresh && !problems ? <CheckCircleFilled /> : 2}</span>
      <div className="vs-flow-body">
        <h4>Kiểm tra thư mục audio</h4>
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
        {report?.align.note && <ProductionState className="vs-production-state" status="review" title={report.align.note} detail={null} />}
        {report && <details className="vs-flow-more" open={problems > 0}>
          <summary>Xem từng câu ({report.rows.length})</summary>
          <ImportMap report={report} />
        </details>}
      </div>
    </li>
    <li className="vs-flow-step">
      <span className="vs-flow-num">3</span>
      <div className="vs-flow-body">
        <h4>Gắn vào video</h4>
        <p className="vs-flow-note">Ghép các tệp thành một bản thu liền rồi đo mốc từng từ.</p>
        {fresh && problems > 0 && <Checkbox className="vs-force" checked={force} onChange={(e) => setForce(e.target.checked)}>
          Vẫn nhập dù {problems} câu có vấn đề — tôi đã nghe lại và chấp nhận
        </Checkbox>}
        <Button type="primary" disabled={busy || !fresh || (problems > 0 && !force)} icon={fresh && (problems === 0 || force) ? <ImportOutlined /> : <LockOutlined />}
          onClick={() => act(() => post(`/api/videos/${id}/voice`, { action: "import", force }))}>
          {!fresh ? "Kiểm tra thư mục trước" : `${detail.artifacts.voice ? "Nhập lại giọng" : "Nhập giọng"} · ${report?.matched ?? 0} câu`}
        </Button>
      </div>
    </li>
  </ol>;
}
