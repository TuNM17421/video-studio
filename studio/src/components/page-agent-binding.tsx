"use client";

import { LoadingOutlined, LockOutlined, RobotOutlined } from "@ant-design/icons";
import { Select } from "antd";
import { AGENT_PROVIDER_OPTIONS, agentProviderLabel } from "@/lib/agent-providers";
import type { AgentProvider } from "@/lib/types";
import { AgentMark } from "./agent-mark";

export function PageAgentBinding({
  provider,
  selectionLocked,
  immutable,
  disabled,
  loading,
  onChange,
}: {
  provider: AgentProvider;
  selectionLocked: boolean;
  immutable: boolean;
  disabled: boolean;
  loading: boolean;
  onChange?: (provider: AgentProvider) => void;
}) {
  const locked = immutable || selectionLocked;
  const description = loading
    ? "Đang tải cấu hình agent…"
    : immutable
      ? "Đã gắn cố định với video này."
      : selectionLocked
        ? "Được ấn định bởi cấu hình máy."
        : "Chọn một lần trước khi tạo video.";

  return <section className="vs-page-agent" aria-label="Agent dựng video" aria-busy={loading}>
    <div className="vs-page-agent-copy">
      <span className="vs-page-agent-icon" aria-hidden="true"><RobotOutlined /></span>
      <span>
        <strong>Agent dựng video</strong>
        <small>{description}</small>
      </span>
    </div>
    {loading
      ? <span className="vs-agent-locked is-loading"><LoadingOutlined spin />Đang tải…</span>
      : locked
      ? <span className="vs-agent-locked"><LockOutlined /><AgentMark provider={provider} />{agentProviderLabel(provider)}</span>
      : <Select
          className="vs-agent-select"
          aria-label="Chọn agent dựng video"
          value={provider}
          loading={loading}
          disabled={disabled}
          onChange={onChange}
          options={AGENT_PROVIDER_OPTIONS.map(({ value, label }) => ({
            value,
            label: <span className="vs-agent-option"><AgentMark provider={value} />{label}</span>,
          }))}
        />}
  </section>;
}
