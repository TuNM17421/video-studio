"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircleOutlined, CommentOutlined, LoadingOutlined, RobotOutlined, SendOutlined, StopOutlined, ToolOutlined, WarningOutlined } from "@ant-design/icons";
import { Button, Collapse, Input, Progress, Tag } from "antd";
import type { JobInfo, LogEntry, StageStatus } from "@/lib/types";
import { ConfirmDialog } from "./confirm-dialog";

const ICONS: Record<LogEntry["kind"], typeof RobotOutlined> = {
  agent: RobotOutlined, tool: ToolOutlined, result: CheckCircleOutlined, system: ToolOutlined, error: WarningOutlined, output: ToolOutlined,
};

function time(t: number) {
  return new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/** 754000 → "12:34"; hours only appear once there are any. */
function clock(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const s = String(total % 60).padStart(2, "0");
  const m = Math.floor(total / 60);
  return m < 60 ? `${m}:${s}` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}:${s}`;
}

export function JobProgress({ job, onStop }: { job: JobInfo | null; onStop?: () => void }) {
  const [confirmStopFor, setConfirmStopFor] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  /**
   * Anchored at the first progress reading of this job rather than at its start: a render spends its first
   * half-minute building the design system, and extrapolating across that reported twice the real wait.
   */
  const running = job?.status === "running";
  const percent = job?.progress?.percent ?? null;
  const startedAt = job?.startedAt ?? 0;

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);

  if (!job || job.status !== "running") return null;
  // The estimate comes from whoever is doing the work — render.mjs measures its own frame rate, and a
  // guess extrapolated here would have counted the design-system build as if it were capture.
  const elapsed = now - startedAt;
  const remaining = job.progress?.etaMs ?? null;
  const taskLabel: Record<JobInfo["kind"], string> = {
    cues: "Lời & cue",
    voice: "Giọng đọc",
    scenes: "Dựng cảnh",
    review: "Review lại dựng cảnh",
    render: "Render MP4",
    deliver: "Bàn giao",
    research: "Đóng gói kịch bản",
    images: "Đề xuất ảnh",
    "dry-run": "Kiểm tra giọng",
    "voice-script": "Xuất lời đọc",
    "import-scan": "Kiểm tra thư mục audio",
    "omnivoice-setup": "Cài model local",
    "omnivoice-generate": "Sinh giọng bằng model local",
    "align-setup": "Cài môi trường nhận diện giọng",
    "kaggle-setup": "Cài Kaggle CLI",
    "kaggle-generate": "Sinh giọng trên Kaggle",
    "voice-retake": "Sinh lại một câu",
    "voice-retake-pick": "Đặt bản đã chọn",
  };
  return <>
    {/* Only the message is a live region: the timer beside it ticks every second and would be read out each time. */}
    <div className="job-progress">
      <LoadingOutlined spin />
      <span role="status">{job.progress?.message || "Đang xử lý…"}</span>
      <small className="job-timing">
        đã chạy {clock(elapsed)}
        {remaining !== null && <> · còn khoảng <strong>{clock(remaining)}</strong></>}
      </small>
      <strong>{percent === null ? "" : `${Math.round(percent)}%`}</strong>
      {onStop && <Button type="text" danger size="small" className="vs-stop" icon={<StopOutlined />} onClick={() => setConfirmStopFor(job.startedAt)}>Dừng</Button>}
      <Progress className={percent === null ? "is-indeterminate" : ""} percent={percent ?? 36} showInfo={false} status="active" strokeLinecap="butt" />
    </div>
    {confirmStopFor === job.startedAt && <ConfirmDialog
      title={`Dừng tác vụ ${taskLabel[job.kind]}?`}
      description="Tiến trình đang chạy sẽ dừng ngay. Các tệp đã ghi vẫn được giữ lại."
      confirmLabel="Dừng tác vụ"
      onCancel={() => setConfirmStopFor(null)}
      onConfirm={() => { setConfirmStopFor(null); onStop?.(); }}
    />}
  </>;
}

export { stageLogs, type LogStage } from "@/lib/stage-logs";

export function AgentLog({ logs, open = false }: { logs: LogEntry[]; open?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [logs.length]);
  if (!logs.length) return null;
  return <Collapse className="vs-log" defaultActiveKey={open ? ["log"] : []} items={[{
    key: "log",
    label: <span className="vs-log-label"><ToolOutlined />Nhật ký <span className="quiet-label">{logs.length} dòng</span></span>,
    children: <ol ref={ref}>{logs.map((entry, i) => {
      const Icon = ICONS[entry.kind];
      return <li key={i} className={`vs-log-${entry.kind}`}><Icon /><span className="mono vs-log-time">{time(entry.t)}</span><span className="vs-log-text">{entry.text}</span></li>;
    })}</ol>,
  }]} />;
}

/** **bold** and `code` inside one line, as React nodes (never raw HTML). */
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean).map((part, i) =>
    part.startsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part.startsWith("`") ? <code key={i}>{part.slice(1, -1)}</code>
      : <Fragment key={i}>{part}</Fragment>);
}

