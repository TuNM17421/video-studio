"use client";

import { AuditOutlined, RedoOutlined } from "@ant-design/icons";
import { Button, Select, Switch } from "antd";
import type { AgentProvider, ReviewSettings } from "@/lib/types";
import { agentProviderLabel } from "@/lib/agent-providers";
import { describeReviewer, resolveReviewer } from "@/lib/review";

/**
 * Cross-review switch: whether a separate read-only session grades the scene stills, and who. Used on the
 * plan form (before the video exists) and on the scenes step (changeable at any time — it only affects
 * the next run). The line under it always says who will actually grade, so "auto" is never a mystery.
 */
export function ReviewControl({ author, value, installed, disabled, onChange, onRerun, rerunDisabled }: {
  author: AgentProvider;
  value: ReviewSettings;
  installed: AgentProvider[];
  disabled?: boolean;
  onChange: (next: ReviewSettings) => void;
  /** Scenes step only: gate + review again on the scenes as they are, without an agent turn. */
  onRerun?: () => void;
  rerunDisabled?: boolean;
}) {
  const resolution = resolveReviewer(author, value, installed);
  const problem = value.enabled && !resolution.ok;
  const options = [
    { value: "auto", label: "Tự chọn" },
    ...(["claude", "codex", "antigravity"] as AgentProvider[]).map((p) => ({
      value: p,
      label: `${agentProviderLabel(p)}${p === author ? " (agent đang dựng)" : ""}${installed.includes(p) ? "" : " · chưa cài"}`,
      disabled: !installed.includes(p),
    })),
  ];
  return <section className={`vs-review ${value.enabled ? "is-on" : ""} ${problem ? "is-problem" : ""}`} aria-labelledby="vs-review-title">
    <div className="vs-review-head">
      <AuditOutlined aria-hidden="true" />
      <span className="vs-review-copy">
        <strong id="vs-review-title">Review chéo ảnh cảnh</strong>
        <small role={problem ? "alert" : undefined}>{describeReviewer(author, value, installed)}</small>
      </span>
      <Switch checked={value.enabled} disabled={disabled} aria-labelledby="vs-review-title" onChange={(enabled) => onChange({ ...value, enabled })} />
    </div>
    {value.enabled && <div className="vs-review-options">
      <label className="vs-review-field">Người review
        <Select size="small" value={value.provider} disabled={disabled} options={options} onChange={(provider) => onChange({ ...value, provider })} popupMatchSelectWidth={false} />
      </label>
      {onRerun && <Button size="small" icon={<RedoOutlined />} disabled={disabled || rerunDisabled || problem} onClick={onRerun}>Chạy lại review</Button>}
    </div>}
    {!value.enabled && onRerun && <div className="vs-review-options">
      <Button size="small" icon={<RedoOutlined />} disabled={disabled || rerunDisabled} onClick={onRerun}>Chạy lại build + chụp ảnh</Button>
    </div>}
  </section>;
}
