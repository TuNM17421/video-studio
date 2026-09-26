/**
 * What a voice step costs, for the telemetry dashboard. ElevenLabs is the only paid path: it charges credits, and the
 * credits a character costs depend on the model, so the truth is the account's own counter read before and after the
 * run. Kaggle (free GPU quota), the local model and recorded audio cost nothing by construction — a known zero, which
 * the dashboard must not confuse with "unknown".
 */

export interface VoiceCost {
  provider: string;
  characters?: number;
  credits?: number;
  gpuSeconds?: number;
  costUsd?: number;
  costSource?: "server_price_estimate" | "no_charge";
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
 * Credits charged = counter after − before (null if either read failed, or the counter went backwards at a monthly
 * reset). Dollars only with a plan price (`STUDIO_ELEVENLABS_USD_PER_1K_CREDITS`); without one the dashboard still
 * shows characters/credits and the cost stays unavailable rather than invented.
 */
export function elevenLabsCost(
  characters: number | null,
  before: number | null,
  after: number | null,
  env: NodeJS.ProcessEnv = process.env,
): VoiceCost {
  const credits = before !== null && after !== null && after >= before ? after - before : null;
  const rate = Number(env.STUDIO_ELEVENLABS_USD_PER_1K_CREDITS);
  const basis = credits ?? characters;
  return {
    provider: "elevenlabs",
    ...(characters !== null ? { characters } : {}),
    ...(credits !== null ? { credits } : {}),
    ...(Number.isFinite(rate) && rate >= 0 && basis !== null
      ? { costUsd: Math.round(((basis * rate) / 1000) * 1e6) / 1e6, costSource: "server_price_estimate" as const }
      : {}),
  };
}

export const freeVoiceCost = (provider: "kaggle" | "omnivoice-local" | "import", gpuSeconds?: number): VoiceCost => ({
  provider,
  ...(gpuSeconds !== undefined ? { gpuSeconds: Math.round(gpuSeconds) } : {}),
  costUsd: 0,
  costSource: "no_charge",
});
