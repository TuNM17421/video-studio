"use client";

import { useMemo, useState, type ReactNode } from "react";
import { RollbackOutlined } from "@ant-design/icons";
import { Button, Checkbox, Collapse, Image, Input, Segmented, Select, Tag } from "antd";
import { fileUrl } from "@/lib/client";
import { cueNumber, qaCodeLabel } from "@/lib/qa-codes";
import type { QaFindingItem } from "@/lib/types";

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

const SKIP_REASONS = ["Cố ý thiết kế", "Review đánh giá sai", "Để sau"];
const OTHER = "__other";
const ACTIVE = ["open", "planned", "applied"];

type Decision = { action: "fix" | "skip"; preset: string; text: string };
const reasonOf = (d: Decision) => (d.preset === OTHER ? d.text.trim() : d.preset);

/** One still per cue lives at qa/auto/cue-NN.png; a finding points at it by scope. */
function stillFor(scope: string | undefined, qa: string[]) {
  const n = cueNumber(scope);
  if (n === null) return null;
  const name = `cue-${String(n).padStart(2, "0")}.png`;
  return qa.find((p) => p.endsWith(`/qa/auto/${name}`)) ?? null;
}

const sceneName = (item: QaFindingItem) => {
  const n = cueNumber(item.scope);
  return n === null ? item.scope || item.id : `Cảnh ${String(n).padStart(2, "0")}`;
};

/**
 * The findings grouped the way the Duyệt button sees them, plus what the user has picked to do about them.
 * Kept by the step, not by the list: the bar at the bottom sends it and the composer shows it.
 */
