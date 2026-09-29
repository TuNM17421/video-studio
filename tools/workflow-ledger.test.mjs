import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  addRunMetrics,
  blockingFeedback,
  finishRun,
  readFeedback,
  readAiLogOutbox,
  readRuns,
  readTelemetryOutbox,
  recordFeedback,
  reconcileQaFeedback,
  recordAiLog,
  startRun,
  updateFeedback,
  workflowReport,
} from "./workflow-ledger.mjs";

function fixture() {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "video-workflow-"));
  fs.mkdirSync(path.join(repo, "projects", "demo"), { recursive: true });
  return { repo, id: "demo" };
}

test("ledger folds run events and exposes token/automation hotspots", () => {
  const { repo, id } = fixture();
  const agent = startRun(repo, id, { stage: "scenes", actor: "codex", mode: "agent" });
  addRunMetrics(repo, id, agent.runId, { inputTokens: 1200, cachedInputTokens: 800, outputTokens: 300, toolCalls: 4, costUsd: 0.12 });
  finishRun(repo, id, agent.runId, { status: "done" });
  const gate = startRun(repo, id, { stage: "scenes.qa", actor: "system", mode: "deterministic" });
  finishRun(repo, id, gate.runId, { status: "done", checks: ["build", "verify", "stills"] });

  const report = workflowReport(repo, id);
  assert.equal(report.runs.agent, 1);
  assert.equal(report.runs.deterministic, 1);
  assert.equal(report.automationRatio, 0.5);
  assert.equal(report.usage.inputTokens, 1200);
  assert.equal(report.usage.cachedInputTokens, 800);
  assert.equal(report.mostExpensiveStage, "scenes");
});

test("a run records which machine ran it, and metrics can attach which model", () => {
  const { repo, id } = fixture();
  const agent = startRun(repo, id, { stage: "cues", actor: "codex", mode: "agent", machine: "thai-mac" });
  addRunMetrics(repo, id, agent.runId, { inputTokens: 500, outputTokens: 100, costUsd: 0.02, model: "gpt-5.6-sol" });
  finishRun(repo, id, agent.runId, { status: "done" });
  const gate = startRun(repo, id, { stage: "cues.gate", actor: "system", mode: "deterministic", machine: "thai-mac" });
  finishRun(repo, id, gate.runId, { status: "error" });

  const [run] = readRuns(repo, id);
  assert.equal(run.machine, "thai-mac");
  assert.equal(run.model, "gpt-5.6-sol");

  const report = workflowReport(repo, id);
  assert.deepEqual(report.byModel, { "gpt-5.6-sol": { runs: 1, tokens: 600, costUsd: 0.02, failures: 0 } });
  assert.deepEqual(report.byMachine, { "thai-mac": { runs: 2, durationMs: report.byMachine["thai-mac"].durationMs, failures: 1 } });
});

test("a run with no machine, or an agent run with no model, groups under the unknown bucket", () => {
  const { repo, id } = fixture();
  const agent = startRun(repo, id, { stage: "scenes", actor: "claude", mode: "agent" });
  finishRun(repo, id, agent.runId, { status: "done" });

  const report = workflowReport(repo, id);
  assert.deepEqual(report.byModel, { "(chưa rõ)": { runs: 1, tokens: 0, costUsd: 0, failures: 0 } });
  assert.ok(report.byMachine["(chưa rõ)"]);
});

test("telemetry outbox is metadata-only and never turns an unknown cost into zero", () => {
  const { repo, id } = fixture();
  const run = startRun(repo, id, { stage: "scenes", actor: "codex", mode: "agent", model: "gpt-test" });
  addRunMetrics(repo, id, run.runId, { inputTokens: 500, outputTokens: 100, costUsd: 9, rawPrompt: "must-not-export" });
  finishRun(repo, id, run.runId, { status: "done" });

  const events = readTelemetryOutbox(repo);
  assert.deepEqual(events.map((event) => event.event_type), ["run_started", "usage_recorded", "run_finished"]);
  assert.equal(events[1].measurement.input_tokens, 500);
  assert.equal(events[1].measurement.cost.amount, null);
  assert.equal(events[1].measurement.cost.source, "unavailable");
  assert.equal(events[2].measurement.input_tokens, null);
  assert.equal(events[2].measurement.cost.amount, null);
  assert.equal(JSON.stringify(events).includes("must-not-export"), false);
  assert.equal(events[0].installation_id, events[2].installation_id);
});

