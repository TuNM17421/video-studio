import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2 };
const OPEN_STATUSES = new Set(["open", "planned", "applied"]);
// "applied" = agent đã sửa, chờ người dùng xác nhận qua approve. Approve tự nó chuyển
// applied -> verified, nên nếu applied vẫn tính là blocking thì approve sẽ luôn 409 vĩnh viễn.
const BLOCKING_STATUSES = new Set(["open", "planned"]);
// Finding của lượt QA độc lập; provider nào chấm nằm ở `qaProvider`.
const QA_SOURCES = new Set(["qa"]);

const iso = (now = Date.now()) => new Date(now).toISOString();
const stateDir = (repo, videoId) => path.join(repo, "projects", videoId, ".studio");
const stateFile = (repo, videoId, name) => path.join(stateDir(repo, videoId), name);
const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();

function append(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean).flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; }
  });
}

// Mã lỗi cố định của một QA finding. Câu `message` do model tự viết và không bao giờ lặp y hệt giữa
// hai lượt ("Chữ chạm mascot" rồi "Khối văn bản đè lên cánh trái của mascot"), nên nó chỉ để người đọc;
// nhận dạng một lỗi là `stage + cảnh + code`. Băm theo câu chữ thì lỗi cũ bị coi là "không tái hiện" và
// tự `verified` — mở khoá nút Duyệt cho cảnh chưa sửa — còn `recurrence` không bao giờ vượt 1.
export const QA_CODES = [
  "text-overflow", // chữ tràn khung, bị cắt, vượt vùng nội dung
  "overlap", // hai khối/chữ/nhân vật chồng lên nhau
  "unreadable", // chữ quá nhỏ, quá dày, sai font, không đọc được
  "low-contrast", // chữ/nét chìm vào nền
  "empty-layout", // bố cục trống, lệch, dồn một góc
  "clipped", // thành phần bị xén ở mép khung hình
  "misaligned", // lệch lưới, lệch hàng, khoảng cách không đều
  "repetitive", // chuỗi cảnh lặp máy móc, không có nhịp
  "off-script", // chữ/số trên màn hình không có trong kịch bản
  "module", // vi phạm tiêu chí QA riêng của một năng lực đang bật
  "other",
];
const QA_CODE_SET = new Set(QA_CODES);

// Ảnh QA tên `cue-03.png`; model có thể ghi "cue-03", "cue 3", "Cue-03.png". Quy về một khoá.
export function sceneKey(scene) {
  const text = cleanText(scene).toLocaleLowerCase("vi");
  const cue = text.match(/cue[\s_-]*0*(\d+)/);
  return cue ? `cue-${cue[1].padStart(2, "0")}` : text.replace(/\.(png|jpe?g)$/, "");
}

// `scope` phân biệt cùng một lỗi ở nhiều vị trí (cue-01 và cue-05). Finding có `code` băm theo
// stage + scope + code; feedback của người dùng không có code nên vẫn dedup theo câu chữ.
function fingerprint(stage, message, scope = "", code = "") {
  const what = code ? `code:${code}` : cleanText(message).toLocaleLowerCase("vi");
  return createHash("sha256")
    .update(`${stage}\n${cleanText(scope).toLocaleLowerCase("vi")}\n${what}`)
    .digest("hex")
    .slice(0, 16);
}

export function startRun(repo, videoId, input) {
  const run = {
    runId: randomUUID(),
    videoId,
    stage: input.stage,
    actor: input.actor,
    mode: input.mode,
    label: input.label || input.stage,
    // Which physical machine ran this — model comes later via addRunMetrics, once the agent CLI's own
    // protocol has reported it (or stays unset for a deterministic run, which has no model).
    machine: input.machine || null,
    startedAt: iso(),
    status: "running",
  };
  append(stateFile(repo, videoId, "runs.jsonl"), { event: "started", at: run.startedAt, run });
  writeImprovementPlan(repo, videoId);
  return run;
}

export function addRunMetrics(repo, videoId, runId, metrics = {}) {
  append(stateFile(repo, videoId, "runs.jsonl"), { event: "metrics", at: iso(), runId, metrics });
  writeImprovementPlan(repo, videoId);
}

