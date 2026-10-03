import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real jobs, harness, encrypted log writer and ledger, isolated from all user data and network.
const fixture = vi.hoisted(() => ({ root: "", provider: "claude", fail: false, large: false, packets: [] as string[] }));
fixture.root = fs.mkdtempSync(path.join(os.tmpdir(), "vs-telemetry-lifecycle-"));
vi.mock("./paths", async (original) => {
  const actual = await original<typeof import("./paths")>();
  return { ...actual, REPO: fixture.root,
    projectDir: (id: string) => path.join(fixture.root, "projects", id),
    stateDir: (id: string) => path.join(fixture.root, "projects", id, ".studio"),
    videoDir: (id: string) => path.join(fixture.root, "videos", id),
    voiceOut: (id: string) => path.join(fixture.root, "voice", id),
    rel: (file: string) => path.relative(fixture.root, file),
  };
});
vi.mock("./videos", () => ({
  readState: () => ({ state: { agent: { provider: fixture.provider, sessionId: null }, review: { enabled: true, provider: fixture.provider }, request: { day: "Day01", style: "lesson", modules: [] } } }),
  updateState: () => {}, setStage: () => {}, styleName: () => "Lesson",
  cuesInfo: async () => ({ cues: [{ n: 1, start: 0, end: 30 }] }),
}));
vi.mock("./style-guides", () => ({ styleGuideLine: () => "", styleQaCriteria: () => [] }));
vi.mock("./images", () => ({ scenesImagesLine: () => "" }));
vi.mock("./agent-config", () => ({ agentBin: () => "fake-agent", installedAgents: () => ["claude", "codex"] }));
vi.mock("./gateway", async (original) => {
  const actual = await original<typeof import("./gateway")>();
  return { ...actual,
    activeGateway: async () => ({ cfg: { key: "test", db: path.join(fixture.root, "missing.sqlite"), profile: "test", modelPrefix: "" } }),
    endGatewayRun: (token: string, cfg: import("./gateway").GatewayConfig, cli: object) => actual.endGatewayRun(token, cfg, cli, { settleMs: 0 }),
  };
});
vi.mock("./jobs", async (original) => {
  const actual = await original<typeof import("./jobs")>();
  return { ...actual, run: async (_id: string, cmd: string, args: string[], opts: { cwd?: string; onLine?: (line: string, stream: "stdout" | "stderr") => void }) => {
    if (cmd === "npm" || args[0]?.includes("tts.mjs") || args[0]?.includes("shoot.mjs")) return 0;
    if (opts.cwd) fixture.packets.push(opts.cwd);
    if (fixture.large) opts.onLine?.("x".repeat(300_000), "stdout");
    const report = { verdict: "pass", summary: "ok", findings: [] };
    const event = fixture.provider === "codex"
      ? { type: "turn.completed", usage: { input_tokens: 100, output_tokens: 10 } }
      : { type: "result", subtype: "success", result: JSON.stringify(report), total_cost_usd: 0.12, usage: { input_tokens: 100, output_tokens: 10 } };
    opts.onLine?.(JSON.stringify(event), "stdout");
    if (fixture.fail) throw Error("fake process failure after usage");
    // Codex QA uses a last-message file rather than its event stream.
    const last = args.indexOf("--output-last-message");
    if (last >= 0) fs.writeFileSync(args[last + 1], JSON.stringify(report));
    return 0;
  } };
});

const { runAgent } = await import("./agent");
const { runReviewJob } = await import("./qa");
const { currentJob, isRunning, logs, registry } = await import("./jobs");
const { readRuns, recordAiLog } = await import("./workflow");
const { beginGatewayRun, endGatewayRun, resetGatewayRunsForTests } = await import("./gateway");