test("telemetry preserves a cost only when its provenance is explicit", () => {
  const { repo, id } = fixture();
  const run = startRun(repo, id, { stage: "script.write", actor: "cli", mode: "agent" });
  addRunMetrics(repo, id, run.runId, { outputTokens: 42, costUsd: 0.03, costSource: "gateway_reported" });

  const usage = readTelemetryOutbox(repo).at(-1);
  assert.deepEqual(usage.measurement.cost, { amount: 0.03, currency: "USD", source: "gateway_reported" });
});

test("video duration rides on the render run, so cost/minute can be computed downstream", () => {
  const { repo, id } = fixture();
  const render = startRun(repo, id, { stage: "render", actor: "system", mode: "deterministic" });
  addRunMetrics(repo, id, render.runId, { videoDurationSec: 372.4 });
  const usage = readTelemetryOutbox(repo).find((event) => event.event_type === "usage_recorded");
  assert.equal(usage.measurement.video_duration_s, 372.4);
});

test("usage event carries the run's stage and actor so tokens can be grouped per phase", () => {
  const { repo, id } = fixture();
  const run = startRun(repo, id, { stage: "scenes.qa", actor: "claude", mode: "agent" });
  addRunMetrics(repo, id, run.runId, { inputTokens: 1200, cachedInputTokens: 800, outputTokens: 300, model: "claude-test", costUsd: 0.12, costSource: "provider_reported" });

  const usage = readTelemetryOutbox(repo).find((event) => event.event_type === "usage_recorded");
  assert.equal(usage.stage, "scenes.qa");
  assert.equal(usage.actor_kind, "claude");
  assert.equal(usage.model, "claude-test");
  assert.deepEqual(usage.measurement.cost, { amount: 0.12, currency: "USD", source: "provider_reported" });
});

test("a voice step records characters/credits/GPU time, and a free step is a known zero, not unknown", () => {
  const { repo, id } = fixture();
  const eleven = startRun(repo, id, { stage: "voice", actor: "system", mode: "deterministic" });
  addRunMetrics(repo, id, eleven.runId, { provider: "elevenlabs", characters: 1200, credits: 600 });
  const kaggle = startRun(repo, id, { stage: "kaggle-generate", actor: "system", mode: "deterministic" });
  addRunMetrics(repo, id, kaggle.runId, { provider: "kaggle", gpuSeconds: 540, costUsd: 5, costSource: "no_charge" });

  const [a, b] = readTelemetryOutbox(repo).filter((event) => event.event_type === "usage_recorded");
  assert.equal(a.provider, "elevenlabs");
  assert.equal(a.measurement.characters, 1200);
  assert.equal(a.measurement.credits, 600);
  assert.deepEqual(a.measurement.cost, { amount: null, currency: "USD", source: "unavailable" });
  assert.equal(b.measurement.gpu_seconds, 540);
  assert.deepEqual(b.measurement.cost, { amount: 0, currency: "USD", source: "no_charge" });
});

test("regeneration is numbered: attempt per stage, version per delivered render, trigger and feedback ids", () => {
  const { repo, id } = fixture();
  const first = startRun(repo, id, { stage: "scenes", actor: "codex", mode: "agent" });
  finishRun(repo, id, first.runId, { status: "done" });
  const render = startRun(repo, id, { stage: "render", actor: "system", mode: "deterministic" });
  finishRun(repo, id, render.runId, { status: "done" });
  const deliver = startRun(repo, id, { stage: "deliver.gate", actor: "system", mode: "deterministic" });
  const fix = startRun(repo, id, { stage: "scenes", actor: "codex", mode: "agent", trigger: "qa_fix", feedbackIds: ["fb-1"] });
  assert.equal(deliver.version, 1, "delivery ships the version just rendered, it does not open v2");

  assert.deepEqual([first.attempt, first.version, first.trigger], [1, 1, "initial"]);
  assert.deepEqual([render.attempt, render.version], [1, 1]);
  assert.deepEqual([fix.attempt, fix.version, fix.trigger, fix.feedbackIds], [2, 2, "qa_fix", ["fb-1"]]);
  const started = readTelemetryOutbox(repo).filter((event) => event.event_type === "run_started").at(-1);
  assert.deepEqual(started.run_context, { attempt: 2, version: 2, trigger: "qa_fix", feedback_ids: ["fb-1"] });
});

