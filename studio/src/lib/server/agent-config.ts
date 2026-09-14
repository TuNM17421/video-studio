import type { AgentConfig, AgentProvider } from "../types";
import { AGENT_PROVIDER_OPTIONS, isAgentProvider } from "../agent-providers";

function booleanEnv(name: string, value: string | undefined, fallback: boolean) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(`${name} phải là 1/0, true/false, yes/no hoặc on/off.`);
}

export function readAgentConfig(env: Record<string, string | undefined> = process.env): AgentConfig {
  const rawProvider = env.STUDIO_AGENT_PROVIDER?.trim().toLowerCase() || "claude";
  if (!isAgentProvider(rawProvider)) {
    throw new Error(`STUDIO_AGENT_PROVIDER chỉ nhận giá trị ${AGENT_PROVIDER_OPTIONS.map((o) => o.value).join(", ")}.`);
  }
  return {
    defaultProvider: rawProvider,
    selectionLocked: booleanEnv("STUDIO_AGENT_PROVIDER_LOCKED", env.STUDIO_AGENT_PROVIDER_LOCKED, false),
  };
}

export function resolveAgentProvider(requested: unknown, config: AgentConfig): AgentProvider {
  const provider = requested === undefined || requested === null || requested === "" ? config.defaultProvider : requested;
  if (!isAgentProvider(provider)) throw new Error("Agent không hợp lệ.");
  if (config.selectionLocked && provider !== config.defaultProvider) {
    throw new Error("Studio đang khóa agent theo cấu hình hệ thống.");
  }
  return provider;
}
