"use client";

import { useEffect, useState, type ReactNode } from "react";
import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, ExperimentOutlined, LoadingOutlined, MinusCircleOutlined, StopOutlined } from "@ant-design/icons";
import { Button, Tag } from "antd";
import type { HarnessRun, HarnessStep } from "@/lib/types";
import { agentProviderLabel } from "@/lib/agent-providers";

function duration(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const STEP_ICON: Record<HarnessStep["status"], React.ReactNode> = {
  pending: <ClockCircleOutlined />,
  running: <LoadingOutlined spin />,
  done: <CheckCircleFilled />,
  error: <CloseCircleFilled />,
  skipped: <MinusCircleOutlined />,
};

const RUN_LABEL: Record<HarnessRun["status"], { text: string; color: string; icon: React.ReactNode }> = {
  running: { text: "Đang chạy", color: "processing", icon: <LoadingOutlined spin /> },
  done: { text: "Xong", color: "success", icon: <CheckCircleFilled /> },
  error: { text: "Dừng vì lỗi", color: "error", icon: <CloseCircleFilled /> },
  stopped: { text: "Đã dừng", color: "default", icon: <StopOutlined /> },
};

/** The review's own verdict, two lines until asked for the rest. */
function Verdict({ run, approved }: { run: HarnessRun; approved: boolean }) {
  const [open, setOpen] = useState(false);
  const review = run.review!;
  const pass = review.verdict === "pass";
  // Once the stage is approved the verdict is history: a yellow "cần sửa" box would contradict the step.
  if (approved) {
    return <p className="vs-verdict-line">
      Review lượt cuối <span className="quiet-label">{agentProviderLabel(review.provider)}</span>: {pass ? "đạt" : "cần sửa"} · bước đã được duyệt
    </p>;
  }
  return <div className={`vs-verdict is-${review.verdict}`}>
    {pass ? <CheckCircleFilled /> : <CloseCircleFilled />}
    <div>
      <strong>{pass ? "Review: đạt" : "Review: cần sửa"} <span className="quiet-label">{agentProviderLabel(review.provider)}</span></strong>
      <p className={open ? "" : "is-clamped"}>{review.summary}</p>
      {review.summary.length > 180 && <Button type="link" size="small" onClick={() => setOpen(!open)}>{open ? "Thu gọn" : "Đọc toàn bộ"}</Button>}
    </div>
  </div>;
}

/**
 * The automated checks around a stage: which step is running and for how long, how each step ended, and
 * the cross-review verdict. A finished, clean run folds to one line — the tiles only come back while a run
 * is going or when a step failed, which is when their detail is worth the space. `tools` sits at the end of
 * the head (review settings, run again).
 */
export function HarnessPanel({ run, tools, approved = false }: { run?: HarnessRun; tools?: ReactNode; approved?: boolean }) {
  const running = run?.status === "running";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);

  if (!run) return tools ? <section className="vs-harness is-compact"><div className="vs-harness-head"><ExperimentOutlined aria-hidden="true" /><h3>Kiểm tra tự động</h3><span className="vs-harness-meta">chưa chạy</span><span className="vs-harness-tools">{tools}</span></div></section> : null;
  const status = RUN_LABEL[run.status];
  const end = run.finishedAt ?? now;
  const expanded = running || run.steps.some((step) => step.status === "error");
  const spent = (step: HarnessStep) => step.startedAt ? (step.finishedAt ?? (step.status === "running" ? now : step.startedAt)) - step.startedAt : null;

  return <section className={`vs-harness ${running ? "is-running" : ""} ${expanded ? "" : "is-compact"}`} aria-labelledby="vs-harness-title" aria-busy={running}>
    <div className="vs-harness-head">
      <ExperimentOutlined aria-hidden="true" />
      <h3 id="vs-harness-title">Kiểm tra tự động</h3>
      {expanded
        ? <Tag color={status.color} icon={status.icon}>{status.text}</Tag>
        : <ol className="vs-harness-line">{run.steps.map((step) => <li key={step.id} className={`is-${step.status}`} title={step.detail || undefined}>
            {STEP_ICON[step.status]}<span>{step.label}</span>{step.detail && <small>{step.detail}</small>}
          </li>)}</ol>}
      <span className="vs-harness-meta mono">
        {run.kind === "review" ? "review lại · " : ""}{new Date(run.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {duration(end - run.startedAt)}
      </span>
      {tools && <span className="vs-harness-tools">{tools}</span>}
    </div>

    {expanded && <ol className="vs-harness-steps">
      {run.steps.map((step) => {
        const ms = spent(step);
        return <li key={step.id} className={`is-${step.status}`} aria-current={step.status === "running" ? "step" : undefined}>
          <span className="vs-harness-icon" aria-hidden="true">{STEP_ICON[step.status]}</span>
          <span className="vs-harness-step">
            <strong>{step.label}</strong>
            <small>{step.detail || (step.status === "pending" ? "chưa chạy" : step.status === "running" ? "đang chạy…" : "")}</small>
          </span>
          {ms !== null && step.status !== "skipped" && <span className="vs-harness-time mono">{duration(ms)}</span>}
        </li>;
      })}
    </ol>}

    {run.review && <Verdict run={run} approved={approved} />}
  </section>;
}
