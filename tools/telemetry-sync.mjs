#!/usr/bin/env node
import { createDecipheriv } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FORBIDDEN_KEYS = new Set(["prompt", "rawprompt", "messages", "content", "apikey", "api_key", "authorization", "cookie"]);

// A half-written line (power cut, full disk) must not stop every good event behind it: skip it and say how many.
function readJsonl(file) {
  if (!fs.existsSync(file)) return { rows: [], skipped: 0 };
  const rows = [];
  let skipped = 0;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean)) {
    try { rows.push(JSON.parse(line)); } catch { skipped++; }
  }
  return { rows, skipped };
}

class HttpError extends Error {
  constructor(url, status) {
    super(`${url}: HTTP ${status}`);
    this.status = status;
  }
}

export const syncStateFile = (repo) => path.join(repo, ".studio", "telemetry", "sync-state.json");

// Exported so Studio's preview reads receipts and refuses events with exactly the uploader's rules.
export function readState(file) {
  try {
    const value = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      schemaVersion: 1,
      sentEventIds: Array.isArray(value.sentEventIds) ? value.sentEventIds.filter((id) => typeof id === "string") : [],
      lastAttemptAt: typeof value.lastAttemptAt === "string" ? value.lastAttemptAt : null,
      lastSuccessAt: typeof value.lastSuccessAt === "string" ? value.lastSuccessAt : null,
      lastFailureAt: typeof value.lastFailureAt === "string" ? value.lastFailureAt : null,
      lastError: typeof value.lastError === "string" ? value.lastError : null,
      lastResult: value.lastResult && typeof value.lastResult === "object" ? value.lastResult : null,
    };
  } catch {
    return { schemaVersion: 1, sentEventIds: [], lastAttemptAt: null, lastSuccessAt: null, lastFailureAt: null, lastError: null, lastResult: null };
  }
}

function writeState(file, state) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temp, file);
}

