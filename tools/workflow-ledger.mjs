import fs from "node:fs";
import path from "node:path";
import { createCipheriv, createHash, randomBytes, randomUUID } from "node:crypto";

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
const telemetryDir = (repo) => path.join(repo, ".studio", "telemetry");
const telemetryFile = (repo) => path.join(telemetryDir(repo), "outbox.jsonl");
const aiLogOutboxFile = (repo) => path.join(telemetryDir(repo), "ai-logs-outbox.jsonl");
const telemetryInstallationFile = (repo) => path.join(telemetryDir(repo), "installation.json");
const cleanText = (value) => String(value || "").replace(/\s+/g, " ").trim();
// `no_charge`: a step that costs nothing by construction (Kaggle free GPU quota, a local model, recorded audio).
const COST_SOURCES = new Set(["provider_reported", "gateway_reported", "server_price_estimate", "no_charge", "unavailable"]);

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

function installationId(repo) {
  const file = telemetryInstallationFile(repo);
  try {
    const saved = JSON.parse(fs.readFileSync(file, "utf8"));
    if (typeof saved.installationId === "string" && saved.installationId) return saved.installationId;
  } catch {}
  const value = randomUUID();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify({ installationId: value })}\n`);
  return value;
}

function finiteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function emitTelemetry(repo, videoId, eventType, runId, payload = {}) {
  const source = COST_SOURCES.has(payload.costSource) ? payload.costSource : "unavailable";
  const cost = source === "no_charge" ? 0 : finiteNonNegative(payload.costUsd);
  // `costUsd` from a legacy parser has no provenance. It stays in the local ledger for compatibility,
  // but is intentionally omitted from the canonical outbox until an adapter labels its source.
  append(telemetryFile(repo), {
    event_id: randomUUID(),
    schema_version: 1,
    occurred_at: iso(),
    event_type: eventType,
    installation_id: installationId(repo),
    project_ref: videoId,
    video_ref: videoId,
    run_id: runId,
    stage: payload.stage || null,
    actor_kind: payload.actor || null,
    provider: payload.provider || null,
    model: payload.model || null,
    outcome: payload.outcome || null,
    measurement: {
      duration_ms: finiteNonNegative(payload.durationMs),
      input_tokens: finiteNonNegative(payload.inputTokens),
      cached_input_tokens: finiteNonNegative(payload.cachedInputTokens),
      output_tokens: finiteNonNegative(payload.outputTokens),
      tool_calls: finiteNonNegative(payload.toolCalls),
      // Voice: characters sent to ElevenLabs, credits it actually charged, GPU time used on Kaggle.
      characters: finiteNonNegative(payload.characters),
      credits: finiteNonNegative(payload.credits),
      gpu_seconds: finiteNonNegative(payload.gpuSeconds),
      cost: { amount: source === "unavailable" ? null : cost, currency: "USD", source },
    },
    privacy: { payload_class: "metadata_only" },
    // Which attempt/version a run is and what triggered it; for a feedback event, its metadata (never its text).
    ...(payload.runContext ? { run_context: payload.runContext } : {}),
    ...(payload.feedback ? { feedback: payload.feedback } : {}),
  });
}

// A feedback item not tied to a run still needs a run_id for the collector's schema.
const NO_RUN = "00000000-0000-0000-0000-000000000000";

// Latest state of one feedback item as metadata: enough for QA to trace a finding to the run that produced it
// and the run that fixed it. The message itself stays in the local ledger.
function emitFeedbackState(repo, videoId, id) {
  const item = readFeedback(repo, videoId).find((fb) => fb.id === id);
  if (!item) return;
  emitTelemetry(repo, videoId, "feedback_state", item.runId || NO_RUN, {
    stage: item.stage,
    actor: item.source,
    feedback: {
      feedback_id: item.id,
      stage: item.stage,
      scope: item.scope || null,
      code: item.code || null,
      severity: item.severity,
      source: item.source,
      qa_provider: item.qaProvider || null,
      status: item.status,
      recurrence: item.recurrence || 1,
      found_by_run: item.runId || null,
      resolved_by_run: item.resolvedBy || null,
      created_at: item.createdAt,
    },
  });
}

export function readTelemetryOutbox(repo) {
  return readJsonl(telemetryFile(repo));
}

function aiLogKey() {
  const key = Buffer.from(process.env.STUDIO_TELEMETRY_AI_LOG_KEY || "", "base64");
  if (key.length !== 32) throw new Error("STUDIO_TELEMETRY_AI_LOG_KEY phải là base64 của đúng 32 bytes khi bật AI log.");
  return key;
}

function redactAiLog(text) {
  return String(text)
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/gi, "$1[REDACTED]")
    .replace(/\bsk-[A-Za-z0-9_-]{16,}\b/g, "[REDACTED_API_KEY]");
}

// Raw AI log is explicitly opt-in. The local outbox stores only AES-256-GCM ciphertext; it never
// enters runs.jsonl, normal telemetry outbox, reports, or Grafana's cost dashboard.
export function recordAiLog(repo, videoId, input) {
  if (process.env.STUDIO_TELEMETRY_AI_LOGS !== "1") return { recorded: false, reason: "disabled" };
  if (input.source !== "studio") throw new Error("AI log chỉ được Video Studio server ghi.");
  if (!input.runId || !input.kind || typeof input.text !== "string") throw new Error("AI log cần runId, kind và text.");
  const plain = Buffer.from(redactAiLog(input.text), "utf8");
  if (plain.length > 256 * 1024) throw new Error("AI log local vượt 256 KiB; hãy tách log thành nhiều phần.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aiLogKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const log = {
    log_id: randomUUID(),
    schema_version: 1,
    occurred_at: iso(),
    installation_id: installationId(repo),
    project_ref: videoId,
    video_ref: videoId,
    run_id: input.runId,
    kind: cleanText(input.kind),
    consent: { scope: "ai_log", explicit: true },
    encrypted: {
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      tag: cipher.getAuthTag().toString("base64"),
      ciphertext: ciphertext.toString("base64"),
    },
  };
  append(aiLogOutboxFile(repo), log);
  return { recorded: true, logId: log.log_id };
}

export function readAiLogOutbox(repo) {
  return readJsonl(aiLogOutboxFile(repo));
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
  "style", // vi phạm tiêu chí QA riêng của style video (styles/<id>.md)
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
  // Regeneration bookkeeping: the Nth run of this stage, and which delivered version it builds (v1 until the
  // first successful render, then v2…). `trigger` says why it ran; feedbackIds which items it answers.
  const prior = readRuns(repo, videoId);
  const attempt = prior.filter((item) => item.stage === input.stage).length + 1;
  // Delivery steps (deliver, deliver.gate) ship the version just rendered; everything else builds the next one.
  const rendered = prior.filter((item) => item.stage === "render" && item.status === "done").length;
  const version = /^deliver(\.|$)/.test(input.stage) ? Math.max(1, rendered) : rendered + 1;
  const feedbackIds = Array.isArray(input.feedbackIds) ? input.feedbackIds.filter(Boolean).map(String) : [];
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
    attempt,
    version,
    trigger: input.trigger || (attempt === 1 ? "initial" : "retry"),
    feedbackIds,
  };
  append(stateFile(repo, videoId, "runs.jsonl"), { event: "started", at: run.startedAt, run });
  emitTelemetry(repo, videoId, "run_started", run.runId, {
    ...run,
    runContext: { attempt, version, trigger: run.trigger, feedback_ids: feedbackIds },
  });
  writeImprovementPlan(repo, videoId);
  return run;
}

export function addRunMetrics(repo, videoId, runId, metrics = {}) {
  append(stateFile(repo, videoId, "runs.jsonl"), { event: "metrics", at: iso(), runId, metrics });
  // Metrics arrive without the run's stage/actor; without them every token lands in stage "(unknown)"
  // and tokens/cost per phase cannot be computed. The run the ledger already knows supplies them.
  const run = readRuns(repo, videoId).find((item) => item.runId === runId);
  emitTelemetry(repo, videoId, "usage_recorded", runId, {
    ...metrics,
    stage: metrics.stage || run?.stage,
    actor: metrics.actor || run?.actor,
    provider: metrics.provider || run?.provider,
    model: metrics.model || run?.model,
    runContext: {
      session_id: metrics.sessionId || null,
      prompt_sha256: metrics.promptSha256 || null,
      gateway_status: metrics.gatewayStatus || null,
    },
  });
  writeImprovementPlan(repo, videoId);
}

export function finishRun(repo, videoId, runId, result = {}) {
  const finishedAt = iso();
  append(stateFile(repo, videoId, "runs.jsonl"), {
    event: "finished",
    at: finishedAt,
    runId,
    status: result.status || "done",
    error: result.error || null,
    checks: result.checks || [],
    artifacts: result.artifacts || [],
  });
  const run = readRuns(repo, videoId).find((item) => item.runId === runId);
  emitTelemetry(repo, videoId, "run_finished", runId, {
    stage: run?.stage,
    actor: run?.actor,
    provider: run?.provider,
    model: run?.model,
    durationMs: run?.durationMs,
    outcome: { status: result.status || "done", error_code: result.error ? "run_error" : null },
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
    emitFeedbackState(repo, videoId, existing.id);
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
  emitFeedbackState(repo, videoId, feedback.id);
  return feedback;
}

export function updateFeedback(repo, videoId, id, patch) {
  const existing = readFeedback(repo, videoId).find((item) => item.id === id);
  if (!existing) throw new Error(`Không tìm thấy feedback ${id}`);
  append(stateFile(repo, videoId, "feedback.jsonl"), { event: "updated", at: iso(), id, patch });
  writeImprovementPlan(repo, videoId);
  emitFeedbackState(repo, videoId, id);
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
  for (const item of matches) emitFeedbackState(repo, videoId, item.id);
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
