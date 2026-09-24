import type { AgentProvider } from "./types";

/**
 * `experimental` không nói về chất lượng code của agent, mà về **rào chắn**: Claude có allowlist +
 * denylist theo từng lệnh, Codex chạy trong sandbox `workspace-write`, còn `agy` không có cả hai —
 * chạy headless là nó toàn quyền trên máy, chỉ còn câu prompt dặn nó đừng. Trong lần chạy thử nó có
 * tự quét ổ đĩa và dò tiến trình. Nên để nó ở đó như một lựa chọn, nhưng đừng để ai chọn nhầm.
 */
export const AGENT_PROVIDER_OPTIONS: {
  value: AgentProvider;
  label: string;
  description: string;
  experimental?: boolean;
}[] = [
  { value: "claude", label: "Claude Code", description: "Chạy bằng Claude Code CLI đã đăng nhập trên máy." },
  { value: "codex", label: "Codex", description: "Chạy bằng Codex CLI đã đăng nhập trên máy. Sandbox workspace-write không giới hạn được theo thư mục, nên Codex ghi được khắp repo; phần soát trích đoạn vì thế tự tải lại trang gốc khi thấy chữ đã lưu bị sửa." },
  {
    value: "antigravity",
    label: "Antigravity",
    description: "Chạy bằng Antigravity CLI (`agy`) đã đăng nhập trên máy. Không có sandbox hay allowlist như hai agent kia — nó toàn quyền trên máy bạn. Ưu tiên Claude Code hoặc Codex.",
    experimental: true,
  },
];

export const EXPERIMENTAL_NOTE = "Thử nghiệm";

export function isAgentProvider(value: unknown): value is AgentProvider {
  return AGENT_PROVIDER_OPTIONS.some((option) => option.value === value);
}

export function agentProviderLabel(provider: AgentProvider) {
  return AGENT_PROVIDER_OPTIONS.find((option) => option.value === provider)?.label ?? provider;
}

export function isExperimentalProvider(provider: AgentProvider) {
  return AGENT_PROVIDER_OPTIONS.find((option) => option.value === provider)?.experimental ?? false;
}