beforeEach(() => {
  fixture.provider = "claude"; fixture.fail = false; fixture.large = false; fixture.packets = [];
  vi.stubEnv("STUDIO_TELEMETRY_AI_LOGS", "1");
  vi.stubEnv("STUDIO_TELEMETRY_AI_LOG_KEY", "");
  vi.stubEnv("STUDIO_TELEMETRY_URL", "");
  vi.stubEnv("STUDIO_TELEMETRY_TOKEN", "");
  registry.telemetry = { url: "", token: "", autoSync: false };
});
afterEach(() => {
  registry.jobs.clear(); registry.logs.clear(); registry.telemetry = null;
  resetGatewayRunsForTests(); vi.unstubAllEnvs();
});
afterAll(() => fs.rmSync(fixture.root, { recursive: true, force: true }));

describe("telemetry failure isolation", () => {
  it("reproduces the underlying missing-key and oversized-transcript exceptions", () => {
    expect(() => recordAiLog(fixture.root, "probe", { source: "studio", runId: "test", kind: "test", text: "hi" })).toThrow(/32 bytes/);
    expect(() => recordAiLog(fixture.root, "probe", { source: "studio", runId: "test", kind: "test", text: "x".repeat(300_000) })).toThrow(/256 KiB/);
  });

  it.each(["", "invalid-base64"])("agent finishes and retains usage when log key is %j", async (key) => {
    vi.stubEnv("STUDIO_TELEMETRY_AI_LOG_KEY", key);
    const id = key ? "agent-bad-key" : "agent-no-key";
    expect(await runAgent(id, "cues", "http://unused")).toBe(true);
    expect(isRunning(id)).toBe(false);
    expect(currentJob(id)?.status).toBe("done");
    expect(readRuns(fixture.root, id)[0]).toMatchObject({ status: "done", inputTokens: 100, costUsd: 0.12 });
    expect(logs(id).some((line) => line.text.includes("Không ghi được AI log"))).toBe(true);
  });

  it("an oversized agent transcript is cut, encrypted, and cannot hang the job", async () => {
    fixture.large = true;
    vi.stubEnv("STUDIO_TELEMETRY_AI_LOG_KEY", Buffer.alloc(32, 7).toString("base64"));
    expect(await runAgent("agent-large", "cues", "http://unused")).toBe(true);
    expect(isRunning("agent-large")).toBe(false);
    expect(logs("agent-large").some((line) => line.text.includes("đã cắt"))).toBe(true);
  });

  it("QA finishes, retains cost, and removes its packet despite missing log key", async () => {
    await runReviewJob("qa-no-key", "http://unused");
    expect(currentJob("qa-no-key")?.status).toBe("done");
    expect(isRunning("qa-no-key")).toBe(false);
    expect(readRuns(fixture.root, "qa-no-key").find((run: { stage: string }) => run.stage === "scenes.qa"))
      .toMatchObject({ status: "done", inputTokens: 100, costUsd: 0.12 });
    expect(fixture.packets).toHaveLength(1);
    expect(fs.existsSync(fixture.packets[0])).toBe(false);
  });

  it.each(["agent", "qa"])("a throwing %s process still records usage, finishes error and closes the gateway window", async (kind) => {
    fixture.provider = "codex"; fixture.fail = true;
    const id = `throw-${kind}`;
    if (kind === "agent") expect(await runAgent(id, "cues", "http://unused")).toBe(false);
    else await runReviewJob(id, "http://unused");
    expect(isRunning(id)).toBe(false);
    expect(currentJob(id)?.status).toBe("error");
    expect(readRuns(fixture.root, id).find((run: { stage: string }) => run.stage === (kind === "agent" ? "cues" : "scenes.qa")))
      .toMatchObject({ status: "error", inputTokens: 100 });
    for (const packet of fixture.packets) expect(fs.existsSync(packet)).toBe(false);
    beginGatewayRun("next", Date.now() + 10_000);
    const result = await endGatewayRun("next", { key: "test", db: "missing", profile: "test", modelPrefix: "" }, {});
    expect(result.gatewayStatus).not.toBe("overlap");
  });
});
