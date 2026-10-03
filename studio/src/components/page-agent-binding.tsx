"use client";

import { LoadingOutlined, LockOutlined } from "@ant-design/icons";
import { Select, Tag } from "antd";
import { AGENT_PROVIDER_OPTIONS, EXPERIMENTAL_NOTE, agentProviderLabel, isExperimentalProvider } from "@/lib/agent-providers";
import type { AgentProvider } from "@/lib/types";
import { AgentMark } from "./agent-mark";

/**
 * Ô chọn agent của mục "Ai làm" ở bước Kế hoạch. Trước đây là một thẻ nổi cạnh tiêu đề trang, nặng hơn cả
 * tiêu đề, cho một lựa chọn đã có sẵn mặc định; giờ nó là một trường của form, đứng cạnh hai lựa chọn cùng
 * trả lời câu "ai làm": dựng cảnh bằng gì, ai review.
 *
 * `selectionLocked` (cấu hình máy ấn định agent) thì hiện tên kèm khoá thay cho ô chọn.
 */
export function AgentField({ provider, selectionLocked, disabled, loading, onChange }: {
  provider: AgentProvider;
  selectionLocked: boolean;
  disabled: boolean;
  loading: boolean;
  onChange: (provider: AgentProvider) => void;
}) {
  if (loading) return <span className="vs-agent-locked is-loading"><LoadingOutlined spin />Đang tải…</span>;
  if (selectionLocked) {
    return <span className="vs-agent-locked" title="Được ấn định bởi cấu hình máy.">
      <LockOutlined /><AgentMark provider={provider} />{agentProviderLabel(provider)}
      {isExperimentalProvider(provider) && <Tag className="vs-agent-flag">{EXPERIMENTAL_NOTE}</Tag>}
    </span>;
  }
  return <Select
    className="vs-who-agent"
    // Nhãn "Thử nghiệm" làm dòng dài hơn ô chọn — để popup tự giãn thay vì cắt mất chữ.
    popupMatchSelectWidth={false}
    aria-label="Chọn agent dựng video"
    value={provider}
    disabled={disabled}
    onChange={onChange}
    options={AGENT_PROVIDER_OPTIONS.map(({ value, label, experimental: flag }) => ({
      value,
      label: <span className="vs-agent-option"><AgentMark provider={value} />{label}{flag && <Tag className="vs-agent-flag">{EXPERIMENTAL_NOTE}</Tag>}</span>,
    }))}
  />;
}