export function useReviewDraft(findings: QaFindingItem[], lastReview: string | undefined, canFix: boolean) {
  const groups = useMemo(() => {
    const active = findings.filter((f) => ACTIVE.includes(f.status));
    return {
      fix: active.filter((f) => f.severity !== "minor"),
      minor: active.filter((f) => f.severity === "minor"),
      skipped: findings.filter((f) => f.status === "wontfix"),
      resolved: findings.filter((f) => f.status === "verified" && lastReview && f.resolvedBy === lastReview),
    };
  }, [findings, lastReview]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [minors, setMinors] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const decisionOf = (id: string): Decision => decisions[id] ?? { action: canFix ? "fix" : "skip", preset: SKIP_REASONS[0], text: "" };
  const decide = (id: string, patch: Partial<Decision>) => setDecisions((all) => ({ ...all, [id]: { ...decisionOf(id), ...patch } }));
  // "applied" is waiting for the next review: nothing to decide until it has spoken.
  const pending = groups.fix.filter((f) => f.status !== "applied");
  const fix = [
    ...pending.filter((f) => decisionOf(f.id).action === "fix"),
    ...groups.minor.filter((f) => f.status === "open" && minors.includes(f.id)),
  ];
  const skip = pending.filter((f) => decisionOf(f.id).action === "skip");
  return {
    groups,
    canFix,
    decisionOf,
    decide,
    pickMinor: (id: string, on: boolean) => setMinors((all) => on ? [...all, id] : all.filter((x) => x !== id)),
    minorPicked: (id: string) => minors.includes(id),
    note,
    setNote,
    fix,
    skip,
    missingReason: skip.some((f) => !reasonOf(decisionOf(f.id))),
    payload: () => ({
      fix: fix.map((f) => f.id),
      skip: skip.map((f) => ({ id: f.id, reason: reasonOf(decisionOf(f.id)) })),
      note: note.trim() || undefined,
    }),
    reset: () => { setDecisions({}); setMinors([]); setNote(""); },
  };
}
export type ReviewDraft = ReturnType<typeof useReviewDraft>;

function Finding({ item, qa, compact = false, control, children }: { item: QaFindingItem; qa: string[]; compact?: boolean; control?: ReactNode; children?: ReactNode }) {
  const still = stillFor(item.scope, qa);
  return <li className={`vs-finding is-${item.severity} is-${item.status} ${compact ? "is-compact" : ""}`}>
    <div className="vs-finding-still">
      {still
        ? <Image src={fileUrl(still)} alt={`Ảnh ${sceneName(item)}`} preview={{ mask: "Xem lớn" }} />
        : <span className="vs-finding-nostill">{item.scope || "—"}</span>}
    </div>
    <div className="vs-finding-body">
      <div className="vs-finding-tags">
        {!compact && <Tag color={SEVERITY[item.severity].color}>{SEVERITY[item.severity].label}</Tag>}
        <span className="vs-finding-scene mono">{sceneName(item)}</span>
        <span className="vs-finding-code">{qaCodeLabel(item.code)}</span>
        {item.recurrence > 1 && <Tag className="vs-finding-repeat">Lặp lại {item.recurrence} lần</Tag>}
        {STATUS_NOTE[item.status] && <span className="vs-finding-status">{STATUS_NOTE[item.status]}</span>}
      </div>
      <p className="vs-finding-message">{item.message}</p>
      {!compact && item.acceptance && <p className="vs-finding-accept"><strong>Nghiệm thu:</strong> {item.acceptance}</p>}
      {!compact && item.evidence && <details className="vs-finding-evidence"><summary>Bằng chứng</summary><p>{item.evidence}</p></details>}
      {children}
    </div>
    {control && <div className="vs-finding-control">{control}</div>}
  </li>;
}

function SkipReason({ draft, item }: { draft: ReviewDraft; item: QaFindingItem }) {
  const d = draft.decisionOf(item.id);
  return <div className="vs-skip-reason">
    <label>Lý do bỏ qua
      <Select size="small" value={d.preset} onChange={(preset) => draft.decide(item.id, { preset })}
        options={[...SKIP_REASONS.map((r) => ({ value: r, label: r })), { value: OTHER, label: "Khác…" }]} />
    </label>
    {d.preset === OTHER && <Input size="small" value={d.text} maxLength={500} placeholder="Vì sao không cần sửa lỗi này?" status={d.text.trim() ? undefined : "error"} onChange={(e) => draft.decide(item.id, { text: e.target.value })} />}
  </div>;
}

/**
 * What the cross-review found. Blocker/major: Sửa (default) or Bỏ qua with a reason. Minor: never blocks,
 * but "Sửa luôn" sends it along with the next fix round instead of retyping it into a Góp ý.
 * `editable` is false while a job runs and after approval — the list is then read-only.
 */
export function ReviewFindings({ draft, qa, editable, approved, reviewEnabled, onReopen }: {
  draft: ReviewDraft;
  qa: string[];
  editable: boolean;
  approved: boolean;
  reviewEnabled: boolean;
  onReopen: (id: string) => void;
}) {
  const { groups } = draft;
  const past = <>
    {groups.skipped.length > 0 && <Collapse className="vs-finding-resolved" size="small" items={[{
      key: "skipped",
      label: `Đã bỏ qua (${groups.skipped.length})`,
      children: <ul>{groups.skipped.map((item) => <Finding key={item.id} item={item} qa={qa} compact
        control={editable && <Button size="small" icon={<RollbackOutlined />} onClick={() => onReopen(item.id)}>Mở lại</Button>}>
        <p className="vs-finding-accept"><strong>Lý do bỏ qua:</strong> {item.skipReason || "—"}{item.decidedAt ? <span className="quiet-label"> · {new Date(item.decidedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span> : null}</p>
      </Finding>)}</ul>,
    }]} />}
    {groups.resolved.length > 0 && <Collapse className="vs-finding-resolved" size="small" items={[{
      key: "resolved",
      label: `Đã hết ở lượt review này (${groups.resolved.length})`,
      children: <ul>{groups.resolved.map((item) => <Finding key={item.id} item={item} qa={qa} compact />)}</ul>,
    }]} />}
  </>;

  // After approval what is left open is history too: one folded list, no controls.
  if (approved) {
    const left = [...groups.fix, ...groups.minor];
    return <>
      {left.length > 0 && <Collapse className="vs-finding-resolved" size="small" items={[{
        key: "left",
        label: `Lỗi đã để lại khi duyệt (${left.length})`,
        children: <ul>{left.map((item) => <Finding key={item.id} item={item} qa={qa} compact />)}</ul>,
      }]} />}
      {past}
    </>;
  }

  return <>
    {!reviewEnabled && (groups.fix.length > 0 || groups.minor.length > 0) && <p className="vs-finding-note">Review chéo đang tắt — các lỗi bên dưới từ lượt review trước, không chặn nút Duyệt.</p>}
    {groups.fix.length > 0 && <section className="vs-finding-group">
      <h4>Cần xử lý <span className="quiet-label">{groups.fix.length} · chặn nút Duyệt</span></h4>
      <ul>{groups.fix.map((item) => {
        const d = draft.decisionOf(item.id);
        const deciding = editable && item.status !== "applied";
        return <Finding key={item.id} item={item} qa={qa} control={deciding && <Segmented
          size="small"
          aria-label={`Quyết định cho lỗi ${sceneName(item)}`}
          value={d.action}
          onChange={(value) => draft.decide(item.id, { action: value as Decision["action"] })}
          options={[{ value: "fix", label: "Sửa", disabled: !draft.canFix }, { value: "skip", label: "Bỏ qua" }]}
        />}>
          {deciding && d.action === "skip" && <SkipReason draft={draft} item={item} />}
        </Finding>;
      })}</ul>
    </section>}
    {groups.minor.length > 0 && <section className="vs-finding-group">
      <h4>Lưu ý <span className="quiet-label">{groups.minor.length} · minor, không chặn</span></h4>
      <ul>{groups.minor.map((item) => <Finding key={item.id} item={item} qa={qa} compact control={editable && draft.canFix && item.status === "open" &&
        <Checkbox checked={draft.minorPicked(item.id)} onChange={(e) => draft.pickMinor(item.id, e.target.checked)}>Sửa luôn</Checkbox>} />)}</ul>
    </section>}
    {past}
  </>;
}

/**
 * The one way to talk to the scenes agent: the findings picked above ride along as chips, plus free text.
 * With nothing picked the text alone is sent as a Góp ý. The bar's button sends it.
 */
export function ReviewComposer({ draft, disabled }: { draft: ReviewDraft; disabled: boolean }) {
  return <section className="vs-composer" aria-labelledby="vs-composer-title">
    <h4 id="vs-composer-title">Gửi cho agent</h4>
    {(draft.fix.length > 0 || draft.skip.length > 0) && <ul className="vs-composer-picked">
      {draft.fix.map((f) => <li key={f.id}>Sửa · {sceneName(f)} · {qaCodeLabel(f.code)}</li>)}
      {draft.skip.map((f) => <li key={f.id} className="is-skip">Bỏ qua · {sceneName(f)}</li>)}
    </ul>}
    <Input.TextArea
      rows={2}
      value={draft.note}
      maxLength={4000}
      disabled={disabled}
      placeholder={draft.fix.length ? "Ghi chú thêm khi sửa (tuỳ chọn)" : "Góp ý cho agent — ví dụ: cảnh 12 đổi Gate sang StopGate; cảnh 20 chữ bị tràn khung…"}
      onChange={(e) => draft.setNote(e.target.value)}
    />
    {draft.missingReason && <small className="vs-composer-warn">Ghi lý do cho lỗi chọn Bỏ qua.</small>}
  </section>;
}