/** The small Markdown subset agents write in summaries: paragraphs, "- " lists, **bold**, `code`. */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) blocks.push(<ul key={blocks.length}>{list.map((item, i) => <li key={i}>{inline(item)}</li>)}</ul>);
    list = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const item = line.match(/^(?:[-*]|\d+\.)\s+(.*)$/);
    if (item) { list.push(item[1]); continue; }
    flush();
    if (!line) continue;
    const heading = line.replace(/^#+\s*/, "");
    blocks.push(/^#+\s/.test(line) || /^\*\*[^*]+\*\*:?$/.test(line)
      ? <h5 key={blocks.length}>{heading.replace(/^\*\*|\*\*:?$/g, "")}</h5>
      : <p key={blocks.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="vs-md">{blocks}</div>;
}

/**
 * The agent's closing summary for the latest run (the text of its last "result" entry), folded to its first
 * line: the checks and the findings are what the step is decided on, the summary is background.
 */
export function AgentSummary({ logs }: { logs: LogEntry[] }) {
  const result = useMemo(() => [...logs].reverse().find((e) => e.kind === "result" || e.kind === "error"), [logs]);
  if (!result || result.kind !== "result") return null;
  const text = result.text.split("\n").slice(1).join("\n").trim();
  if (!text) return null;
  const lead = text.split("\n").find((line) => line.trim())?.replace(/[*`#]/g, "").trim() ?? "";
  return <Collapse className="vs-summary" items={[{
    key: "summary",
    label: <span className="vs-summary-heading"><RobotOutlined />Tóm tắt của agent<span className="vs-summary-lead">{lead}</span></span>,
    children: <Markdown text={text} />,
  }]} />;
}

export function FeedbackBox({ disabled, onSend, placeholder }: { disabled: boolean; onSend: (message: string) => Promise<void>; placeholder: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    setSending(true);
    try { await onSend(text); setText(""); } finally { setSending(false); }
  }
  return <div className="vs-feedback">
    <label className="field vs-counted-textarea">Góp ý cho agent
      <Input.TextArea rows={3} value={text} disabled={disabled || sending} maxLength={4000} showCount placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
    </label>
    <Button loading={sending} disabled={disabled || sending || !text.trim()} icon={<SendOutlined />} onClick={send}>Gửi góp ý</Button>
  </div>;
}

export function StageBadge({ status }: { status: StageStatus }) {
  const label = { idle: "Chưa chạy", running: "Đang chạy", review: "Chờ duyệt", done: "Xong", error: "Lỗi" }[status];
  const color = { idle: "default", running: "processing", review: "warning", done: "success", error: "error" }[status];
  const icon = status === "running" ? <LoadingOutlined spin /> : status === "review" ? <CommentOutlined /> : status === "done" ? <CheckCircleOutlined /> : status === "error" ? <WarningOutlined /> : undefined;
  return <Tag className={`vs-badge is-${status}`} color={color} icon={icon}>{label}</Tag>;
}