test("feedback reaches telemetry as metadata linked to the run that found it, never its text", () => {
  const { repo, id } = fixture();
  const run = startRun(repo, id, { stage: "scenes.qa", actor: "claude", mode: "agent" });
  const item = recordFeedback(repo, id, { stage: "scenes", scope: "cue-03", code: "overlap", source: "qa", severity: "major", message: "Chữ đè mascot bí mật", runId: run.runId });
  updateFeedback(repo, id, item.id, { status: "verified", resolvedBy: "run-fix" });

  const states = readTelemetryOutbox(repo).filter((event) => event.event_type === "feedback_state");
  assert.equal(states.length, 2);
  assert.equal(states[0].run_id, run.runId);
  assert.deepEqual([states[1].feedback.status, states[1].feedback.resolved_by_run, states[1].feedback.found_by_run], ["verified", "run-fix", run.runId]);
  assert.equal(JSON.stringify(states).includes("bí mật"), false);
});

test("AI log is disabled by default, and opt-in log stays encrypted in its separate outbox", () => {
  const { repo, id } = fixture();
  const run = startRun(repo, id, { stage: "qa", actor: "cli", mode: "agent" });
  const before = process.env.STUDIO_TELEMETRY_AI_LOGS;
  const keyBefore = process.env.STUDIO_TELEMETRY_AI_LOG_KEY;
  delete process.env.STUDIO_TELEMETRY_AI_LOGS;
  assert.deepEqual(recordAiLog(repo, id, { runId: run.runId, kind: "agent_transcript", text: "private thinking" }), { recorded: false, reason: "disabled" });
  process.env.STUDIO_TELEMETRY_AI_LOGS = "1";
  process.env.STUDIO_TELEMETRY_AI_LOG_KEY = Buffer.alloc(32, 7).toString("base64");
  assert.throws(() => recordAiLog(repo, id, { runId: run.runId, kind: "agent_transcript", text: "outside" }), /chỉ được Video Studio/);
  const recorded = recordAiLog(repo, id, { source: "studio", runId: run.runId, kind: "agent_transcript", text: "Authorization: Bearer test-fixture-token" });
  const [log] = readAiLogOutbox(repo);
  assert.equal(recorded.recorded, true);
  assert.equal(log.consent.explicit, true);
  assert.equal(log.encrypted.algorithm, "aes-256-gcm");
  assert.equal(JSON.stringify(log).includes("secret-token"), false);
  assert.equal(JSON.stringify(log).includes("abcdefghijklmnop"), false);
  if (before === undefined) delete process.env.STUDIO_TELEMETRY_AI_LOGS; else process.env.STUDIO_TELEMETRY_AI_LOGS = before;
  if (keyBefore === undefined) delete process.env.STUDIO_TELEMETRY_AI_LOG_KEY; else process.env.STUDIO_TELEMETRY_AI_LOG_KEY = keyBefore;
});

test("feedback is deduplicated, counted and kept in the generated plan", () => {
  const { repo, id } = fixture();
  const first = recordFeedback(repo, id, { stage: "scenes", source: "user", severity: "major", message: "Mascot bị nghiêng hông." });
  recordFeedback(repo, id, { stage: "scenes", source: "user", severity: "major", message: "  Mascot bị nghiêng hông.  " });
  const items = readFeedback(repo, id);
  assert.equal(items.length, 1);
  assert.equal(items[0].recurrence, 2);
  assert.equal(blockingFeedback(repo, id, "scenes").length, 1);
  assert.match(fs.readFileSync(path.join(repo, "projects", id, ".studio", "IMPROVEMENT-PLAN.md"), "utf8"), /lặp lại: 2/);
  updateFeedback(repo, id, first.id, { status: "verified" });
  assert.equal(blockingFeedback(repo, id, "scenes").length, 0);
});

test("feedback the agent already applied does not block approve", () => {
  const { repo, id } = fixture();
  const item = recordFeedback(repo, id, { stage: "cues", source: "user", severity: "major", message: "Câu mở đầu dài quá." });
  assert.equal(blockingFeedback(repo, id, "cues").length, 1);
  updateFeedback(repo, id, item.id, { status: "applied" });
  assert.equal(blockingFeedback(repo, id, "cues").length, 0);
});

