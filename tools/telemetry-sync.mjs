#!/usr/bin/env node
import { createDecipheriv } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const repo = path.resolve(process.cwd());
const root = path.join(repo, ".studio", "telemetry");
const endpoint = (process.env.STUDIO_TELEMETRY_URL || "").replace(/\/$/, "");
const token = process.env.STUDIO_TELEMETRY_TOKEN || "";
const aiLogsEnabled = process.env.STUDIO_TELEMETRY_AI_LOGS === "1";

if (!endpoint || !token) {
  console.error("STUDIO_TELEMETRY_URL và STUDIO_TELEMETRY_TOKEN là bắt buộc; không gửi gì khi thiếu config.");
  process.exit(2);
}

function readJsonl(name) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
}

async function post(url, body, extraHeaders = {}) {
  const response = await fetch(`${endpoint}${url}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...extraHeaders },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${await response.text()}`);
  return response.json();
}

function decrypt(log) {
  const key = Buffer.from(process.env.STUDIO_TELEMETRY_AI_LOG_KEY || "", "base64");
  if (key.length !== 32) throw new Error("STUDIO_TELEMETRY_AI_LOG_KEY phải là base64 của đúng 32 bytes để sync AI log.");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(log.encrypted.iv, "base64"));
  decipher.setAuthTag(Buffer.from(log.encrypted.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(log.encrypted.ciphertext, "base64")), decipher.final()]).toString("utf8");
}

const events = readJsonl("outbox.jsonl");
let inserted = 0;
let duplicate = 0;
for (let index = 0; index < events.length; index += 500) {
  const result = await post("/v1/events", { events: events.slice(index, index + 500) });
  inserted += result.inserted;
  duplicate += result.duplicate;
}

let aiLogs = 0;
if (aiLogsEnabled) {
  for (const log of readJsonl("ai-logs-outbox.jsonl")) {
    const result = await post("/v1/ai-logs", {
      log_id: log.log_id,
      occurred_at: log.occurred_at,
      installation_id: log.installation_id,
      project_ref: log.project_ref,
      video_ref: log.video_ref,
      run_id: log.run_id,
      kind: log.kind,
      consent: log.consent,
      content: decrypt(log),
    }, { "x-telemetry-ai-log-consent": "true" });
    if (result.inserted) aiLogs++;
  }
}

console.log(JSON.stringify({ events: events.length, inserted, duplicate, ai_logs_inserted: aiLogs, ai_logs_enabled: aiLogsEnabled }));
