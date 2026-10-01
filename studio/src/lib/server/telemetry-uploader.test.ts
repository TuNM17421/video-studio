// Vòng gửi số liệu, chạy thật đầu-tới-cuối: tools/telemetry-sync.mjs là một tiến trình riêng, event và AI log
// do workflow-ledger.mjs ghi (AES-256-GCM thật), và đọc lại bằng chính readLocalTelemetry mà tab Số liệu dùng.
// Chỗ duy nhất là giả: collector — một server HTTP trả đúng hợp đồng của telemetry/collector/server.mjs
// (202 {accepted,inserted,duplicate} · 400 khi dữ liệu sai · 403 khi máy chủ tắt AI log).
//
// Hai bất biến các ca dưới đây giữ: (1) đã gửi rồi thì không gửi lại — cả event lẫn AI log, vì mỗi AI log tới
// 256 KiB và sync chạy sau MỖI job; (2) thứ gửi mãi không được thì nói là bị từ chối, không để trong hàng chờ.
import { execFile } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it, vi } from "vitest";
import { addRunMetrics, finishRun, recordAiLog, startRun } from "../../../../tools/workflow-ledger.mjs";
import { readLocalTelemetry } from "./telemetry-local";

const execFileP = promisify(execFile);
const ROOT = path.resolve(process.cwd(), "..");
const SYNC = path.join(ROOT, "tools", "telemetry-sync.mjs");
const KEY_A = Buffer.alloc(32, 1).toString("base64");
const KEY_B = Buffer.alloc(32, 2).toString("base64");
const SENDING_OFF = { url: "", hasToken: false, autoSync: false, enabled: false, syncing: false };

const dirs: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
});

interface Calls { events: string[][]; logs: string[] }

function fakeCollector(opts: { reject?: Set<string>; aiLogs?: "on" | "off" } = {}) {
  const calls: Calls = { events: [], logs: [] };
  const seenEvents = new Set<string>();
  const seenLogs = new Set<string>();
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      const reply = (status: number, value: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(value));
      };
      if (req.headers.authorization !== "Bearer secret-token") return reply(401, { error: "unauthorized" });
      const input = JSON.parse(body || "{}");
      if (req.url === "/v1/ai-logs") {
        if (opts.aiLogs === "off") return reply(403, { error: "ai_logs_disabled" });
        calls.logs.push(input.log_id);
        const fresh = !seenLogs.has(input.log_id);
        seenLogs.add(input.log_id);
        return reply(202, { accepted: true, inserted: fresh });
      }
      const ids: string[] = input.events.map((e: { event_id: string }) => e.event_id);
      calls.events.push(ids);
      const bad = ids.find((id) => opts.reject?.has(id));
      if (bad) return reply(400, { error: `event_id ${bad}: dữ liệu sai` });
      let inserted = 0;
      let duplicate = 0;
      for (const id of ids) { if (seenEvents.has(id)) duplicate++; else { seenEvents.add(id); inserted++; } }
      return reply(202, { accepted: ids.length, inserted, duplicate });
    });
  });
  return new Promise<{ server: http.Server; calls: Calls; base: string }>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve({ server, calls, base: `http://127.0.0.1:${(server.address() as { port: number }).port}` })));
}

/** Ledger thật: sinh event thật vào outbox, và AI log thật (mã hoá bằng `key`) vào ai-logs-outbox. */
function ledgerRepo(logKeys: string[] = []) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "verify-telemetry-"));
  dirs.push(repo);
  const run = startRun(repo, "v-kiem-chung", { stage: "cues", actor: "claude", mode: "agent", machine: "may-kiem-chung" });
  addRunMetrics(repo, "v-kiem-chung", run.runId, { inputTokens: 1200, outputTokens: 300, costUsd: 0.04, costSource: "provider_reported" });
  finishRun(repo, "v-kiem-chung", run.runId, { status: "done" });
  vi.stubEnv("STUDIO_TELEMETRY_AI_LOGS", "1");
  const logIds = logKeys.map((key, i) => {
    vi.stubEnv("STUDIO_TELEMETRY_AI_LOG_KEY", key);
    return (recordAiLog(repo, "v-kiem-chung", { source: "studio", runId: run.runId, kind: "agent_stream", text: `BI-MAT-TRANSCRIPT-${i}` }) as { logId: string }).logId;
  });
  return { repo, root: path.join(repo, ".studio", "telemetry"), runId: run.runId, logIds };
}

