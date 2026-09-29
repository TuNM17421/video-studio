import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { syncTelemetry, unsafeReason } from "./telemetry-sync.mjs";

function fixture(events) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-sync-"));
  const root = path.join(repo, ".studio", "telemetry");
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(path.join(root, "outbox.jsonl"), events.map((event) => JSON.stringify(event)).join("\n") + "\n");
  return { repo, root };
}

const event = (id, extra = {}) => ({ event_id: id, schema_version: 1, privacy: { payload_class: "metadata_only" }, ...extra });
const response = (value, status = 202) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });

test("sync stores local acknowledgements and skips them on the next run", async () => {
  const { repo, root } = fixture([event("a"), event("b")]);
  const batches = [];
  const fetchImpl = async (_url, init) => {
    const body = JSON.parse(init.body);
    batches.push(body.events.map((item) => item.event_id));
    return response({ inserted: body.events.length, duplicate: 0 });
  };
  const first = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl });
  const second = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl });
  assert.deepEqual(first, { events: 2, inserted: 2, duplicate: 0, ai_logs_inserted: 0, ai_logs_enabled: false });
  assert.equal(second.events, 0);
  assert.deepEqual(batches, [["a", "b"]]);
  const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
  assert.deepEqual(state.sentEventIds, ["a", "b"]);
  assert.equal(JSON.stringify(state).includes("secret"), false);
});

test("sync records a failed attempt without marking queued events as sent", async () => {
  const { repo, root } = fixture([event("a")]);
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async () => response({ error: "down" }, 503) }), /HTTP 503/);
  const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
  assert.deepEqual(state.sentEventIds, []);
  assert.match(state.lastError, /HTTP 503/);
});

test("sync refuses forbidden fields before making a network request", async () => {
  const { repo } = fixture([event("a", { prompt: "must never leave" })]);
  let requests = 0;
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async () => { requests++; return response({ inserted: 1, duplicate: 0 }); } }), /field bị cấm/);
  assert.equal(requests, 0);
});

test("sync keeps receipts for batches acknowledged before a later batch fails", async () => {
  const { repo, root } = fixture(Array.from({ length: 501 }, (_, i) => event(`e${i}`)));
  let calls = 0;
  const fetchImpl = async (_url, init) => {
    calls++;
    const body = JSON.parse(init.body);
    return calls === 1 ? response({ inserted: body.events.length, duplicate: 0 }) : response({ error: "down" }, 500);
  };
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl }), /HTTP 500/);
  const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
  assert.equal(state.sentEventIds.length, 500);
  assert.equal(state.sentEventIds.includes("e500"), false);
  assert.ok(state.lastFailureAt);
});

test("sync does not acknowledge a batch the collector only partly confirmed", async () => {
  const { repo, root } = fixture([event("a"), event("b")]);
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async () => response({ inserted: 1, duplicate: 0 }) }), /không xác nhận đủ/);
  const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
  assert.deepEqual(state.sentEventIds, []);
});

test("sync without endpoint or token opens no connection and writes no receipt", async () => {
  const { repo, root } = fixture([event("a")]);
  let requests = 0;
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "", token: "", fetchImpl: async () => { requests++; return response({}); } }), /bắt buộc/);
  assert.equal(requests, 0);
  assert.equal(fs.existsSync(path.join(root, "sync-state.json")), false);
});

test("unsafeReason names the offending path, never its value", () => {
  assert.equal(unsafeReason(event("a")), null);
  assert.equal(unsafeReason({ event_id: "a" }), "không khai báo metadata_only");
  assert.equal(unsafeReason(event("a", { feedback: { Messages: ["hi secret"] } })), "có field bị cấm (feedback.Messages)");
  assert.equal(unsafeReason({}), "thiếu event_id");
});

const badRun = (id) => event(id, { bad: true });
const rejectBad = async (_url, init) => {
  const body = JSON.parse(init.body);
  return body.events.some((item) => item.bad) ? response({ error: "run_id phải là UUID" }, 400) : response({ inserted: body.events.length, duplicate: 0 });
};

test("one rejected event is parked and the events around it still go out", async () => {
  const { repo, root } = fixture([event("a"), badRun("bad"), event("c"), event("d")]);
  const result = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: rejectBad });
  assert.equal(result.inserted, 3);
  assert.equal(result.rejected, 1);
  const state = JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8"));
  assert.deepEqual(state.sentEventIds.sort(), ["a", "c", "d"]);
  const parked = fs.readFileSync(path.join(root, "outbox.rejected.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
  assert.equal(parked.length, 1);
  assert.equal(parked[0].event.event_id, "bad");
  assert.match(parked[0].reason, /HTTP 400/);
  // Second run: nothing pending, the parked event is not retried forever.
  let requests = 0;
  const again = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async () => { requests++; return response({}); } });
  assert.equal(again.events, 0);
  assert.equal(requests, 0);
});

test("a half-written outbox line is skipped, not fatal", async () => {
  const { repo, root } = fixture([event("a"), event("b")]);
  fs.appendFileSync(path.join(root, "outbox.jsonl"), '{"event_id":"tru');
  const result = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async (_u, init) => response({ inserted: JSON.parse(init.body).events.length, duplicate: 0 }) });
  assert.equal(result.inserted, 2);
  assert.equal(result.skipped_lines, 1);
});

test("AI-log refusal does not fail the event upload", async () => {
  const { repo, root } = fixture([event("a")]);
  fs.writeFileSync(path.join(root, "ai-logs-outbox.jsonl"), `${JSON.stringify({ log_id: "l1", encrypted: { iv: "", tag: "", ciphertext: "" } })}\n`);
  const fetchImpl = async (url, init) => url.endsWith("/v1/ai-logs") ? response({ error: "ai_logs_disabled" }, 403) : response({ inserted: JSON.parse(init.body).events.length, duplicate: 0 });
  const result = await syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", aiLogsEnabled: true, aiLogKey: Buffer.alloc(32).toString("base64"), fetchImpl });
  assert.equal(result.inserted, 1);
  assert.ok(result.ai_logs_error);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, "sync-state.json"), "utf8")).sentEventIds, ["a"]);
});

test("a 5xx is retried later, never parked", async () => {
  const { repo, root } = fixture([event("a")]);
  await assert.rejects(() => syncTelemetry({ repo, endpoint: "https://collector.test", token: "secret", fetchImpl: async () => response({}, 500) }), /HTTP 500/);
  assert.equal(fs.existsSync(path.join(root, "outbox.rejected.jsonl")), false);
});
