import type { AgentProvider, ReviewSettings } from "./types";
import { agentProviderLabel } from "./agent-providers";

/**
 * Cross-review of scene stills: a separate, read-only session grades what the authoring agent made.
 * Pure (no fs, no env) so the plan form can show who will review before the video even exists.
 */
export const DEFAULT_REVIEW: ReviewSettings = { enabled: true, provider: "auto" };

/** `auto` prefers, in order, an installed CLI other than the author. */
const AUTO_ORDER: AgentProvider[] = ["antigravity", "codex", "claude"];

export type ReviewResolution =
  | { ok: true; provider: AgentProvider; cross: boolean }
  | { ok: false; reason: string };

export function resolveReviewer(author: AgentProvider, settings: ReviewSettings, installed: AgentProvider[]): ReviewResolution {
  if (settings.provider !== "auto") {
    return installed.includes(settings.provider)
      ? { ok: true, provider: settings.provider, cross: settings.provider !== author }
      : { ok: false, reason: `${agentProviderLabel(settings.provider)} chưa được cài trên máy này.` };
  }
  const other = AUTO_ORDER.find((p) => p !== author && installed.includes(p));
  if (other) return { ok: true, provider: other, cross: true };
  if (installed.includes(author)) return { ok: true, provider: author, cross: false };
  return { ok: false, reason: "Máy này chưa cài CLI nào để review (claude, codex hoặc agy)." };
}

/** One line for the UI: who grades, and whether that is actually a second opinion. */
export function describeReviewer(author: AgentProvider, settings: ReviewSettings, installed: AgentProvider[]) {
  if (!settings.enabled) return "Tắt: runner chỉ build, verify và chụp ảnh; không agent nào chấm ảnh.";
  const r = resolveReviewer(author, settings, installed);
  if (!r.ok) return r.reason;
  const who = agentProviderLabel(r.provider);
  return r.cross
    ? `${who} sẽ chấm ảnh, khác ${agentProviderLabel(author)} đang dựng cảnh.`
    : `${who} tự chấm ảnh của chính nó trong một phiên riêng, chỉ đọc${settings.provider === "auto" ? " — máy này chưa có CLI nào khác" : ""}.`;
}

export function normalizeReview(value: unknown, fallback: ReviewSettings = DEFAULT_REVIEW): ReviewSettings {
  const v = (value ?? {}) as Partial<ReviewSettings>;
  const providers = ["auto", "claude", "codex", "antigravity"];
  return {
    enabled: typeof v.enabled === "boolean" ? v.enabled : fallback.enabled,
    provider: providers.includes(String(v.provider)) ? v.provider as ReviewSettings["provider"] : fallback.provider,
  };
}
