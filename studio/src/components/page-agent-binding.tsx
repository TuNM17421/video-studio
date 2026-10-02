"use client";

import { LoadingOutlined, LockOutlined, RobotOutlined } from "@ant-design/icons";
import { Select, Tag } from "antd";
import { AGENT_PROVIDER_OPTIONS, EXPERIMENTAL_NOTE, agentProviderLabel, isExperimentalProvider } from "@/lib/agent-providers";
import type { AgentProvider } from "@/lib/types";
import { AgentMark } from "./agent-mark";
import { ProductionState } from "./production-state";
import { SystemStatusPanel } from "./system-settings";

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
  const experimental = isExperimentalProvider(provider);
  const chosen = AGENT_PROVIDER_OPTIONS.find((o) => o.value === provider);
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
      ? <span className="vs-agent-locked"><LockOutlined /><AgentMark provider={provider} />{agentProviderLabel(provider)}{experimental && <Tag className="vs-agent-flag">{EXPERIMENTAL_NOTE}</Tag>}</span>
      : <Select
          className="vs-agent-select"
          // Nhãn "Thử nghiệm" làm dòng dài hơn ô chọn — để popup tự giãn thay vì cắt mất chữ.
          popupMatchSelectWidth={false}
          aria-label="Chọn agent dựng video"
          value={provider}
          loading={loading}
          disabled={disabled}
          onChange={onChange}
          options={AGENT_PROVIDER_OPTIONS.map(({ value, label, experimental: flag }) => ({
            value,
            label: <span className="vs-agent-option"><AgentMark provider={value} />{label}{flag && <Tag className="vs-agent-flag">{EXPERIMENTAL_NOTE}</Tag>}</span>,
          }))}
        />}
    {!loading && experimental && <ProductionState
      className="vs-agent-warning"
      status="review"
      title={chosen?.description || "Agent này đang ở giai đoạn thử nghiệm."}
      detail={null}
    />}
    {/* Whether this Studio is sending its metrics anywhere, and — only when it matters, i.e. Codex is chosen —
        whether 9router is picking up Codex's cost. Settings live one click away, right where the choice is made. */}
    {!loading && <SystemStatusPanel provider={provider} />}
  </section>;
}