function forbiddenPath(value, prefix = "") {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = forbiddenPath(value[i], `${prefix}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, child] of Object.entries(value)) {
    const here = prefix ? `${prefix}.${key}` : key;
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) return here;
    const found = forbiddenPath(child, here);
    if (found) return found;
  }
  return null;
}

/** Why an event must not leave the machine, or null when it may. Names a field path, never its value. */
export function unsafeReason(event) {
  if (!event || typeof event !== "object" || typeof event.event_id !== "string" || !event.event_id) return "thiếu event_id";
  if (event.privacy?.payload_class !== "metadata_only") return "không khai báo metadata_only";
  const forbidden = forbiddenPath(event);
  return forbidden ? `có field bị cấm (${forbidden})` : null;
}

function assertSafeEvent(event) {
  const reason = unsafeReason(event);
  if (reason) throw new Error(`Event ${event?.event_id || "?"} ${reason}; không gửi gì.`);
}

function decrypt(log, keyText) {
  const key = Buffer.from(keyText || "", "base64");
  if (key.length !== 32) throw new Error("STUDIO_TELEMETRY_AI_LOG_KEY phải là base64 của đúng 32 bytes để sync AI log.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(log.encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(log.encrypted.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(log.encrypted.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

export async function syncTelemetry({
  repo = process.cwd(),
  endpoint = process.env.STUDIO_TELEMETRY_URL || "",
  token = process.env.STUDIO_TELEMETRY_TOKEN || "",
  aiLogsEnabled = process.env.STUDIO_TELEMETRY_AI_LOGS === "1",
  aiLogKey = process.env.STUDIO_TELEMETRY_AI_LOG_KEY || "",
  fetchImpl = fetch,
  now = () => new Date().toISOString(),
} = {}) {
  endpoint = endpoint.replace(/\/$/, "");
  if (!endpoint || !token) throw new Error("STUDIO_TELEMETRY_URL và STUDIO_TELEMETRY_TOKEN là bắt buộc; không gửi gì khi thiếu config.");

  const root = path.join(repo, ".studio", "telemetry");
  const stateFile = syncStateFile(repo);
  const state = readState(stateFile);
  const sent = new Set(state.sentEventIds);
  const outbox = readJsonl(path.join(root, "outbox.jsonl"));
  const rejectedFile = path.join(root, "outbox.rejected.jsonl");
  const rejectedBefore = new Set(readJsonl(rejectedFile).rows.map((row) => row.event?.event_id));
  const events = outbox.rows.filter((event) => !sent.has(event.event_id) && !rejectedBefore.has(event.event_id));
  state.lastAttemptAt = now();
  state.lastError = null;
  writeState(stateFile, state);

  async function post(url, body, extraHeaders = {}) {
    const response = await fetchImpl(`${endpoint}${url}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...extraHeaders },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new HttpError(url, response.status);
    return response.json();
  }

  // The collector refuses a whole batch when one event is bad. 4xx = the data is wrong, so retrying can never help:
  // split the batch to find the culprit, park it in outbox.rejected.jsonl and let the rest through. 5xx/network
  // errors say nothing about the data, so they propagate and the batch is retried next time.
  const rejected = [];
  async function sendEvents(batch) {
    let result;
    try {
      result = await post("/v1/events", { events: batch });
    } catch (error) {
      if (!(error instanceof HttpError) || error.status < 400 || error.status >= 500 || error.status === 401 || error.status === 403 || error.status === 429) throw error;
      if (batch.length === 1) {
        rejected.push({ at: now(), reason: error.message, event: batch[0] });
        return;
      }
      const mid = Math.ceil(batch.length / 2);
      await sendEvents(batch.slice(0, mid));
      await sendEvents(batch.slice(mid));
      return;
    }
    if (Number(result.inserted || 0) + Number(result.duplicate || 0) !== batch.length) {
      throw new Error("/v1/events: collector không xác nhận đủ event");
    }
    inserted += Number(result.inserted || 0);
    duplicate += Number(result.duplicate || 0);
    batch.forEach((event) => sent.add(event.event_id));
    state.sentEventIds = [...sent];
    state.lastResult = { attempted: events.length, sent: sent.size, inserted, duplicate };
    writeState(stateFile, state);
  }

  let inserted = 0;
  let duplicate = 0;
  let aiLogs = 0;
  try {
    // Validate every pending event before the first request. A forbidden field is a local refusal, never a
    // collector-side accident after an earlier batch was already sent.
    events.forEach(assertSafeEvent);
    for (let index = 0; index < events.length; index += 500) {
      const batch = events.slice(index, index + 500);
      await sendEvents(batch);
    }
    if (rejected.length) {
      fs.appendFileSync(rejectedFile, rejected.map((row) => `${JSON.stringify(row)}\n`).join(""));
    }

    // Separate leg: AI logs are optional, so a refusal here (server has them off, key rotated) must not turn a
    // successful event upload into a failed sync.
    let aiLogsSkipped = null;
    if (aiLogsEnabled) {
      try {
        for (const log of readJsonl(path.join(root, "ai-logs-outbox.jsonl")).rows) {
          const result = await post("/v1/ai-logs", {
            log_id: log.log_id,
            occurred_at: log.occurred_at,
            installation_id: log.installation_id,
            project_ref: log.project_ref,
            video_ref: log.video_ref,
            run_id: log.run_id,
            kind: log.kind,
            consent: log.consent,
            content: decrypt(log, aiLogKey),
          }, { "x-telemetry-ai-log-consent": "true" });
          if (result.inserted) aiLogs++;
        }
      } catch (error) {
        aiLogsSkipped = error instanceof Error ? error.message : "AI log sync thất bại.";
      }
    }

    state.lastSuccessAt = now();
    state.lastError = null;
    state.lastResult = { attempted: events.length, sent: sent.size, inserted, duplicate };
    writeState(stateFile, state);
    return {
      events: events.length, inserted, duplicate, ai_logs_inserted: aiLogs, ai_logs_enabled: aiLogsEnabled,
      ...(rejected.length ? { rejected: rejected.length } : {}),
      ...(outbox.skipped ? { skipped_lines: outbox.skipped } : {}),
      ...(aiLogsSkipped ? { ai_logs_error: aiLogsSkipped } : {}),
    };
  } catch (error) {
    state.lastFailureAt = now();
    state.lastError = error instanceof Error ? error.message : "Telemetry sync thất bại.";
    state.sentEventIds = [...sent];
    state.lastResult = { attempted: events.length, sent: sent.size, inserted, duplicate };
    writeState(stateFile, state);
    throw error;
  }
}

async function main() {
  try {
    console.log(JSON.stringify(await syncTelemetry()));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await main();
