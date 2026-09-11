"use client";

import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChatCircleText, CheckCircle, CircleNotch, PaperPlaneTilt, Robot, Stop, Terminal, Warning, Wrench } from "@phosphor-icons/react";
import type { JobInfo, LogEntry, StageStatus } from "@/lib/types";

const ICONS: Record<LogEntry["kind"], typeof Robot> = {
  agent: Robot, tool: Wrench, result: CheckCircle, system: Terminal, error: Warning, output: Terminal,
};

function time(t: number) {
  return new Date(t).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function JobProgress({ job, onStop }: { job: JobInfo | null; onStop?: () => void }) {
  if (!job || job.status !== "running") return null;
  const percent = job.progress?.percent ?? null;
  return <div className="job-progress" role="status">
    <CircleNotch size={19} className="spin" />
    <span>{job.progress?.message || "Đang xử lý…"}</span>
    <strong>{percent === null ? "" : `${Math.round(percent)}%`}</strong>
    {onStop && <button className="text-button vs-stop" onClick={onStop}><Stop size={14} weight="fill" />Dừng</button>}
    <div className={`progress-track ${percent === null ? "is-indeterminate" : ""}`}><span style={{ width: percent === null ? "32%" : `${percent}%` }} /></div>
  </div>;
}

/** Log lines since the last start of the given stage (entries are appended in order). */
export function stageLogs(logs: LogEntry[], marker: RegExp) {
  let start = -1;
  logs.forEach((entry, i) => { if (entry.kind === "system" && marker.test(entry.text)) start = i; });
  return start < 0 ? [] : logs.slice(start);
}

export function AgentLog({ logs, open = false }: { logs: LogEntry[]; open?: boolean }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight }); }, [logs.length]);
  if (!logs.length) return null;
  return <details className="vs-log" open={open}>
    <summary><Terminal size={15} />Nhật ký <span className="quiet-label">{logs.length} dòng</span></summary>
    <ol ref={ref}>{logs.map((entry, i) => {
      const Icon = ICONS[entry.kind];
      return <li key={i} className={`vs-log-${entry.kind}`}><Icon size={14} /><span className="mono vs-log-time">{time(entry.t)}</span><span className="vs-log-text">{entry.text}</span></li>;
    })}</ol>
  </details>;
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

/** The agent's closing summary for the latest run (the text of its last "result" entry). */
export function AgentSummary({ logs }: { logs: LogEntry[] }) {
  const result = useMemo(() => [...logs].reverse().find((e) => e.kind === "result" || e.kind === "error"), [logs]);
  if (!result || result.kind !== "result") return null;
  const text = result.text.split("\n").slice(1).join("\n").trim();
  if (!text) return null;
  return <div className="vs-summary"><div className="vs-summary-heading"><Robot size={16} />Tóm tắt của agent</div><Markdown text={text} /></div>;
}

export function FeedbackBox({ disabled, onSend, placeholder }: { disabled: boolean; onSend: (message: string) => Promise<void>; placeholder: string }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  async function send() {
    setSending(true);
    try { await onSend(text); setText(""); } finally { setSending(false); }
  }
  return <div className="vs-feedback">
    <label className="field">Góp ý cho agent
      <textarea rows={3} value={text} disabled={disabled || sending} maxLength={4000} placeholder={placeholder} onChange={(e) => setText(e.target.value)} />
    </label>
    <button className="button button-secondary compact" disabled={disabled || sending || !text.trim()} onClick={send}><PaperPlaneTilt size={16} />Gửi góp ý</button>
  </div>;
}

export function StageBadge({ status }: { status: StageStatus }) {
  const label = { idle: "Chưa chạy", running: "Đang chạy", review: "Chờ duyệt", done: "Xong", error: "Lỗi" }[status];
  return <span className={`vs-badge is-${status}`}>{status === "running" ? <CircleNotch size={12} className="spin" /> : status === "review" ? <ChatCircleText size={12} /> : null}{label}</span>;
}
