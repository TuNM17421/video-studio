/**
 * What a voice step costs, for the telemetry dashboard. ElevenLabs is the only paid path, priced from the
 * public rate of the model actually used (pricing-catalog.ts) — never a flat rate applied to every model alike.
 * Kaggle (free GPU quota), the local model and recorded audio cost nothing by construction — a known zero, which
 * the dashboard must not confuse with "unknown".
 */
import { ELEVENLABS_PRICING } from "./pricing-catalog";

export interface VoiceCost {
  provider: string;
  model?: string;
  characters?: number;
  credits?: number;
  gpuSeconds?: number;
  costUsd?: number;
  costSource?: "server_price_estimate" | "no_charge";
}

// The credit counter is account-wide, but Studio runs voice jobs per video. When two runs' before/after reads
// overlap, each one's delta contains the other's spend, so neither may claim it (same rule as gateway.ts).
const g = globalThis as typeof globalThis & { __studioCreditRuns?: Map<string, { overlapped: boolean }> };
const creditRuns = (g.__studioCreditRuns ??= new Map());

export function beginCreditRun(token: string) {
  for (const run of creditRuns.values()) run.overlapped = true;
  creditRuns.set(token, { overlapped: creditRuns.size > 0 });
}

/** True when another run shared the counter at any point; always forgets the run. */
export function endCreditRun(token: string) {
  const overlapped = creditRuns.get(token)?.overlapped ?? false;
  creditRuns.delete(token);
  return overlapped;
}

/** The account's used-credit counter, or null when the key cannot read it (scoped keys lack user_read). */
export async function elevenCreditsUsed(key: string, fetcher: typeof fetch = fetch): Promise<number | null> {
  try {
    const res = await fetcher("https://api.elevenlabs.io/v1/user/subscription", {
      headers: { "xi-api-key": key },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const count = Number(((await res.json()) as { character_count?: unknown }).character_count);
    return Number.isFinite(count) && count >= 0 ? count : null;
  } catch {
    return null;
  }
}

/**
 * Priced from characters × the model's own published rate — not from account credits: ElevenLabs' internal
 * credit cost per character isn't published and can differ by model, so pricing off it would need a second,
 * unverifiable conversion (a flat $/1k-credits rate applied to every model alike used to do exactly that, and
 * silently mis-priced whichever model the rate wasn't tuned for — see COST-COMPARISON-2026-09-26.md).
 * Credits are still recorded (`credits`), as the account's own truth for cross-checking, just not what prices it.
 * A model missing from `pricing-catalog.ts`, or no character count, leaves cost unavailable — never a guessed rate.
 */
export function elevenLabsCost(model: string | undefined, characters: number | null, before: number | null, after: number | null): VoiceCost {
  const credits = before !== null && after !== null && after >= before ? after - before : null;
  const entry = model ? ELEVENLABS_PRICING[model] : undefined;
  return {
    provider: "elevenlabs",
    ...(model ? { model } : {}),
    ...(characters !== null ? { characters } : {}),
    ...(credits !== null ? { credits } : {}),
    ...(entry && characters !== null
      ? { costUsd: Math.round(((characters * entry.usdPer1kChars) / 1000) * 1e6) / 1e6, costSource: "server_price_estimate" as const }
      : {}),
  };
}

export const freeVoiceCost = (provider: "kaggle" | "omnivoice-local" | "import", gpuSeconds?: number): VoiceCost => ({
  provider,
  ...(gpuSeconds !== undefined ? { gpuSeconds: Math.round(gpuSeconds) } : {}),
  costUsd: 0,
  costSource: "no_charge",
});
