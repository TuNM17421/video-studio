import { Tag } from "antd";
import { EXPERIMENTAL_NOTE, agentProviderLabel, isExperimentalProvider } from "@/lib/agent-providers";
import type { AgentProvider } from "@/lib/types";

/**
 * Brand marks for the agent CLIs, drawn inline so the Studio stays asset-free.
 * Claude is Anthropic's radiating burst; the other two are approximations of their marks — swap in the
 * official SVGs if exactness matters.
 */

const RAYS = 11;
const ray = (index: number) => {
  const angle = (360 / RAYS) * index;
  return <rect key={index} x="7.35" y="0.9" width="1.3" height="6.2" rx="0.65" transform={`rotate(${angle} 8 8)`} />;
};

function ClaudeMark() {
  return <svg viewBox="0 0 16 16" width="16" height="16" fill="#d97757" aria-hidden="true" focusable="false">
    {Array.from({ length: RAYS }, (_, index) => ray(index))}
    <circle cx="8" cy="8" r="1.7" />
  </svg>;
}

function CodexMark() {
  return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true" focusable="false">
    <path d="M8 1.6 13.5 4.8v6.4L8 14.4 2.5 11.2V4.8z" strokeLinejoin="round" />
    <path d="M8 5.1 11 6.85v3.3L8 11.9 5 10.15v-3.3z" strokeLinejoin="round" opacity=".55" />
  </svg>;
}

/** Antigravity's "A": one thick round-capped arch, blue at the feet warming to red at the apex. */
function AntigravityMark() {
  return <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" focusable="false">
    <defs>
      {/* vertical, not diagonal: both feet are blue in the real mark and only the apex runs warm */}
      <linearGradient id="vs-agy" x1="8" y1="14" x2="8" y2="2.5" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#4285f4" />
        <stop offset="0.45" stopColor="#34a853" />
        <stop offset="0.78" stopColor="#f9ab00" />
        <stop offset="1" stopColor="#ea4335" />
      </linearGradient>
    </defs>
    <path
      d="M2.6 13.5C4.6 6.8 6 3 8 3s3.4 3.8 5.4 10.5"
      stroke="url(#vs-agy)"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>;
}

const MARKS: Record<AgentProvider, () => React.ReactElement> = {
  claude: ClaudeMark,
  codex: CodexMark,
  antigravity: AntigravityMark,
};

export function AgentMark({ provider }: { provider: AgentProvider }) {
  const Mark = MARKS[provider] ?? ClaudeMark;
  return <span className="vs-agent-mark"><Mark /></span>;
}

/**
 * Tên agent kèm nhãn trạng thái. Nhãn phải đi theo tên ở MỌI chỗ hiện agent, không riêng ô chọn: nhìn
 * thẻ tóm tắt của một video mà không thấy gì thì vẫn tưởng ba agent ngang nhau.
 */
export function AgentName({ provider }: { provider: AgentProvider }) {
  return <>
    {agentProviderLabel(provider)}
    {isExperimentalProvider(provider) && <Tag className="vs-agent-flag">{EXPERIMENTAL_NOTE}</Tag>}
  </>;
}
