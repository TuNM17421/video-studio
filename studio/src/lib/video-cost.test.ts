import { describe, expect, it } from "vitest";
import type { VideoCost } from "./types";
import { billedFromLine, costLabels, summarizeCost, tokenCount } from "./video-cost";

describe("billedFromLine", () => {
  it("reads the per-câu line tts.mjs prints, with or without ElevenLabs' own figure", () => {
    expect(billedFromLine("câu 03 → ElevenLabs … 4.21 s · tính phí 57 ký tự")).toBe(57);
    expect(billedFromLine("câu 12 · Tú → ElevenLabs … 2.00 s · no timestamps · tính phí 130 ký tự (ước)")).toBe(130);
  });

  it("ignores the lines that bill nothing", () => {
    // a request that failed half-way leaves only its prefix; the dry-run lists characters it did not send
    expect(billedFromLine("câu 03 → ElevenLabs … ")).toBeNull();
    expect(billedFromLine("câu 03 · 57 ký tự · new")).toBeNull();
    // the run's own total is a sum of the lines already counted, never a second count
    expect(billedFromLine("· ElevenLabs tính phí 187 ký tự cho 3 câu; các câu còn lại lấy từ cache")).toBeNull();
  });
});

describe("summarizeCost", () => {
  // The shapes agent.ts and qa.ts write into runs.jsonl for each CLI, and agent-step.ts into images/status.json.
  const claude = (costUsd: number) => ({ mode: "agent", status: "done", actor: "claude", costUsd, inputTokens: 10, outputTokens: 5, toolCalls: 3 });
  const codex = (input: number, output: number) => ({ mode: "agent", status: "done", actor: "codex", inputTokens: input, outputTokens: output, toolCalls: 4 });
  // what agent.ts records for agy: no tokens, no price, no tool events in its stream — only the turn count
  const antigravity = { mode: "agent", status: "done", actor: "antigravity", toolCalls: 0, turns: 2 };

  it("keeps each CLI in the unit it reports: Claude in USD, Codex in tokens, Antigravity as a run without a figure", () => {
    const cost = summarizeCost({
      runs: [
        claude(2.5),
        claude(1.255),
        codex(900_000, 40_000),
        antigravity,
        { mode: "agent", status: "error", actor: "codex", toolCalls: 0 }, // CLI never started: nothing ran, nothing spent
        { mode: "agent", status: "running", actor: "claude" }, // still going: its figures are not in yet
        { mode: "deterministic", status: "done" },
      ],
      systemLog: Array(6).fill("Bắt đầu agent · scenes · Claude Code"),
      imageRuns: [
        { agent: "claude", result: "ok", costUsd: 0.2, usage: { input: 8, output: 2500 } },
        { agent: "codex", result: "ok", usage: { input: 60_000, output: 1_200 } },
        { agent: "claude" }, // started, never ended: not counted
      ],
    });
    expect(cost).toEqual({
      agentUsd: 3.96,
      agentRuns: 6,
      pricedRuns: 3,
      tokenRuns: 2,
      tokens: 1_001_200,
      tokenProviders: ["Codex"],
      silentRuns: 1,
      ttsCharacters: 0,
      ttsRuns: 0,
      ttsUnrecorded: 0,
    });
  });

  it("counts agent runs the log saw before the ledger existed as runs without a figure, not as free", () => {
    const cost = summarizeCost({
      runs: [claude(4)],
      systemLog: ["Bắt đầu agent · cues · Claude Code", "Bắt đầu agent · scenes · Claude Code", "Bắt đầu QA ảnh · Codex · phiên riêng, chỉ đọc", "Bắt đầu agent · deliver · Claude Code"],
      imageRuns: [],
    });
    expect(cost).toMatchObject({ agentUsd: 4, agentRuns: 4, pricedRuns: 1, silentRuns: 3 });
  });

  it("sums ElevenLabs characters over the runs that recorded them and flags the older runs", () => {
    const cost = summarizeCost({
      runs: [
        { mode: "deterministic", status: "done", ttsCharacters: 1200 },
        { mode: "deterministic", status: "error", ttsCharacters: 80 }, // failed half-way: still billed
        { mode: "deterministic", status: "done", ttsCharacters: 0 }, // everything cached
      ],
      systemLog: ["Tạo giọng · eleven_flash_v2_5 · nghỉ 1.4 s", "Tạo giọng · eleven_flash_v2_5 · nghỉ 1.4 s", "Tạo giọng · eleven_flash_v2_5 · nghỉ 1.4 s", "Tạo giọng · eleven_turbo_v2_5 · nghỉ 1.4 s", "Nhập giọng · 01 · nghỉ 1.4 s"],
      imageRuns: [],
    });
    expect(cost).toMatchObject({ ttsCharacters: 1280, ttsRuns: 3, ttsUnrecorded: 1 });
  });
});

describe("costLabels", () => {
  const base: VideoCost = { agentUsd: 0, agentRuns: 0, pricedRuns: 0, tokenRuns: 0, tokens: 0, tokenProviders: [], silentRuns: 0, ttsCharacters: 0, ttsRuns: 0, ttsUnrecorded: 0 };

  it("says nothing about what never ran", () => {
    expect(costLabels(base)).toEqual({ agent: null, tts: null });
  });

  it("a video made with Claude Code: its price", () => {
    expect(costLabels({ ...base, agentUsd: 12.5, agentRuns: 5, pricedRuns: 5 }).agent).toMatchObject({ known: true, value: "$12.50", missing: null });
  });

  it("a video made with Codex: its tokens, and never a made-up price", () => {
    const agent = costLabels({ ...base, agentRuns: 3, tokenRuns: 3, tokens: 1_234_567, tokenProviders: ["Codex"] }).agent;
    expect(agent).toMatchObject({ known: true, value: "1,2 triệu token Codex", missing: null });
    expect(agent?.note).toMatch(/báo 1,2 triệu token vào \+ ra nhưng không báo giá/);
  });

  it("a video made with Antigravity, or before the ledger: no figure, and it says so", () => {
    expect(costLabels({ ...base, agentRuns: 3, silentRuns: 3, ttsRuns: 0, ttsUnrecorded: 2 })).toMatchObject({
      agent: { known: false, value: "chưa có số", missing: "3 lượt không báo số" },
      tts: { known: false, value: "chưa có số", missing: "2 lượt trước khi ghi số" },
    });
  });

  it("mixed CLIs: the price first, and what it leaves out beside it", () => {
    const agent = costLabels({ ...base, agentUsd: 3.2, agentRuns: 6, pricedRuns: 3, tokenRuns: 2, tokens: 45_210, tokenProviders: ["Codex"], silentRuns: 1 }).agent;
    expect(agent).toMatchObject({ value: "$3.20", missing: "+ 45 nghìn token Codex · thiếu 1 lượt" });
  });

  it("ElevenLabs characters, and the runs they leave out", () => {
    expect(costLabels({ ...base, ttsCharacters: 8450, ttsRuns: 2, ttsUnrecorded: 1 }).tts).toMatchObject({ known: true, value: "8.450 ký tự", missing: "thiếu 1 lượt" });
  });
});

describe("tokenCount", () => {
  it("rounds to an order of magnitude a member can read", () => {
    expect(tokenCount(812)).toBe("812");
    expect(tokenCount(45_210)).toBe("45 nghìn");
    expect(tokenCount(1_234_567)).toBe("1,2 triệu");
  });
});
