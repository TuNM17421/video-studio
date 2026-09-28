import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { projectEvent, readLocalTelemetry } from "./telemetry-local";

const SENDING_OFF = { url: "", hasToken: false, autoSync: false, enabled: false, syncing: false };
const dirs: string[] = [];

function repoWith(lines: (object | string)[], state?: object, aiLogs = 0) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-local-"));
  dirs.push(repo);
  const root = path.join(repo, ".studio", "telemetry");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "outbox.jsonl"), lines.map((l) => (typeof l === "string" ? l : JSON.stringify(l))).join("\n") + "\n");
  if (state) fs.writeFileSync(path.join(root, "sync-state.json"), JSON.stringify(state));
  if (aiLogs) fs.writeFileSync(path.join(root, "ai-logs-outbox.jsonl"), Array.from({ length: aiLogs }, (_, i) => JSON.stringify({ log_id: `l${i}`, encrypted: { ciphertext: "SECRET-CIPHER" } })).join("\n") + "\n");
  return repo;
}

const base = (id: string, type: string, extra: object = {}) => ({
  event_id: id, schema_version: 1, occurred_at: `2026-09-26T0${id.length}:00:00.000Z`, event_type: type,
  installation_id: "inst", project_ref: "v1", video_ref: "v1", run_id: "r1", stage: "cues", actor_kind: "codex",
  provider: null, model: "m", outcome: null,
  measurement: { duration_ms: null, input_tokens: null, output_tokens: null, cost: { amount: null, currency: "USD", source: "unavailable" } },
  privacy: { payload_class: "metadata_only" },
  ...extra,
});

afterEach(() => { for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true }); });

describe("projectEvent", () => {
  it("keeps whitelisted metadata and reports other keys by name only", () => {
    const { event, extraKeys } = projectEvent({ ...base("a", "run_started"), note: "hidden text", run_context: { attempt: 1, prompt_text: "leak" } });
    expect(event.event_id).toBe("a");
    expect(event.run_context).toEqual({ attempt: 1 });
    expect(extraKeys).toEqual(["note", "run_context.prompt_text"]);
    expect(JSON.stringify(event)).not.toContain("hidden text");
    expect(JSON.stringify(event)).not.toContain("leak");
  });

  it("drops an object hiding under a scalar-only key", () => {
    const { event, extraKeys } = projectEvent({ ...base("a", "run_started"), model: { content: "x" } });
    expect(event).not.toHaveProperty("model");
    expect(extraKeys).toEqual(["model"]);
  });
});

describe("readLocalTelemetry", () => {
  it("derives acked/pending/blocked only from receipts and the uploader's refusal rule", () => {
    const repo = repoWith([
      base("a", "run_started"),
      base("bb", "run_finished", { outcome: { status: "error", error_code: "run_error" }, measurement: { duration_ms: 1500, cost: { amount: null, currency: "USD", source: "unavailable" } } }),
      base("ccc", "usage_recorded", { prompt: "must never leave" }),
      "{not json",
    ], { sentEventIds: ["a"], lastAttemptAt: "2026-09-28T01:00:00.000Z", lastFailureAt: "2026-09-28T01:00:00.000Z", lastError: "/v1/events: HTTP 503" });
    const data = readLocalTelemetry(repo, { sending: SENDING_OFF, aiLogsEnabled: false });

    expect(data.counts).toEqual({ acked: 1, pending: 1, blocked: 1 });
    expect(data.outbox).toEqual({ total: 3, unreadableLines: 1, byType: { run_started: 1, run_finished: 1, usage_recorded: 1 } });
    expect(data.receipts).toMatchObject({ found: true, lastError: "/v1/events: HTTP 503" });
    expect(data.preview.map((p) => [p.event.event_id, p.status])).toEqual([["ccc", "blocked"], ["bb", "pending"]]);
    expect(data.preview[0].blockedReason).toBe("có field bị cấm (prompt)");
    expect(JSON.stringify(data)).not.toContain("must never leave");
  });

  it("treats a missing receipt file as unknown, not as sent", () => {
    const data = readLocalTelemetry(repoWith([base("a", "run_started")]), { sending: SENDING_OFF, aiLogsEnabled: false });
    expect(data.receipts.found).toBe(false);
    expect(data.counts).toEqual({ acked: 0, pending: 1, blocked: 0 });
  });

  it("sums only measured costs and keeps unmeasured ones null, not $0", () => {
    const usage = (id: string, amount: number | null, source: string, tokens: number | null) =>
      base(id, "usage_recorded", { measurement: { input_tokens: tokens, output_tokens: tokens, cost: { amount, currency: "USD", source } } });
    const data = readLocalTelemetry(repoWith([
      usage("a", 0.5, "provider_reported", 10),
      usage("bb", 0.25, "gateway_reported", null),
      usage("ccc", null, "unavailable", null),
      { ...usage("dddd", 9, "unavailable", null), video_ref: "v2" },
    ]), { sending: SENDING_OFF, aiLogsEnabled: false });
    const v1 = data.videos.find((v) => v.video === "v1")!;
    const v2 = data.videos.find((v) => v.video === "v2")!;
    expect(v1).toMatchObject({ costUsd: 0.75, costMeasured: 2, costUnknown: 1, inputTokens: 10 });
    expect(v2).toMatchObject({ costUsd: null, costMeasured: 0, costUnknown: 1, inputTokens: null });
  });

  it("counts open findings by their latest state", () => {
    const fb = (id: string, fid: string, status: string) => base(id, "feedback_state", { feedback: { feedback_id: fid, status, severity: "major" } });
    const data = readLocalTelemetry(repoWith([fb("a", "f1", "open"), fb("bb", "f1", "verified"), fb("ccc", "f2", "open")]), { sending: SENDING_OFF, aiLogsEnabled: false });
    expect(data.videos[0].feedbackOpen).toBe(1);
  });

  it("counts encrypted AI logs without exposing them, and caps the preview", () => {
    const events = Array.from({ length: 5 }, (_, i) => base("x".repeat(i + 1), "run_started"));
    const data = readLocalTelemetry(repoWith(events, undefined, 2), { sending: SENDING_OFF, aiLogsEnabled: true, previewLimit: 3 });
    expect(data.aiLogs).toEqual({ count: 2, enabled: true });
    expect(data.preview).toHaveLength(3);
    expect(JSON.stringify(data)).not.toContain("SECRET-CIPHER");
  });
});
