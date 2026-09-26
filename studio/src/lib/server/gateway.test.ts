import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { activeGateway, beginGatewayRun, endGatewayRun, gatewayConfig, withGatewayArgs, withGatewayEnv } from "./gateway";

const T0 = Date.parse("2026-09-26T03:00:00.000Z");

/** A 9router-shaped DB: the two tables Studio reads, nothing else. */
function fakeRouter(rows: { at: number; key: string; input: number; output: number; cost: number }[] = []) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gw-")), "data.sqlite");
  const db = new DatabaseSync(file);
  db.exec(`CREATE TABLE apiKeys (id TEXT, key TEXT, name TEXT, machineId TEXT, isActive INTEGER, createdAt TEXT);
    CREATE TABLE usageHistory (id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL, provider TEXT, model TEXT, connectionId TEXT,
      apiKey TEXT, endpoint TEXT, promptTokens INTEGER DEFAULT 0, completionTokens INTEGER DEFAULT 0, cost REAL DEFAULT 0, status TEXT, tokens TEXT, meta TEXT);`);
  db.prepare("INSERT INTO apiKeys VALUES ('1', 'sk-default', 'Default Key', 'm', 1, '')").run();
  db.prepare("INSERT INTO apiKeys VALUES ('2', 'sk-video', 'video-studio', 'm', 1, '')").run();
  const insert = db.prepare("INSERT INTO usageHistory (timestamp, provider, model, apiKey, promptTokens, completionTokens, cost) VALUES (?, 'codex', 'gpt-5.5', ?, ?, ?, ?)");
  for (const r of rows) insert.run(new Date(r.at).toISOString(), r.key, r.input, r.output, r.cost);
  db.close();
  return file;
}

const asEnv = (value: Record<string, string>) => value as unknown as NodeJS.ProcessEnv;
const env = (db: string, extra: Record<string, string> = {}) => asEnv({ STUDIO_GATEWAY: "9router", NINEROUTER_DB: db, ...extra });

describe("9router gateway", () => {
  it("is off unless enabled and a key of that name exists", () => {
    const db = fakeRouter();
    expect(gatewayConfig(asEnv({ NINEROUTER_DB: db }))).toBeNull();
    expect(gatewayConfig(env(db, { STUDIO_GATEWAY_KEY_NAME: "missing" }))).toBeNull();
    expect(gatewayConfig(env("/nonexistent/data.sqlite"))).toBeNull();
    expect(gatewayConfig(env(db))).toMatchObject({ key: "sk-video", profile: "9router", modelPrefix: "cx/" });
  });

  it("falls back to direct Codex when 9router is enabled but not answering", async () => {
    const db = fakeRouter();
    expect((await activeGateway(env(db), async () => true)).cfg?.key).toBe("sk-video");
    const down = await activeGateway(env(db), async () => false);
    expect(down.cfg).toBeNull();
    expect(down.note).toMatch(/chạy thẳng/);
    expect(await activeGateway(asEnv({}), async () => { throw new Error("must not probe when off"); })).toEqual({ cfg: null });
  });

  it("routes codex through the profile, prefixes a bare model, and hands the key to the child only", () => {
    const cfg = gatewayConfig(env(fakeRouter()))!;
    expect(withGatewayArgs(["exec", "--json", "-m", "gpt-5.6-sol", "-"], cfg)).toEqual(["--profile", "9router", "exec", "--json", "-m", "cx/gpt-5.6-sol", "-"]);
    expect(withGatewayArgs(["exec", "-m", "cx/gpt-5.5"], cfg)).toContain("cx/gpt-5.5");
    expect(withGatewayEnv(asEnv({ PATH: "/bin" }), cfg)).toEqual({ PATH: "/bin", NINEROUTER_API_KEY: "sk-video" });
  });

  it("sums only this key's requests inside the run window and checks them against the CLI", async () => {
    const db = fakeRouter([
      { at: T0 + 5_000, key: "sk-video", input: 17470, output: 143, cost: 0.0172456 },
      { at: T0 + 20_000, key: "sk-video", input: 25846, output: 16, cost: 0.0107896 },
      { at: T0 + 10_000, key: "sk-default", input: 999, output: 9, cost: 1 },
      { at: T0 - 60_000, key: "sk-video", input: 1, output: 1, cost: 5 },
    ]);
    const cfg = gatewayConfig(env(db))!;
    beginGatewayRun("run-a", T0);
    const settled = await endGatewayRun("run-a", cfg, { inputTokens: 43316, outputTokens: 159 }, { now: T0 + 21_000, settleMs: 0 });
    expect(settled).toMatchObject({ gatewayStatus: "ok", gatewayRequests: 2, costUsd: 0.028035, costSource: "gateway_reported", model: "gpt-5.5" });

    beginGatewayRun("run-b", T0);
    const off = await endGatewayRun("run-b", cfg, { inputTokens: 40000, outputTokens: 159 }, { now: T0 + 21_000, settleMs: 0 });
    expect(off.gatewayStatus).toBe("overlap");
    expect(off.costUsd).toBeUndefined();
  });

  it("flags a token mismatch, keeps the cost, and reports a run 9router never saw", async () => {
    const t = T0 + 3_600_000;
    const cfg = gatewayConfig(env(fakeRouter([{ at: t + 1_000, key: "sk-video", input: 100, output: 10, cost: 0.01 }])))!;
    beginGatewayRun("run-c", t);
    expect(await endGatewayRun("run-c", cfg, { inputTokens: 90, outputTokens: 10 }, { now: t + 2_000, settleMs: 0 }))
      .toMatchObject({ gatewayStatus: "mismatch", costUsd: 0.01 });
    const later = t + 3_600_000;
    beginGatewayRun("run-d", later);
    expect(await endGatewayRun("run-d", cfg, {}, { now: later + 2_000, settleMs: 0 })).toMatchObject({ gatewayStatus: "no_requests" });
  });

  it("never throws on an unknown schema: the video job must not fail over cost", async () => {
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "gw-")), "data.sqlite");
    const db = new DatabaseSync(file);
    db.exec("CREATE TABLE apiKeys (key TEXT, name TEXT, isActive INTEGER); CREATE TABLE usageHistory (ts TEXT); INSERT INTO apiKeys VALUES ('k', 'video-studio', 1);");
    db.close();
    const t = T0 + 9 * 3_600_000;
    beginGatewayRun("run-e", t);
    const settled = await endGatewayRun("run-e", gatewayConfig(env(file))!, {}, { now: t + 1_000, settleMs: 0 });
    expect(settled.gatewayStatus).toBe("error");
    expect(settled.message).toMatch(/thiếu cột timestamp/);
  });
});