export function finishRun(repo, videoId, runId, result = {}) {
  append(stateFile(repo, videoId, "runs.jsonl"), {
    event: "finished",
    at: iso(),
    runId,
    status: result.status || "done",
    error: result.error || null,
    checks: result.checks || [],
    artifacts: result.artifacts || [],
  });
  writeImprovementPlan(repo, videoId);
}

export function readRuns(repo, videoId) {
  const byId = new Map();
  for (const event of readJsonl(stateFile(repo, videoId, "runs.jsonl"))) {
    if (event.event === "started" && event.run?.runId) {
      byId.set(event.run.runId, { ...event.run });
      continue;
    }
    if (!event.runId || !byId.has(event.runId)) continue;
    const run = byId.get(event.runId);
    if (event.event === "metrics") Object.assign(run, event.metrics || {});
    if (event.event === "finished") {
      Object.assign(run, {
        status: event.status,
        finishedAt: event.at,
        durationMs: Math.max(0, Date.parse(event.at) - Date.parse(run.startedAt)),
        error: event.error || null,
        checks: event.checks || [],
        artifacts: event.artifacts || [],
      });
    }
  }
  return [...byId.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
}

export function readFeedback(repo, videoId) {
  const byId = new Map();
  for (const event of readJsonl(stateFile(repo, videoId, "feedback.jsonl"))) {
    if (event.event === "opened" && event.feedback?.id) {
      byId.set(event.feedback.id, { ...event.feedback });
    } else if (event.event === "updated" && event.id && byId.has(event.id)) {
      Object.assign(byId.get(event.id), event.patch || {}, { updatedAt: event.at });
    }
  }
  return [...byId.values()].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export function recordFeedback(repo, videoId, input) {
  const now = iso();
  const code = input.code && QA_CODE_SET.has(input.code) ? input.code : "";
  const fp = fingerprint(input.stage, input.message, input.scope, code);
  // A QA finding the user chose to skip stays skipped when the next review sees it again: it counts the
  // recurrence but must not reopen and re-block the approve button behind the user's back.
  const existing = readFeedback(repo, videoId)
    .find((item) => item.fingerprint === fp && (OPEN_STATUSES.has(item.status) || (code && item.status === "wontfix")));
  if (existing) {
    // Seen again after the agent said it fixed it (planned/applied): it is open again.
    const reopened = code && ["planned", "applied"].includes(existing.status) ? { status: "open" } : {};
    append(stateFile(repo, videoId, "feedback.jsonl"), {
      event: "updated",
      at: now,
      id: existing.id,
      patch: {
        lastSeenAt: now,
        recurrence: (existing.recurrence || 1) + 1,
        severity: SEVERITY_ORDER[input.severity] < SEVERITY_ORDER[existing.severity]
          ? input.severity
          : existing.severity,
        evidence: input.evidence || existing.evidence || "",
        // Cùng lỗi, lời mô tả mới nhất: người đọc thấy câu model vừa viết, nhận dạng vẫn là code.
        ...(code ? { message: cleanText(input.message), acceptance: cleanText(input.acceptance || existing.acceptance) } : {}),
        runId: input.runId || existing.runId || null,
        ...reopened,
      },
    });
    writeImprovementPlan(repo, videoId);
    return readFeedback(repo, videoId).find((item) => item.id === existing.id);
  }

  const feedback = {
    id: `fb-${randomUUID().slice(0, 8)}`,
    fingerprint: fp,
    videoId,
    stage: input.stage,
    scope: cleanText(input.scope || ""),
    ...(code ? { code } : {}),
    source: input.source || "user",
    ...(input.qaProvider ? { qaProvider: input.qaProvider } : {}),
    severity: input.severity || "major",
    message: cleanText(input.message),
    status: input.status || "open",
    owner: input.owner || (QA_SOURCES.has(input.source) ? "coding-agent" : "owner"),
    acceptance: cleanText(input.acceptance || "Người duyệt xác nhận kết quả đã đáp ứng góp ý."),
    evidence: cleanText(input.evidence || ""),
    runId: input.runId || null,
    recurrence: 1,
    createdAt: now,
    lastSeenAt: now,
    updatedAt: now,
  };
  append(stateFile(repo, videoId, "feedback.jsonl"), { event: "opened", at: now, feedback });
  writeImprovementPlan(repo, videoId);
  return feedback;
}

export function updateFeedback(repo, videoId, id, patch) {
  const existing = readFeedback(repo, videoId).find((item) => item.id === id);
  if (!existing) throw new Error(`Không tìm thấy feedback ${id}`);
  append(stateFile(repo, videoId, "feedback.jsonl"), { event: "updated", at: iso(), id, patch });
  writeImprovementPlan(repo, videoId);
}

export function updateFeedbackWhere(repo, videoId, predicate, patch) {
  const matches = readFeedback(repo, videoId).filter(predicate);
  for (const item of matches) {
    append(stateFile(repo, videoId, "feedback.jsonl"), {
      event: "updated",
      at: iso(),
      id: item.id,
      patch: typeof patch === "function" ? patch(item) : patch,
    });
  }
  if (matches.length) writeImprovementPlan(repo, videoId);
  return matches.length;
}

export function reconcileQaFeedback(repo, videoId, stage, findings, runId, qaProvider = "") {
  const before = readFeedback(repo, videoId).filter((item) =>
    QA_SOURCES.has(item.source) && item.stage === stage && OPEN_STATUSES.has(item.status));
  const seen = new Set();
  const recorded = findings.map((finding) => {
    const item = recordFeedback(repo, videoId, {
      stage,
      scope: sceneKey(finding.scene || ""),
      code: QA_CODE_SET.has(finding.code) ? finding.code : "other",
      source: "qa",
      qaProvider,
      severity: finding.severity || "major",
      message: finding.message,
      evidence: finding.evidence || finding.scene || "",
      acceptance: finding.acceptance || "QA không còn tái hiện lỗi ở lượt kế tiếp.",
      owner: "coding-agent",
      runId,
    });
    seen.add(item.fingerprint);
    return item;
  });
  for (const item of before) {
    if (seen.has(item.fingerprint)) continue;
    updateFeedback(repo, videoId, item.id, {
      status: "verified",
      resolvedBy: runId,
      evidence: `${item.evidence ? `${item.evidence} · ` : ""}Không tái hiện ở QA ${runId}`,
    });
  }
  return recorded;
}

export function blockingFeedback(repo, videoId, stage) {
  return readFeedback(repo, videoId).filter((item) =>
    item.stage === stage
    && BLOCKING_STATUSES.has(item.status)
    && ["blocker", "major"].includes(item.severity));
}

export function workflowReport(repo, videoId) {
  const runs = readRuns(repo, videoId);
  const feedback = readFeedback(repo, videoId);
  const completed = runs.filter((run) => run.status !== "running");
  const agents = completed.filter((run) => run.mode === "agent");
  const deterministic = completed.filter((run) => run.mode === "deterministic");
  const usage = completed.reduce((sum, run) => {
    sum.inputTokens += Number(run.inputTokens || 0);
    sum.cachedInputTokens += Number(run.cachedInputTokens || 0);
    sum.outputTokens += Number(run.outputTokens || 0);
    sum.costUsd += Number(run.costUsd || 0);
    sum.toolCalls += Number(run.toolCalls || 0);
    if (run.inputTokens != null || run.outputTokens != null || run.costUsd != null) sum.measuredRuns++;
    return sum;
  }, { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0, costUsd: 0, toolCalls: 0, measuredRuns: 0 });

  const byStage = {};
  for (const run of completed) {
    const row = byStage[run.stage] ||= { runs: 0, agentTokens: 0, durationMs: 0, failures: 0 };
    row.runs++;
    if (run.mode === "agent") row.agentTokens += Number(run.inputTokens || 0) + Number(run.outputTokens || 0);
    row.durationMs += Number(run.durationMs || 0);
    if (run.status !== "done") row.failures++;
  }
  const expensive = Object.entries(byStage).sort((a, b) => b[1].agentTokens - a[1].agentTokens)[0];

  // Which model and which machine produced this run — so quality (feedback recurrence, failure rate)
  // can be compared across members instead of averaged away. Deterministic runs have no model.
  const byModel = {};
  for (const run of agents) {
    const key = run.model || "(chưa rõ)";
    const row = byModel[key] ||= { runs: 0, tokens: 0, costUsd: 0, failures: 0 };
    row.runs++;
    row.tokens += Number(run.inputTokens || 0) + Number(run.outputTokens || 0);
    row.costUsd += Number(run.costUsd || 0);
    if (run.status !== "done") row.failures++;
  }
  const byMachine = {};
  for (const run of completed) {
    const key = run.machine || "(chưa rõ)";
    const row = byMachine[key] ||= { runs: 0, durationMs: 0, failures: 0 };
    row.runs++;
    row.durationMs += Number(run.durationMs || 0);
    if (run.status !== "done") row.failures++;
  }

  const activeFeedback = feedback.filter((item) => OPEN_STATUSES.has(item.status));
  return {
    runs: {
      total: runs.length,
      running: runs.filter((run) => run.status === "running").length,
      agent: agents.length,
      deterministic: deterministic.length,
      failures: completed.filter((run) => run.status !== "done").length,
    },
    automationRatio: completed.length ? deterministic.length / completed.length : 0,
    usage,
    byStage,
    byModel,
    byMachine,
    mostExpensiveStage: expensive?.[1].agentTokens ? expensive[0] : null,
    feedback: {
      open: activeFeedback.length,
      blocker: activeFeedback.filter((item) => item.severity === "blocker").length,
      major: activeFeedback.filter((item) => item.severity === "major").length,
      minor: activeFeedback.filter((item) => item.severity === "minor").length,
      items: activeFeedback,
    },
    files: {
      runs: path.relative(repo, stateFile(repo, videoId, "runs.jsonl")).split(path.sep).join("/"),
      feedback: path.relative(repo, stateFile(repo, videoId, "feedback.jsonl")).split(path.sep).join("/"),
      plan: path.relative(repo, stateFile(repo, videoId, "IMPROVEMENT-PLAN.md")).split(path.sep).join("/"),
    },
  };
}

export function writeImprovementPlan(repo, videoId) {
  const report = workflowReport(repo, videoId);
  const items = report.feedback.items;
  const lines = [
    `# Improvement plan — ${videoId}`,
    "",
    "> Sinh tự động từ `.studio/feedback.jsonl`. Không sửa tay; dùng `node tools/video-workflow.mjs feedback ...`.",
    "",
    "## Trạng thái",
    "",
    `- Feedback còn mở: ${report.feedback.open} (blocker ${report.feedback.blocker} · major ${report.feedback.major} · minor ${report.feedback.minor})`,
    `- Agent tokens đã đo: ${(report.usage.inputTokens + report.usage.outputTokens).toLocaleString("en-US")} · cost: $${report.usage.costUsd.toFixed(4)}`,
    `- Automation ratio theo lượt chạy: ${Math.round(report.automationRatio * 100)}%`,
    "",
    "## Việc phải xử lý",
    "",
  ];
  if (!items.length) lines.push("Không còn feedback mở.", "");
  for (const item of items) {
    lines.push(
      `### [${item.severity.toUpperCase()}] ${item.id} · ${[item.stage, item.scope, item.code].filter(Boolean).join(" · ")}`,
      "",
      `- Trạng thái: \`${item.status}\` · owner: \`${item.owner}\` · lặp lại: ${item.recurrence}`,
      `- Feedback: ${item.message}`,
      `- Điều kiện nghiệm thu: ${item.acceptance}`,
      ...(item.evidence ? [`- Bằng chứng: ${item.evidence}`] : []),
      "",
    );
  }
  const target = stateFile(repo, videoId, "IMPROVEMENT-PLAN.md");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, lines.join("\n"));
  fs.renameSync(temp, target);
  return target;
}

export const workflowInternals = { fingerprint, readJsonl, OPEN_STATUSES };
