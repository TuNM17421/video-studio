#!/usr/bin/env node
/**
 * Dữ liệu demo cho buổi trình bày: đi qua CHÍNH workflow ledger (cùng định dạng event với Studio thật), đồng hồ được
 * dịch để trải 4 video ra 10 ngày, rồi gửi lên collector. Mọi video có tiền tố `demo-`.
 *
 *   TELEMETRY_URL=https://host:8444 TELEMETRY_TOKEN=... node telemetry/demo/seed-demo.mjs
 *   (NODE_TLS_REJECT_UNAUTHORIZED=0 chỉ khi thử với TLS internal)
 *
 * Xoá sau demo (trên máy chạy Postgres):
 *   DELETE FROM telemetry_events WHERE video_ref LIKE 'demo-%';
 *
 * ElevenLabs trong demo dùng đúng bảng giá công khai (pricing-catalog.ts), không phải số giả định.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const ledger = await import(path.join(here, "..", "..", "tools", "workflow-ledger.mjs"));
const { startRun, addRunMetrics, finishRun, recordFeedback, updateFeedback, readTelemetryOutbox } = ledger;

const url = (process.env.TELEMETRY_URL || "").replace(/\/$/, "");
const token = process.env.TELEMETRY_TOKEN || "";
if (!url || !token) {
  console.error("Cần TELEMETRY_URL và TELEMETRY_TOKEN.");
  process.exit(2);
}

const repo = fs.mkdtempSync(path.join(os.tmpdir(), "telemetry-demo-"));
const realNow = Date.now;
let clock = realNow() - 10 * 86_400_000;
Date.now = () => clock;
const minutes = (m) => { clock += Math.round(m * 60_000); };

// Phải khớp studio/src/lib/server/pricing-catalog.ts — đổi giá thì sửa cả hai nơi.
const ELEVENLABS_USD_PER_1K_CHARS = { eleven_turbo_v2_5: 0.05, eleven_v3: 0.10 };
const claude = (input, cached, output, cost) => ({ provider: "claude", model: "claude-sonnet-5", inputTokens: input, cachedInputTokens: cached, outputTokens: output, costUsd: cost, costSource: "provider_reported" });
const codex = (input, cached, output, cost, extra = {}) => ({ provider: "codex", model: "gpt-5.6-luna", inputTokens: input, cachedInputTokens: cached, outputTokens: output, ...(cost === null ? {} : { costUsd: cost, costSource: "gateway_reported", gatewayStatus: "ok" }), ...extra });

function run(video, stage, actor, mode, mins, metrics, { status = "done", trigger, feedbackIds } = {}) {
  fs.mkdirSync(path.join(repo, "projects", video), { recursive: true });
  const r = startRun(repo, video, { stage, actor, mode, trigger, feedbackIds, machine: "demo" });
  minutes(mins);
  if (metrics) addRunMetrics(repo, video, r.runId, { sessionId: `sess-${r.runId.slice(0, 8)}`, promptSha256: r.runId.slice(9, 25), ...metrics });
  finishRun(repo, video, r.runId, { status });
  minutes(3);
  return r;
}

function voice(video, kind) {
  if (kind === "elevenlabs") {
    const model = "eleven_turbo_v2_5", characters = 5200, credits = 2600;
    const costUsd = Math.round((characters * ELEVENLABS_USD_PER_1K_CHARS[model] / 1000) * 1e6) / 1e6;
    return run(video, "voice", "system", "deterministic", 6, { provider: "elevenlabs", model, characters, credits, costUsd, costSource: "server_price_estimate" });
  }
  if (kind === "kaggle") return run(video, "kaggle-generate", "system", "deterministic", 14, { provider: "kaggle", gpuSeconds: 780, costUsd: 0, costSource: "no_charge" });
  return run(video, "omnivoice-generate", "system", "deterministic", 22, { provider: "omnivoice-local", costUsd: 0, costSource: "no_charge" });
}

function video(id, { voiceKind, qaRounds, userFeedbackAfterRender, unmeasuredScenes = false, stopAfterCues = false, durationSec }) {
  run(id, "script.write", "claude", "agent", 5, claude(9000, 42000, 6500, 0.31));
  run(id, "cues", "codex", "agent", 8, codex(460000, 400000, 3000, 0.13));
  run(id, "cues.gate", "system", "deterministic", 1);
  if (stopAfterCues) return;
  minutes(90); // chờ người duyệt lời
  voice(id, voiceKind);
  run(id, "voice", "system", "deterministic", 2, { provider: "import", costUsd: 0, costSource: "no_charge" });
  const scenes = run(id, "scenes", "codex", "agent", 26, codex(1_900_000, 1_650_000, 21000, unmeasuredScenes ? null : 0.58));
  run(id, "scenes.gate", "system", "deterministic", 4);
  for (let round = 0; round < qaRounds; round++) {
    const qa = run(id, "scenes.qa", "claude", "agent", 3, claude(3500, 58000, 2400, 0.22));
    const found = [
      recordFeedback(repo, id, { stage: "scenes", scope: `cue-0${round + 3}`, code: "overlap", source: "qa", qaProvider: "claude", severity: "major", message: "demo", runId: qa.runId }),
      ...(round === 0 ? [recordFeedback(repo, id, { stage: "scenes", scope: "cue-07", code: "text-overflow", source: "qa", qaProvider: "claude", severity: "blocker", message: "demo", runId: qa.runId })] : []),
    ];
    minutes(20);
    const fix = run(id, "scenes", "codex", "agent", 9, codex(380000, 340000, 5200, 0.12), { trigger: "qa_fix", feedbackIds: found.map((f) => f.id) });
    for (const f of found) updateFeedback(repo, id, f.id, { status: "verified", resolvedBy: fix.runId });
    run(id, "scenes.gate", "system", "deterministic", 4, null, { trigger: "retry" });
  }
  void scenes;
  // ffprobe'd off the finished MP4 in production (render.ts); the demo just states it, like the rest of the data.
  run(id, "render", "system", "deterministic", 16, durationSec ? { videoDurationSec: durationSec } : null);
  run(id, "deliver.gate", "system", "deterministic", 2);
  if (userFeedbackAfterRender) {
    minutes(24 * 60); // team QA gửi góp ý hôm sau
    const fb = recordFeedback(repo, id, { stage: "scenes", scope: "cue-05", source: "user", severity: "major", message: "demo" });
    const fix = run(id, "scenes", "codex", "agent", 11, codex(520000, 470000, 6100, 0.16), { trigger: "feedback", feedbackIds: [fb.id] });
    updateFeedback(repo, id, fb.id, { status: "applied" });
    run(id, "render", "system", "deterministic", 16, durationSec ? { videoDurationSec: durationSec } : null);
    void fix;
  }
  minutes(24 * 60);
}

video("demo-d06-v01-ai-ethics", { voiceKind: "elevenlabs", qaRounds: 1, userFeedbackAfterRender: false, durationSec: 372 });
video("demo-d06-v02-rag-basics", { voiceKind: "kaggle", qaRounds: 2, userFeedbackAfterRender: true, durationSec: 318 });
video("demo-d06-v03-agents", { voiceKind: "local", qaRounds: 1, userFeedbackAfterRender: false, unmeasuredScenes: true, durationSec: 405 });
video("demo-d06-v04-eval-draft", { voiceKind: "local", qaRounds: 0, userFeedbackAfterRender: false, stopAfterCues: true });
Date.now = realNow;

const events = readTelemetryOutbox(repo);
let inserted = 0;
for (let i = 0; i < events.length; i += 500) {
  const res = await fetch(`${url}/v1/events`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ events: events.slice(i, i + 500) }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  inserted += (await res.json()).inserted;
}
fs.rmSync(repo, { recursive: true, force: true });
console.log(`demo: ${events.length} event, ${inserted} mới → ${url}`);
