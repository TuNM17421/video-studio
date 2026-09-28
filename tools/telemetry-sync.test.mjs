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
