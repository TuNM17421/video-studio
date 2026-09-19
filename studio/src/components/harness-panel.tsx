"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, ExperimentOutlined, LoadingOutlined, MinusCircleOutlined, StopOutlined } from "@ant-design/icons";
import { Collapse, Image, Tag } from "antd";
import type { HarnessRun, HarnessStep, QaFindingItem } from "@/lib/types";
import { agentProviderLabel } from "@/lib/agent-providers";
import { fileUrl } from "@/lib/client";
import { cueNumber, qaCodeLabel } from "@/lib/qa-codes";

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

const SEVERITY: Record<QaFindingItem["severity"], { label: string; color: string }> = {
  blocker: { label: "Blocker", color: "error" },
  major: { label: "Major", color: "warning" },
  minor: { label: "Minor", color: "default" },
};

const STATUS_NOTE: Partial<Record<QaFindingItem["status"], string>> = {
  planned: "Đã giao agent",
  applied: "Agent đã sửa · chờ review lại",
  verified: "Đã hết",
  wontfix: "Bỏ qua",
};

/** One still per cue lives at qa/auto/cue-NN.png; a finding points at it by scope. */
function stillFor(scope: string | undefined, qa: string[]) {
  const n = cueNumber(scope);
  if (n === null) return null;
  const name = `cue-${String(n).padStart(2, "0")}.png`;
  return qa.find((p) => p.endsWith(`/qa/auto/${name}`)) ?? null;
}

function Finding({ item, qa }: { item: QaFindingItem; qa: string[] }) {
  const still = stillFor(item.scope, qa);
  const n = cueNumber(item.scope);
  return <li className={`vs-finding is-${item.severity} is-${item.status}`}>
    <div className="vs-finding-still">
      {still
        ? <Image src={fileUrl(still)} alt={`Ảnh cảnh ${n}`} preview={{ mask: "Xem lớn" }} />
        : <span className="vs-finding-nostill">{item.scope || "—"}</span>}
    </div>
    <div className="vs-finding-body">
      <div className="vs-finding-tags">
        <Tag color={SEVERITY[item.severity].color}>{SEVERITY[item.severity].label}</Tag>
        {n !== null && <span className="vs-finding-scene mono">Cảnh {String(n).padStart(2, "0")}</span>}
        <span className="vs-finding-code">{qaCodeLabel(item.code)}</span>
        {item.recurrence > 1 && <Tag className="vs-finding-repeat">Lặp lại {item.recurrence} lần</Tag>}
        {STATUS_NOTE[item.status] && <span className="vs-finding-status">{STATUS_NOTE[item.status]}</span>}
      </div>
      <p className="vs-finding-message">{item.message}</p>
      {item.acceptance && <p className="vs-finding-accept"><strong>Nghiệm thu:</strong> {item.acceptance}</p>}
      {item.evidence && <details className="vs-finding-evidence"><summary>Bằng chứng</summary><p>{item.evidence}</p></details>}
    </div>
  </li>;
}

function FindingGroup({ title, note, items, qa }: { title: string; note?: string; items: QaFindingItem[]; qa: string[] }) {
  if (!items.length) return null;
  return <section className="vs-finding-group">
    <h4>{title} <span className="quiet-label">{items.length}</span></h4>
    {note && <p className="vs-finding-note">{note}</p>}
    <ul>{items.map((item) => <Finding key={item.id} item={item} qa={qa} />)}</ul>
  </section>;
}

/**
 * The automated checks around a stage, on the page: which step is running and for how long, how each
 * step ended, and — for scenes — what the cross-review found, grouped the way the Duyệt button sees it.
 */
export function HarnessPanel({ run, findings = [], qa = [], reviewEnabled = true, blocking = 0 }: {
  run?: HarnessRun;
  findings?: QaFindingItem[];
  qa?: string[];
  reviewEnabled?: boolean;
  blocking?: number;
}) {
  const running = run?.status === "running";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [running]);

  const groups = useMemo(() => {
    const active = findings.filter((f) => ["open", "planned", "applied"].includes(f.status));
    return {
      fix: active.filter((f) => f.severity !== "minor"),
      minor: active.filter((f) => f.severity === "minor"),
      resolved: findings.filter((f) => f.status === "verified" && run?.review && f.resolvedBy === run.review.runId),
    };
  }, [findings, run]);

  if (!run && !findings.length) return null;
  const status = run ? RUN_LABEL[run.status] : null;
  const end = run?.finishedAt ?? now;

  return <section className={`vs-harness ${running ? "is-running" : ""}`} aria-labelledby="vs-harness-title" aria-busy={running}>
    <div className="vs-harness-head">
      <ExperimentOutlined aria-hidden="true" />
      <h3 id="vs-harness-title">Kiểm tra tự động</h3>
      {status && <Tag color={status.color} icon={status.icon}>{status.text}</Tag>}
      {run && <span className="vs-harness-meta mono">
        {run.kind === "review" ? "review lại · " : ""}{new Date(run.startedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} · {duration(end - run.startedAt)}
      </span>}
    </div>

    {run && <ol className="vs-harness-steps">
      {run.steps.map((step) => {
        const spent = step.startedAt ? (step.finishedAt ?? (step.status === "running" ? now : step.startedAt)) - step.startedAt : null;
        return <li key={step.id} className={`is-${step.status}`} aria-current={step.status === "running" ? "step" : undefined}>
          <span className="vs-harness-icon" aria-hidden="true">{STEP_ICON[step.status]}</span>
          <span className="vs-harness-step">
            <strong>{step.label}</strong>
            <small>{step.detail || (step.status === "pending" ? "chưa chạy" : step.status === "running" ? "đang chạy…" : "")}</small>
          </span>
          {spent !== null && step.status !== "skipped" && <span className="vs-harness-time mono">{duration(spent)}</span>}
        </li>;
      })}
    </ol>}

    {run?.review && <div className={`vs-verdict is-${run.review.verdict}`}>
      {run.review.verdict === "pass" ? <CheckCircleFilled /> : <CloseCircleFilled />}
      <div>
        <strong>{run.review.verdict === "pass" ? "Review: đạt" : "Review: cần sửa"} <span className="quiet-label">{agentProviderLabel(run.review.provider)}</span></strong>
        <p>{run.review.summary}</p>
      </div>
    </div>}

    {!reviewEnabled && (groups.fix.length > 0 || groups.minor.length > 0) && <p className="vs-finding-note">Review chéo đang tắt — các lỗi bên dưới từ lượt review trước, không chặn nút Duyệt.</p>}
    <FindingGroup title="Cần xử lý" note={reviewEnabled && blocking ? "Blocker/major chặn nút Duyệt cho tới khi review lại không còn thấy lỗi." : undefined} items={groups.fix} qa={qa} />
    <FindingGroup title="Lưu ý" note="Minor không chặn duyệt. Muốn sửa thì ghi vào ô Góp ý cho agent." items={groups.minor} qa={qa} />
    {groups.resolved.length > 0 && <Collapse className="vs-finding-resolved" items={[{
      key: "resolved",
      label: `Đã hết ở lượt review này (${groups.resolved.length})`,
      children: <ul>{groups.resolved.map((item) => <Finding key={item.id} item={item} qa={qa} />)}</ul>,
    }]} />}
  </section>;
}
