#!/usr/bin/env node
import os from "node:os";
import path from "node:path";
import {
  addRunMetrics,
  finishRun,
  readFeedback,
  readRuns,
  recordFeedback,
  startRun,
  updateFeedback,
  workflowReport,
  writeImprovementPlan,
} from "./workflow-ledger.mjs";

const machineLabel = () => (process.env.STUDIO_MACHINE_LABEL || os.hostname() || "unknown").trim();

const argv = process.argv.slice(2);
const command = argv.shift();
const value = (name, fallback = "") => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const has = (name) => argv.includes(`--${name}`);
const videoId = value("video");
const repo = path.resolve(value("repo", process.cwd()));

function usage(message) {
  if (message) console.error(message);
  console.error(`Usage:
  node tools/video-workflow.mjs report --video <id> [--json]
  node tools/video-workflow.mjs plan --video <id>
  node tools/video-workflow.mjs feedback list --video <id> [--json]
  node tools/video-workflow.mjs feedback add --video <id> --stage <stage> --message <text> [--severity blocker|major|minor] [--source user]
  node tools/video-workflow.mjs feedback set --video <id> --id <feedback-id> --status open|planned|applied|verified|wontfix [--reason <text>] [--evidence <text>]
  node tools/video-workflow.mjs run start --video <id> --stage <stage> [--actor claude|codex|cli] [--model <name>]
  node tools/video-workflow.mjs run metrics --video <id> --run-id <id> [--model <name>] [--provider <name>] [--input-tokens <n>] [--cached-input-tokens <n>] [--output-tokens <n>] [--tool-calls <n>] [--cost-usd <n> --cost-source provider_reported|gateway_reported|server_price_estimate]
  node tools/video-workflow.mjs run finish --video <id> --run-id <id> --status done|error [--error <text>]

  For a plain shell command (build/verify/render/shoot), prefer run-logged.mjs — it wraps start+finish
  around the command itself so a forgotten "run finish" can't leave a run stuck "running":
  node tools/run-logged.mjs <stage> --video <id> -- <command> [args...]`);
  process.exit(2);
}

if (!command || !videoId) usage();