async function sync(repo: string, base: string, extra: Record<string, string> = {}) {
  const env = {
    ...process.env,
    STUDIO_TELEMETRY_URL: base,
    STUDIO_TELEMETRY_TOKEN: "secret-token",
    STUDIO_TELEMETRY_AI_LOGS: "0",
    STUDIO_TELEMETRY_AI_LOG_KEY: "",
    ...extra,
  };
  const { stdout } = await execFileP(process.execPath, [SYNC], { cwd: repo, env });
  return JSON.parse(stdout) as Record<string, number | string | boolean>;
}

const readJsonl = (file: string) =>
  (fs.existsSync(file) ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []) as Record<string, unknown>[];

describe("biên nhận AI log: một log không đọc được không làm chết cả chặng", () => {
  it("sync hai lần: lần hai không gửi lại event nào, cũng không gửi lại AI log nào", async () => {
    const { repo, root, logIds } = ledgerRepo([KEY_A, KEY_A]);
    const fake = await fakeCollector();
    const first = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: KEY_A });
    const second = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: KEY_A });

    expect(first.events).toBe(3); // run_started + usage_recorded + run_finished
    expect(first.ai_logs_inserted).toBe(2);
    expect(second.events).toBe(0);
    expect(second.ai_logs_inserted).toBe(0);
    // Lần hai không có request AI log nào nữa.
    expect(fake.calls.logs).toEqual(logIds);
    expect(fake.calls.events).toHaveLength(1);
    const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
    expect(state.sentLogIds).toEqual(logIds);
    expect(state.sentEventIds).toHaveLength(3);
    fake.server.close();
  }, 60_000);

  it("key đã xoay: log cũ bị loại kèm log_id thôi, log mới vẫn lên, nội dung không rò ra file nào", async () => {
    const { repo, root, logIds } = ledgerRepo([KEY_A, KEY_B]);
    const fake = await fakeCollector();
    const result = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: KEY_B });

    expect(result.ai_logs_inserted).toBe(1);
    expect(result.ai_logs_rejected).toBe(1);
    expect(fake.calls.logs).toEqual([logIds[1]]);
    const parked = readJsonl(path.join(root, "ai-logs.rejected.jsonl"));
    expect(parked).toHaveLength(1);
    expect(parked[0].log_id).toBe(logIds[0]);
    expect(Object.keys(parked[0]).sort()).toEqual(["at", "log_id", "reason"]);
    const parkedRaw = fs.readFileSync(path.join(root, "ai-logs.rejected.jsonl"), "utf8");
    expect(parkedRaw).not.toContain("BI-MAT-TRANSCRIPT");
    expect(parkedRaw).not.toContain("ciphertext");

    // Và lần sync sau không thử lại log đã loại, cũng không gửi lại log đã có biên nhận.
    const again = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: KEY_B });
    expect(again.ai_logs_inserted).toBe(0);
    expect(fake.calls.logs).toEqual([logIds[1]]);
    fake.server.close();
  }, 60_000);

  it("key sai độ dài là lỗi cấu hình: dừng chặng, không loại log nào", async () => {
    const { repo, root } = ledgerRepo([KEY_A]);
    const fake = await fakeCollector();
    const result = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: "khong-du-32-byte" });

    expect(result.events).toBe(3);
    expect(String(result.ai_logs_error)).toMatch(/32 bytes/);
    expect(result.ai_logs_rejected).toBeUndefined();
    expect(fake.calls.logs).toEqual([]);
    expect(fs.existsSync(path.join(root, "ai-logs.rejected.jsonl"))).toBe(false);
    fake.server.close();
  }, 60_000);

  it("máy chủ tắt AI log (403): event vẫn lên, log vẫn nằm chờ, không loại", async () => {
    const { repo, root } = ledgerRepo([KEY_A]);
    const fake = await fakeCollector({ aiLogs: "off" });
    const result = await sync(repo, fake.base, { STUDIO_TELEMETRY_AI_LOGS: "1", STUDIO_TELEMETRY_AI_LOG_KEY: KEY_A });

    expect(result.events).toBe(3);
    expect(result.inserted).toBe(3);
    expect(String(result.ai_logs_error)).toMatch(/403/);
    expect(fs.existsSync(path.join(root, "ai-logs.rejected.jsonl"))).toBe(false);
    expect(JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8")).sentLogIds).toEqual([]);
    fake.server.close();
  }, 60_000);
});

