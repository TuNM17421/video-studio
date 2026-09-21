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
  readRuns,
  recordFeedback,
  reconcileQaFeedback,
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
