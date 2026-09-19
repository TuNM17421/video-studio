"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircleFilled, ClockCircleOutlined, CloseCircleFilled, ExperimentOutlined, LoadingOutlined, MinusCircleOutlined, RollbackOutlined, SendOutlined, StopOutlined } from "@ant-design/icons";
import { Button, Collapse, Image, Input, Segmented, Select, Tag } from "antd";
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

function Finding({ item, qa, control, children }: { item: QaFindingItem; qa: string[]; control?: ReactNode; children?: ReactNode }) {
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
        {control && <span className="vs-finding-control">{control}</span>}
      </div>
      <p className="vs-finding-message">{item.message}</p>
      {item.acceptance && <p className="vs-finding-accept"><strong>Nghiệm thu:</strong> {item.acceptance}</p>}
      {item.evidence && <details className="vs-finding-evidence"><summary>Bằng chứng</summary><p>{item.evidence}</p></details>}
      {children}
    </div>
  </li>;
}

/** What the user can do with the findings; absent = read-only (stage approved, job running, sample…). */
export interface TriageActions {
  decide: (payload: { fix?: string[]; skip?: { id: string; reason: string }[]; reopen?: string[]; note?: string }) => Promise<void>;
  /** A fix round starts an agent turn: only while scenes wait for review or just failed. */
  canFix: boolean;
}

const SKIP_REASONS = ["Cố ý thiết kế", "Review đánh giá sai", "Để sau"];
const OTHER = "__other";

type Decision = { action: "fix" | "skip"; preset: string; text: string };
const reasonOf = (d: Decision) => (d.preset === OTHER ? d.text.trim() : d.preset);

/**
 * Blocker/major findings, each with a Sửa / Bỏ qua choice. Sửa is the default; Bỏ qua needs a reason
 * (it stays in the ledger). One button sends the picked ones to the agent and records the skips.
 */