describe("event máy chủ từ chối không nằm trong hàng chờ gửi", () => {
  it("uploader loại event bị 400, các event khác vẫn lên, và tab Số liệu gọi đúng tên", async () => {
    const { repo, root } = ledgerRepo();
    const ids = readJsonl(path.join(root, "outbox.jsonl")).map((e) => String(e.event_id));
    expect(ids).toHaveLength(3);
    const doomed = ids[1];
    const fake = await fakeCollector({ reject: new Set([doomed]) });

    const result = await sync(repo, fake.base);
    expect(result.inserted).toBe(2);
    expect(result.rejected).toBe(1);
    // Chia đôi lô để tìm event hỏng: lô đầu 3 event bị 400, rồi tách dần.
    expect(fake.calls.events.length).toBeGreaterThan(1);
    const parked = readJsonl(path.join(root, "outbox.rejected.jsonl"));
    expect(parked).toHaveLength(1);
    expect((parked[0].event as { event_id: string }).event_id).toBe(doomed);

    // Đọc lại bằng chính hàm tab Số liệu dùng.
    const view = readLocalTelemetry(repo, { sending: SENDING_OFF, aiLogsEnabled: false });
    expect(view.counts).toEqual({ acked: 2, pending: 0, blocked: 0, rejected: 1 });
    const refused = view.preview.find((p) => p.event.event_id === doomed)!;
    expect(refused.status).toBe("rejected");
    expect(refused.rejectedReason).toContain("HTTP 400");

    // Lần sync sau không thử lại nó: outbox không còn gì để gửi.
    const again = await sync(repo, fake.base);
    expect(again.events).toBe(0);
    fake.server.close();
  }, 60_000);

  it("event bị loại được ghi xuống đĩa ngay, kể cả khi lô sau gặp 5xx", async () => {
    // Một lô 400 (bị loại) rồi một lô 5xx: bản ghi "đã bị từ chối" phải còn trên đĩa.
    const { repo, root } = ledgerRepo();
    const ids = readJsonl(path.join(root, "outbox.jsonl")).map((e) => String(e.event_id));
    let seenBatches = 0;
    const server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (c) => { body += c; });
      req.on("end", () => {
        const input = JSON.parse(body || "{}");
        const batch: string[] = input.events.map((e: { event_id: string }) => e.event_id);
        seenBatches++;
        const reply = (status: number, value: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(value)); };
        if (batch.includes(ids[0])) return reply(400, { error: "dữ liệu sai" });
        return reply(503, { error: "collector đang bảo trì" });
      });
    });
    const base = await new Promise<string>((r) => server.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${(server.address() as { port: number }).port}`)));

    await expect(sync(repo, base)).rejects.toThrow();
    expect(seenBatches).toBeGreaterThan(1);
    const parked = readJsonl(path.join(root, "outbox.rejected.jsonl"));
    expect(parked.map((p) => (p.event as { event_id: string }).event_id)).toEqual([ids[0]]);

    const view = readLocalTelemetry(repo, { sending: SENDING_OFF, aiLogsEnabled: false });
    expect(view.counts).toEqual({ acked: 0, pending: 2, blocked: 0, rejected: 1 });
    server.close();
  }, 60_000);
});
