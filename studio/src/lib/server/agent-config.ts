import fs from "node:fs";
import path from "node:path";
import type { AgentConfig, AgentProvider, ReviewSettings } from "../types";
import { AGENT_PROVIDER_OPTIONS, isAgentProvider } from "../agent-providers";
import { DEFAULT_REVIEW } from "../review";

type BaseConfig = Omit<AgentConfig, "review">;

function booleanEnv(name: string, value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`${name} phải là 1/0, true/false, yes/no hoặc on/off.`);
}

export function readAgentConfig(env: Record<string, string | undefined> = process.env): BaseConfig {
  const rawProvider = env.STUDIO_AGENT_PROVIDER?.trim().toLowerCase() || "claude";
  if (!isAgentProvider(rawProvider)) {
    throw new Error(`STUDIO_AGENT_PROVIDER chỉ nhận giá trị ${AGENT_PROVIDER_OPTIONS.map((o) => o.value).join(", ")}.`);
  }
  return {
    defaultProvider: rawProvider,
    selectionLocked: booleanEnv("STUDIO_AGENT_PROVIDER_LOCKED", env.STUDIO_AGENT_PROVIDER_LOCKED, false),
  };
}

export function resolveAgentProvider(requested: unknown, config: BaseConfig): AgentProvider {
  const provider = requested === undefined || requested === null || requested === "" ? config.defaultProvider : requested;
  if (!isAgentProvider(provider)) throw new Error("Agent không hợp lệ.");
  if (config.selectionLocked && provider !== config.defaultProvider) {
    throw new Error("Studio đang khóa agent theo cấu hình hệ thống.");
  }
  return provider;
}

/** The CLI each provider runs as; the same env overrides the agent adapters use. */
export const agentBin = (provider: AgentProvider, env: Record<string, string | undefined> = process.env) => ({
  claude: env.CLAUDE_BIN || "claude",
  codex: env.CODEX_BIN || "codex",
  antigravity: env.ANTIGRAVITY_BIN || "agy",
})[provider];

/** Is this CLI installed? A path is checked as is; a bare name is looked up on PATH (with Windows shims). */
function onPath(bin: string) {
  if (bin.includes("/") || bin.includes("\\")) return fs.existsSync(bin);
  const exts = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  return (process.env.PATH || "").split(path.delimiter).filter(Boolean)
    .some((dir) => exts.some((ext) => fs.existsSync(path.join(dir, bin + ext))));
}

export function installedAgents(): AgentProvider[] {
  return AGENT_PROVIDER_OPTIONS.map((o) => o.value).filter((p) => onPath(agentBin(p)));
}

/**
 * Cross-review defaults for a new video. On unless STUDIO_REVIEW=0; `STUDIO_QA_PROVIDER` pins who grades
 * (claude | codex | antigravity | auto). Each video then keeps its own setting in state.json.
 */
export function reviewDefaults(env: Record<string, string | undefined> = process.env): ReviewSettings {
  const raw = env.STUDIO_QA_PROVIDER?.trim().toLowerCase() || "auto";
  if (raw !== "auto" && !isAgentProvider(raw)) throw new Error("STUDIO_QA_PROVIDER chỉ nhận auto, claude, codex hoặc antigravity.");
  return {
    enabled: booleanEnv("STUDIO_REVIEW", env.STUDIO_REVIEW, DEFAULT_REVIEW.enabled),
    provider: raw as ReviewSettings["provider"],
  };
}

export function readStudioConfig(): AgentConfig {
  return { ...readAgentConfig(), review: { defaults: reviewDefaults(), installed: installedAgents() } };
}