function Triage({ items, qa, actions }: { items: QaFindingItem[]; qa: string[]; actions: TriageActions }) {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const decisionOf = (id: string): Decision => decisions[id] ?? { action: actions.canFix ? "fix" : "skip", preset: SKIP_REASONS[0], text: "" };
  const set = (id: string, patch: Partial<Decision>) => setDecisions((all) => ({ ...all, [id]: { ...decisionOf(id), ...patch } }));
  const fix = items.filter((item) => decisionOf(item.id).action === "fix");
  const skip = items.filter((item) => decisionOf(item.id).action === "skip");
  const missingReason = skip.some((item) => !reasonOf(decisionOf(item.id)));
  const label = fix.length
    ? `Gửi ${fix.length} lỗi cho agent sửa${skip.length ? ` · bỏ qua ${skip.length}` : ""}`
    : `Bỏ qua ${skip.length} lỗi`;

  async function submit() {
    setSending(true);
    try {
      await actions.decide({
        fix: fix.map((item) => item.id),
        skip: skip.map((item) => ({ id: item.id, reason: reasonOf(decisionOf(item.id)) })),
        note: fix.length ? note : undefined,
      });
      setDecisions({});
      setNote("");
    } finally {
      setSending(false);
    }
  }

  return <>
    <ul>{items.map((item) => {
      const d = decisionOf(item.id);
      return <Finding key={item.id} item={item} qa={qa} control={<Segmented
        size="small"
        aria-label={`Quyết định cho lỗi ${item.scope || item.id}`}
        value={d.action}
        disabled={sending}
        onChange={(value) => set(item.id, { action: value as Decision["action"] })}
        options={[{ value: "fix", label: "Sửa", disabled: !actions.canFix }, { value: "skip", label: "Bỏ qua" }]}
      />}>
        {d.action === "skip" && <div className="vs-skip-reason">
          <label>Lý do bỏ qua
            <Select size="small" value={d.preset} disabled={sending} onChange={(preset) => set(item.id, { preset })}
              options={[...SKIP_REASONS.map((r) => ({ value: r, label: r })), { value: OTHER, label: "Khác…" }]} />
          </label>
          {d.preset === OTHER && <Input size="small" value={d.text} maxLength={500} disabled={sending} placeholder="Vì sao không cần sửa lỗi này?" status={d.text.trim() ? undefined : "error"} onChange={(e) => set(item.id, { text: e.target.value })} />}
        </div>}
      </Finding>;
    })}</ul>
    <div className="vs-triage-bar">
      {fix.length > 0 && (noteOpen
        ? <Input.TextArea rows={2} value={note} maxLength={4000} disabled={sending} placeholder="Ghi chú thêm cho agent khi sửa (tuỳ chọn)" onChange={(e) => setNote(e.target.value)} />
        : <Button type="link" size="small" onClick={() => setNoteOpen(true)}>Thêm ghi chú cho agent</Button>)}
      <span className="vs-triage-summary">{!actions.canFix && "Chỉ gửi sửa được khi dựng cảnh đang chờ duyệt. "}{missingReason ? "Ghi lý do cho lỗi bỏ qua." : `${fix.length} sửa · ${skip.length} bỏ qua`}</span>
      <Button type="primary" icon={<SendOutlined />} loading={sending} disabled={missingReason || (!fix.length && !skip.length)} onClick={() => { void submit(); }}>{label}</Button>
    </div>
  </>;
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
export function HarnessPanel({ run, findings = [], qa = [], reviewEnabled = true, blocking = 0, actions }: {
  run?: HarnessRun;
  findings?: QaFindingItem[];
  qa?: string[];
  reviewEnabled?: boolean;
  blocking?: number;
  actions?: TriageActions;
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
      skipped: findings.filter((f) => f.status === "wontfix"),
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
    {actions && groups.fix.some((f) => f.status !== "applied")
      ? <section className="vs-finding-group">
          <h4>Cần xử lý <span className="quiet-label">{groups.fix.length}</span></h4>
          <p className="vs-finding-note">Chọn lỗi nào gửi agent sửa, lỗi nào bỏ qua (ghi lý do). Blocker/major chặn nút Duyệt cho tới khi được sửa xong hoặc bỏ qua.</p>
          <Triage key={groups.fix.map((f) => f.id).join()} items={groups.fix.filter((f) => f.status !== "applied")} qa={qa} actions={actions} />
          {groups.fix.some((f) => f.status === "applied") && <ul>{groups.fix.filter((f) => f.status === "applied").map((item) => <Finding key={item.id} item={item} qa={qa} />)}</ul>}
        </section>
      : <FindingGroup title="Cần xử lý" note={reviewEnabled && blocking ? "Blocker/major chặn nút Duyệt cho tới khi review lại không còn thấy lỗi." : undefined} items={groups.fix} qa={qa} />}
    <FindingGroup title="Lưu ý" note="Minor không chặn duyệt. Muốn sửa thì ghi vào ô Góp ý cho agent." items={groups.minor} qa={qa} />
    {groups.skipped.length > 0 && <Collapse className="vs-finding-resolved" items={[{
      key: "skipped",
      label: `Đã bỏ qua (${groups.skipped.length})`,
      children: <ul>{groups.skipped.map((item) => <Finding key={item.id} item={item} qa={qa}
        control={actions && <Button size="small" icon={<RollbackOutlined />} onClick={() => { void actions.decide({ reopen: [item.id] }); }}>Mở lại</Button>}>
        <p className="vs-finding-accept"><strong>Lý do bỏ qua:</strong> {item.skipReason || "—"}{item.decidedAt ? <span className="quiet-label"> · {new Date(item.decidedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span> : null}</p>
      </Finding>)}</ul>,
    }]} />}
    {groups.resolved.length > 0 && <Collapse className="vs-finding-resolved" items={[{
      key: "resolved",
      label: `Đã hết ở lượt review này (${groups.resolved.length})`,
      children: <ul>{groups.resolved.map((item) => <Finding key={item.id} item={item} qa={qa} />)}</ul>,
    }]} />}
  </section>;
}
