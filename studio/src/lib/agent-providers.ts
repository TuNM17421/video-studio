import type { AgentProvider } from "./types";

export const AGENT_PROVIDER_OPTIONS: { value: AgentProvider; label: string; description: string }[] = [
  { value: "claude", label: "Claude Code", description: "Chạy bằng Claude Code CLI đã đăng nhập trên máy." },
  { value: "codex", label: "Codex", description: "Chạy bằng Codex CLI đã đăng nhập trên máy." },
  { value: "antigravity", label: "Antigravity", description: "Chạy bằng Antigravity CLI (`agy`) đã đăng nhập trên máy." },
];

export function isAgentProvider(value: unknown): value is AgentProvider {
  return AGENT_PROVIDER_OPTIONS.some((option) => option.value === value);
}

export function agentProviderLabel(provider: AgentProvider) {
  return AGENT_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}