if (command === "report") {
  const report = workflowReport(repo, videoId);
  if (has("json")) console.log(JSON.stringify({ ...report, recentRuns: readRuns(repo, videoId).slice(-20) }, null, 2));
  else {
    const tokens = report.usage.inputTokens + report.usage.outputTokens;
    const byModel = Object.entries(report.byModel)
      .sort((a, b) => b[1].tokens - a[1].tokens)
      .map(([model, row]) => `  ${model}: ${row.runs} lượt · ${row.tokens.toLocaleString("en-US")} token · $${row.costUsd.toFixed(4)} · ${row.failures} lỗi`);
    const byMachine = Object.entries(report.byMachine)
      .sort((a, b) => b[1].runs - a[1].runs)
      .map(([machine, row]) => `  ${machine}: ${row.runs} lượt · ${Math.round(row.durationMs / 1000)}s · ${row.failures} lỗi`);
    console.log([
      `Workflow ${videoId}`,
      `runs: ${report.runs.total} · agent ${report.runs.agent} · deterministic ${report.runs.deterministic} · failures ${report.runs.failures}`,
      `automation: ${Math.round(report.automationRatio * 100)}% · tokens: ${tokens.toLocaleString("en-US")} · measured ${report.usage.measuredRuns}/${report.runs.agent} agent runs · cost $${report.usage.costUsd.toFixed(4)}`,
      `feedback: ${report.feedback.open} open · blocker ${report.feedback.blocker} · major ${report.feedback.major} · minor ${report.feedback.minor}`,
      `most expensive stage: ${report.mostExpensiveStage || "chưa đủ dữ liệu"}`,
      "theo model (lượt agent):",
      ...(byModel.length ? byModel : ["  (chưa có lượt agent nào)"]),
      "theo máy:",
      ...(byMachine.length ? byMachine : ["  (chưa ghi máy nào)"]),
      `plan: ${report.files.plan}`,
    ].join("\n"));
  }
} else if (command === "plan") {
  console.log(path.relative(repo, writeImprovementPlan(repo, videoId)));
} else if (command === "feedback") {
  const action = argv.shift();
  if (action === "list") {
    const items = readFeedback(repo, videoId);
    if (has("json")) console.log(JSON.stringify(items, null, 2));
    else for (const item of items) console.log(`${item.id}\t${item.severity}\t${item.status}\t${item.stage}\t${item.message}`);
  } else if (action === "add") {
    const message = value("message");
    const stage = value("stage");
    if (!message || !stage) usage("feedback add cần --stage và --message.");
    const item = recordFeedback(repo, videoId, {
      message,
      stage,
      severity: value("severity", "major"),
      source: value("source", "user"),
      owner: value("owner", "coding-agent"),
      acceptance: value("acceptance", ""),
      evidence: value("evidence", ""),
    });
    console.log(item.id);
  } else if (action === "set") {
    const id = value("id");
    const status = value("status");
    if (!id || !["open", "planned", "applied", "verified", "wontfix"].includes(status)) usage("feedback set cần --id và --status hợp lệ.");
    const reason = value("reason", "");
    if (status === "wontfix" && !reason.trim()) usage("Bỏ qua (wontfix) cần --reason — lý do được lưu lại trong ledger.");
    updateFeedback(repo, videoId, id, {
      status,
      evidence: value("evidence", ""),
      ...(status === "wontfix" ? { skipReason: reason.trim(), decidedBy: "cli", decidedAt: new Date().toISOString() } : {}),
    });
    console.log(id);
  } else usage("Feedback action không hợp lệ.");
} else if (command === "run") {
  // For an agent-authored stage (cues/scenes/deliver) run directly from a CLI session, not Video
  // Studio: no code wraps the session from outside, so these two calls are the only way that stage's
  // time/tokens/model land in the same runs.jsonl Video Studio itself writes to. A shell command
  // (build/verify/render/shoot) should use run-logged.mjs instead — it cannot forget the finish call.
  const action = argv.shift();
  if (action === "start") {
    const stage = value("stage");
    if (!stage) usage("run start cần --stage.");
    const run = startRun(repo, videoId, {
      stage,
      actor: value("actor", "cli"),
      mode: value("mode", "agent"),
      label: value("label", stage),
      machine: machineLabel(),
    });
    if (has("json")) console.log(JSON.stringify(run));
    else console.log(`RUN_ID=${run.runId}`);
  } else if (action === "finish") {
    const runId = value("run-id");
    const status = value("status", "done");
    if (!runId || !["done", "error", "stopped"].includes(status)) usage("run finish cần --run-id và --status done|error|stopped hợp lệ.");
    const model = value("model");
    if (model) addRunMetrics(repo, videoId, runId, { model });
    finishRun(repo, videoId, runId, { status, error: value("error") || null });
    console.log(runId);
  } else if (action === "metrics") {
    const runId = value("run-id");
    if (!runId) usage("run metrics cần --run-id.");
    const number = (name) => {
      const raw = value(name);
      if (raw === "") return undefined;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) usage(`--${name} phải là số không âm.`);
      return parsed;
    };
    const costUsd = number("cost-usd");
    const costSource = value("cost-source");
    const allowedSources = ["provider_reported", "gateway_reported", "server_price_estimate"];
    if (costUsd !== undefined && !allowedSources.includes(costSource)) {
      usage("--cost-usd cần --cost-source provider_reported|gateway_reported|server_price_estimate.");
    }
    addRunMetrics(repo, videoId, runId, {
      model: value("model") || undefined,
      provider: value("provider") || undefined,
      inputTokens: number("input-tokens"),
      cachedInputTokens: number("cached-input-tokens"),
      outputTokens: number("output-tokens"),
      toolCalls: number("tool-calls"),
      costUsd,
      costSource: costSource || undefined,
    });
    console.log(runId);
  } else usage("run action không hợp lệ (start, metrics hoặc finish).");
} else usage("Command không hợp lệ.");
