import { createCipheriv, createHash, randomBytes } from "node:crypto";
import http from "node:http";
import { Pool } from "pg";

const port = Number(process.env.PORT || 4318);
const token = process.env.COLLECTOR_TOKEN;
const databaseUrl = process.env.DATABASE_URL;
const aiLogsEnabled = process.env.AI_LOGS_ENABLED === "true";
const aiLogKey = Buffer.from(process.env.AI_LOG_ENCRYPTION_KEY || "", "base64");
const eventRetentionDays = Math.max(0, Number(process.env.EVENT_RETENTION_DAYS || 0));
const aiLogRetentionDays = Math.max(0, Number(process.env.AI_LOG_RETENTION_DAYS || 0));
if (!token || !databaseUrl) throw new Error("COLLECTOR_TOKEN và DATABASE_URL là bắt buộc.");
if (aiLogsEnabled && aiLogKey.length !== 32) throw new Error("AI_LOG_ENCRYPTION_KEY phải là base64 của đúng 32 bytes khi AI_LOGS_ENABLED=true.");

const pool = new Pool({ connectionString: databaseUrl });
const forbiddenKeys = new Set(["prompt", "rawprompt", "messages", "content", "apikey", "api_key", "authorization", "cookie"]);

function send(response, status, value) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  response.end(`${JSON.stringify(value)}\n`);
}

function hasForbiddenPayload(value) {
  if (Array.isArray(value)) return value.some(hasForbiddenPayload);
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) => forbiddenKeys.has(key.toLowerCase()) || hasForbiddenPayload(child));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validate(event) {
  if (!event || typeof event !== "object") return "event phải là object";
  if (event.schema_version !== 1) return "schema_version phải là 1";
  for (const key of ["event_id", "occurred_at", "event_type", "installation_id", "project_ref", "video_ref", "run_id"]) {
    if (typeof event[key] !== "string" || !event[key]) return `thiếu ${key}`;
  }
  // These columns are UUID in Postgres: a malformed one is the client's mistake (400), not a 500 after the fact.
  for (const key of ["event_id", "installation_id", "run_id"]) {
    if (!UUID.test(event[key])) return `${key} phải là UUID`;
  }
  if (Number.isNaN(Date.parse(event.occurred_at))) return "occurred_at không phải thời gian hợp lệ";
  if (!event.privacy || event.privacy.payload_class !== "metadata_only") return "chỉ nhận payload metadata_only";
  if (hasForbiddenPayload(event)) return "payload chứa field nội dung/credential bị cấm";
  const cost = event.measurement?.cost;
  if (!cost || !["provider_reported", "gateway_reported", "server_price_estimate", "no_charge", "unavailable"].includes(cost.source)) return "cost.source không hợp lệ";
  if (cost.source === "unavailable" && cost.amount !== null) return "cost unavailable phải có amount null";
  if (cost.source === "no_charge" && cost.amount !== 0) return "cost no_charge phải có amount 0";
  return null;
}

async function body(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > 1024 * 1024) throw new Error("body quá 1 MiB");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function insert(event) {
  const result = await pool.query(`
    INSERT INTO telemetry_events (
      event_id, occurred_at, event_type, installation_id, project_ref, video_ref, run_id,
      stage, actor_kind, provider, model, outcome, measurement, privacy, payload
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::jsonb, $15::jsonb
    ) ON CONFLICT (event_id) DO NOTHING
  `, [
    event.event_id, event.occurred_at, event.event_type, event.installation_id, event.project_ref, event.video_ref,
    event.run_id, event.stage, event.actor_kind, event.provider, event.model,
    JSON.stringify(event.outcome), JSON.stringify(event.measurement), JSON.stringify(event.privacy), JSON.stringify(event),
  ]);
  return result.rowCount === 1;
}

function encryptAiLog(text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aiLogKey, iv);
  const ciphertext = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64") };
}

function validateAiLog(log) {
  if (!log || typeof log !== "object") return "AI log phải là object";
  for (const key of ["log_id", "occurred_at", "installation_id", "project_ref", "video_ref", "run_id", "kind"]) {
    if (typeof log[key] !== "string" || !log[key]) return `thiếu ${key}`;
  }
  for (const key of ["log_id", "installation_id", "run_id"]) {
    if (!UUID.test(log[key])) return `${key} phải là UUID`;
  }
  if (log.consent?.scope !== "ai_log" || log.consent?.explicit !== true) return "AI log cần explicit consent";
  if (typeof log.content !== "string" || !log.content || Buffer.byteLength(log.content) > 256 * 1024) return "AI log content phải có 1..256 KiB";
  return null;
}

async function insertAiLog(log) {
  const encrypted = encryptAiLog(log.content);
  const result = await pool.query(`
    INSERT INTO telemetry_ai_logs (
      log_id, occurred_at, installation_id, project_ref, video_ref, run_id, kind, consent, content_sha256, encrypted_content
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb)
    ON CONFLICT (log_id) DO NOTHING
  `, [
    log.log_id, log.occurred_at, log.installation_id, log.project_ref, log.video_ref, log.run_id, log.kind,
    JSON.stringify(log.consent), createHash("sha256").update(log.content).digest("hex"), JSON.stringify(encrypted),
  ]);
  return result.rowCount === 1;
}

async function pruneExpired() {
  if (eventRetentionDays > 0) {
    await pool.query("DELETE FROM telemetry_events WHERE received_at < now() - ($1::text || ' days')::interval", [eventRetentionDays]);
  }
  if (aiLogRetentionDays > 0) {
    await pool.query("DELETE FROM telemetry_ai_logs WHERE received_at < now() - ($1::text || ' days')::interval", [aiLogRetentionDays]);
  }
}

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      await pool.query("SELECT 1");
      return send(response, 200, { ok: true });
    }
    if (request.headers.authorization !== `Bearer ${token}`) return send(response, 401, { error: "unauthorized" });
    if (request.method === "POST" && request.url === "/v1/ai-logs") {
      if (!aiLogsEnabled) return send(response, 403, { error: "ai_logs_disabled" });
      if (request.headers["x-telemetry-ai-log-consent"] !== "true") return send(response, 403, { error: "explicit_consent_required" });
      const input = await body(request);
      const error = validateAiLog(input);
      if (error) return send(response, 400, { error });
      return send(response, 202, { accepted: true, inserted: await insertAiLog(input) });
    }
    if (request.method !== "POST" || request.url !== "/v1/events") return send(response, 404, { error: "not_found" });
    const input = await body(request);
    if (!Array.isArray(input.events) || !input.events.length || input.events.length > 500) return send(response, 400, { error: "events phải có 1..500 event" });
    for (const event of input.events) {
      const error = validate(event);
      if (error) return send(response, 400, { error });
    }
    const inserted = await Promise.all(input.events.map(insert));
    return send(response, 202, { accepted: input.events.length, inserted: inserted.filter(Boolean).length, duplicate: inserted.filter((value) => !value).length });
  } catch (error) {
    console.error(error);
    return send(response, error instanceof SyntaxError || error?.code === "22P02" ? 400 : 500, { error: "invalid_request_or_server_error" });
  }
});

await pruneExpired();
const retentionTimer = setInterval(() => pruneExpired().catch((error) => console.error("retention cleanup failed", error)), 6 * 60 * 60 * 1000);
retentionTimer.unref();
server.listen(port, "0.0.0.0", () => console.log(`telemetry collector listening on ${port}`));
