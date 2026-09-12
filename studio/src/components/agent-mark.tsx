import type { AgentProvider } from "@/lib/types";

/**
 * Brand marks for the agent CLIs, drawn inline so the Studio stays asset-free.
 * Claude is Anthropic's radiating burst; Codex is OpenAI's six-fold knot.
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

export function AgentMark({ provider }: { provider: AgentProvider }) {
  return <span className="vs-agent-mark">{provider === "claude" ? <ClaudeMark /> : <CodexMark />}</span>;
}
