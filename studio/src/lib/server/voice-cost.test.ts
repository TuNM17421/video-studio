import { describe, expect, it } from "vitest";
import { elevenCreditsUsed, elevenLabsCost, freeVoiceCost } from "./voice-cost";

const asEnv = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv;
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("voice cost", () => {
  it("reads the account's credit counter, and null when the key cannot", async () => {
    expect(await elevenCreditsUsed("k", reply(200, { character_count: 12345 }))).toBe(12345);
    expect(await elevenCreditsUsed("k", reply(401, { detail: "missing_permissions" }))).toBeNull();
    expect(await elevenCreditsUsed("k", (async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeNull();
  });

  it("charges the credits the account actually lost, priced only when the plan price is set", () => {
    expect(elevenLabsCost(1200, 5000, 5600, asEnv({}))).toEqual({ provider: "elevenlabs", characters: 1200, credits: 600 });
    expect(elevenLabsCost(1200, 5000, 5600, asEnv({ STUDIO_ELEVENLABS_USD_PER_1K_CREDITS: "0.3" })))
      .toMatchObject({ credits: 600, costUsd: 0.18, costSource: "server_price_estimate" });
  });

  it("falls back to characters when the counter is unreadable or reset, and never invents credits", () => {
    const env = asEnv({ STUDIO_ELEVENLABS_USD_PER_1K_CREDITS: "0.3" });
    expect(elevenLabsCost(1000, null, null, env)).toEqual({ provider: "elevenlabs", characters: 1000, costUsd: 0.3, costSource: "server_price_estimate" });
    expect(elevenLabsCost(1000, 90_000, 200, env).credits).toBeUndefined();
  });

  it("free paths are a known zero, with Kaggle GPU time kept", () => {
    expect(freeVoiceCost("kaggle", 540.4)).toEqual({ provider: "kaggle", gpuSeconds: 540, costUsd: 0, costSource: "no_charge" });
    expect(freeVoiceCost("omnivoice-local")).toEqual({ provider: "omnivoice-local", costUsd: 0, costSource: "no_charge" });
  });
});
