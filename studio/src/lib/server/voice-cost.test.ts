import { afterEach, describe, expect, it, vi } from "vitest";
import { billedCharacters, elevenCreditsUsed, elevenLabsCost, freeVoiceCost } from "./voice-cost";

const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("voice cost", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each(["", "   ", "0"])("an obsolete credit rate %j cannot label unknown cost as measured zero", (rate) => {
    vi.stubEnv("STUDIO_ELEVENLABS_USD_PER_1K_CREDITS", rate);
    const unknown = elevenLabsCost(undefined, 1200, 5000, 5600);
    expect(unknown.costUsd).toBeUndefined();
    expect(unknown.costSource).toBeUndefined();
    expect(elevenLabsCost("eleven_v3", 1200, 5000, 5600)).toMatchObject({ costUsd: 0.12, costSource: "server_price_estimate" });
  });
  it("reads the account's credit counter, and null when the key cannot", async () => {
    expect(await elevenCreditsUsed("k", reply(200, { character_count: 12345 }))).toBe(12345);
    expect(await elevenCreditsUsed("k", reply(401, { detail: "missing_permissions" }))).toBeNull();
    expect(await elevenCreditsUsed("k", (async () => { throw new Error("offline"); }) as unknown as typeof fetch)).toBeNull();
  });

  it("prices from characters × the model's published rate, and still records credits for cross-checking", () => {
    expect(elevenLabsCost("eleven_turbo_v2_5", 1200, 5000, 5600))
      .toEqual({ provider: "elevenlabs", model: "eleven_turbo_v2_5", characters: 1200, credits: 600, costUsd: 0.06, costSource: "server_price_estimate" });
    // v3 is double the rate of Turbo/Flash v2.5 — the exact conflation a single flat rate used to hide.
    expect(elevenLabsCost("eleven_v3", 1200, 5000, 5600))
      .toMatchObject({ costUsd: 0.12, costSource: "server_price_estimate" });
  });

  it("never prices off credits: an unreadable or reset counter still gets a price from characters alone", () => {
    expect(elevenLabsCost("eleven_turbo_v2_5", 1000, null, null))
      .toEqual({ provider: "elevenlabs", model: "eleven_turbo_v2_5", characters: 1000, costUsd: 0.05, costSource: "server_price_estimate" });
    const resetCounter = elevenLabsCost("eleven_turbo_v2_5", 1000, 90_000, 200);
    expect(resetCounter.credits).toBeUndefined();
    expect(resetCounter.costUsd).toBe(0.05);
  });

  it("a model missing from the catalog, or no character count, leaves cost unavailable — never a guessed rate", () => {
    expect(elevenLabsCost("eleven_v2_unlisted", 1000, null, null)).toEqual({ provider: "elevenlabs", model: "eleven_v2_unlisted", characters: 1000 });
    expect(elevenLabsCost(undefined, 1000, null, null)).toEqual({ provider: "elevenlabs", characters: 1000 });
    expect(elevenLabsCost("eleven_turbo_v2_5", null, 5000, 5600)).toEqual({ provider: "elevenlabs", model: "eleven_turbo_v2_5", credits: 600 });
  });

  it("free paths are a known zero, with Kaggle GPU time kept", () => {
    expect(freeVoiceCost("kaggle", 540.4)).toEqual({ provider: "kaggle", gpuSeconds: 540, costUsd: 0, costSource: "no_charge" });
    expect(freeVoiceCost("omnivoice-local")).toEqual({ provider: "omnivoice-local", costUsd: 0, costSource: "no_charge" });
  });
});

describe("which characters price a run", () => {
  it("prices a run stopped part-way by what it was billed, not by the whole video's forecast", () => {
    // 30 câu / 4500 ký tự forecast, Dừng sau câu 5 (700 ký tự đã in dòng tính phí). Lấy forecast thì ghi
    // $0,225 cho một lượt tốn $0,035.
    expect(billedCharacters(5, 700, 5)).toBe(700);
    expect(elevenLabsCost("eleven_turbo_v2_5", billedCharacters(5, 700, 5), null, null).costUsd).toBe(0.035);
  });

  it("a câu regenerated because its word marks were missing is not a measured zero", () => {
    // Dry-run coi câu có .pcm là cached (billable 0); lượt thật đòi cả .align.json nên sinh lại và bị tính phí.
    const measured = elevenLabsCost("eleven_turbo_v2_5", billedCharacters(1, 240, 1), null, null);
    expect(measured).toMatchObject({ characters: 240, costUsd: 0.012, costSource: "server_price_estimate" });
    const forecast = elevenLabsCost("eleven_turbo_v2_5", 0, null, null);
    expect(forecast).toMatchObject({ costUsd: 0, costSource: "server_price_estimate" });
  });

  it("requests without a billing line stay unmeasured; no request at all is a real zero", () => {
    // Chết giữa request đầu, hoặc billedFromLine lệch định dạng dòng của tts.mjs.
    expect(billedCharacters(3, 0, 0)).toBeNull();
    expect(elevenLabsCost("eleven_turbo_v2_5", billedCharacters(3, 0, 0), null, null).costUsd).toBeUndefined();
    // Mọi câu lấy từ cache: lượt này thật sự không tốn gì.
    expect(billedCharacters(0, 0, 0)).toBe(0);
    expect(elevenLabsCost("eleven_turbo_v2_5", billedCharacters(0, 0, 0), null, null).costUsd).toBe(0);
  });
});

describe("credit counter overlap", () => {
  it("a lone run keeps its credits; two overlapping runs both lose them", async () => {
    const { beginCreditRun, endCreditRun } = await import("./voice-cost");
    beginCreditRun("solo");
    expect(endCreditRun("solo")).toBe(false);
    beginCreditRun("a");
    beginCreditRun("b"); // b starts while a is still reading the counter
    expect(endCreditRun("a")).toBe(true);
    expect(endCreditRun("b")).toBe(true);
    // Both closed: the next run is clean again, nothing is left over.
    beginCreditRun("c");
    expect(endCreditRun("c")).toBe(false);
  });
});