test("QA reconciliation verifies findings that no longer recur", () => {
  const { repo, id } = fixture();
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "text-overflow", message: "Chữ tràn khung", scene: "cue-03.png" }], "qa-1");
  assert.equal(blockingFeedback(repo, id, "scenes").length, 1);
  reconcileQaFeedback(repo, id, "scenes", [], "qa-2");
  assert.equal(blockingFeedback(repo, id, "scenes").length, 0);
  assert.equal(readFeedback(repo, id)[0].status, "verified");
});

test("the same QA defect reworded by the model stays one open item and counts as recurring", () => {
  const { repo, id } = fixture();
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "blocker", code: "overlap", scene: "cue-03.png", message: "Chữ chạm mascot" }], "qa-1");
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "blocker", code: "overlap", scene: "cue 3", message: "Khối văn bản đè lên cánh trái của mascot" }], "qa-2");
  const items = readFeedback(repo, id);
  assert.equal(items.length, 1);
  assert.equal(items[0].status, "open");
  assert.equal(items[0].recurrence, 2);
  assert.equal(items[0].scope, "cue-03");
  assert.equal(items[0].message, "Khối văn bản đè lên cánh trái của mascot");
  assert.equal(blockingFeedback(repo, id, "scenes").length, 1);
});

test("different defect codes on one scene are tracked separately", () => {
  const { repo, id } = fixture();
  reconcileQaFeedback(repo, id, "scenes", [
    { severity: "major", code: "overlap", scene: "cue-01.png", message: "a" },
    { severity: "minor", code: "low-contrast", scene: "cue-01.png", message: "b" },
  ], "qa-1");
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "overlap", scene: "cue-01.png", message: "a2" }], "qa-2");
  const byCode = Object.fromEntries(readFeedback(repo, id).map((item) => [item.code, item.status]));
  assert.deepEqual(byCode, { overlap: "open", "low-contrast": "verified" });
});

test("a QA finding the user skipped stays skipped when review sees it again", () => {
  const { repo, id } = fixture();
  const [item] = reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "overlap", scene: "cue-02.png", message: "a" }], "qa-1");
  updateFeedback(repo, id, item.id, { status: "wontfix", skipReason: "Cố ý thiết kế" });
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "overlap", scene: "cue-02.png", message: "a, lần hai" }], "qa-2");
  const items = readFeedback(repo, id);
  assert.equal(items.length, 1);
  assert.equal(items[0].status, "wontfix");
  assert.equal(items[0].recurrence, 2);
  assert.equal(blockingFeedback(repo, id, "scenes").length, 0);
});

test("a finding the agent claimed to fix reopens when review still sees it", () => {
  const { repo, id } = fixture();
  const [item] = reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "clipped", scene: "cue-05.png", message: "a" }], "qa-1");
  updateFeedback(repo, id, item.id, { status: "applied" });
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "clipped", scene: "cue-05.png", message: "a" }], "qa-2");
  assert.equal(readFeedback(repo, id)[0].status, "open");
  assert.equal(blockingFeedback(repo, id, "scenes").length, 1);
});

test("telemetry names the fixing run as resolver and the QA run as verifier", () => {
  const { repo, id } = fixture();
  const found = startRun(repo, id, { stage: "scenes.qa", provider: "codex" });
  reconcileQaFeedback(repo, id, "scenes", [{ severity: "major", code: "text-overflow", message: "Chữ tràn khung", scene: "cue-03.png" }], found.runId);
  const item = readFeedback(repo, id)[0];
  const fix = startRun(repo, id, { stage: "scenes", provider: "codex", feedbackIds: [item.id] });
  const qa = startRun(repo, id, { stage: "scenes.qa", provider: "codex" });
  reconcileQaFeedback(repo, id, "scenes", [], qa.runId);
  const last = readTelemetryOutbox(repo).filter((e) => e.event_type === "feedback_state").at(-1).feedback;
  assert.equal(last.resolved_by_run, fix.runId);
  assert.equal(last.verified_by_run, qa.runId);
  // Local field the review panel reads is unchanged.
  assert.equal(readFeedback(repo, id)[0].resolvedBy, qa.runId);
});
