import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentProvider } from "../types";
import { agentProviderLabel, isAgentProvider } from "../agent-providers";
import { antigravityQaArgs, claudeQaArgs, codexQaArgs, type QaProvider, sanitizedAgentEnv } from "./agent-cli";
import { log, machineLabel, run, setProgress, wasStopped } from "./jobs";
import { moduleQaCriteria } from "./modules";
import { exists, projectDir, REPO, rel, stateDir, videoDir, voiceOut } from "./paths";
import { cuesInfo, readState } from "./videos";
import {
  addRunMetrics,
  finishRun,
  QA_CODES,
  reconcileQaFeedback,
  startRun,
} from "./workflow";

const QA_SCHEMA = JSON.stringify({
  type: "object",
  additionalProperties: false,
  required: ["verdict", "summary", "findings"],
  properties: {
    verdict: { type: "string", enum: ["pass", "needs_changes"] },
    summary: { type: "string" },
    findings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "code", "scene", "message", "evidence", "acceptance"],
        properties: {
          severity: { type: "string", enum: ["blocker", "major", "minor"] },
          // Stable identity of the defect: the ledger fingerprints stage + scene + code, never the wording.
          code: { type: "string", enum: QA_CODES },
          scene: { type: "string" },
          message: { type: "string" },
          evidence: { type: "string" },
          acceptance: { type: "string" },
        },
      },
    },
  },
});

function candidatePayload(value: unknown): unknown[] {
  const found: unknown[] = [];
  const queue: unknown[] = [value];
  const seen = new Set<unknown>();
  while (queue.length && found.length < 16) {
    const item = queue.shift();
    if (!item || seen.has(item)) continue;
    seen.add(item);
    found.push(item);
    if (typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    for (const key of ["structured_output", "result", "response", "content", "output"]) {
      if (row[key] !== undefined) queue.push(row[key]);
    }
  }
  return found;
}

const SEVERITIES = new Set(["blocker", "major", "minor"]);
const CODES = new Set<string>(QA_CODES);

type QaFinding = { severity: "blocker" | "major" | "minor"; code: string; scene: string; message: string; evidence: string; acceptance: string };

function asFinding(value: unknown): QaFinding | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!SEVERITIES.has(String(row.severity))) return null;
  if (!CODES.has(String(row.code))) return null;
  for (const key of ["scene", "message", "evidence", "acceptance"]) {
    if (typeof row[key] !== "string") return null;
  }
  return row as unknown as QaFinding;
}

function parseJsonLoose(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) throw error;
    return JSON.parse(raw.slice(start, end + 1));
  }
}

export function parseQaReport(raw: string) {
  const outer = parseJsonLoose(raw);
  for (const candidate of candidatePayload(outer)) {
    let value = candidate;
    if (typeof value === "string") {
      try { value = parseJsonLoose(value); } catch { continue; }
    }
    if (value && typeof value === "object") {
      const report = value as { verdict?: string; summary?: string; findings?: unknown[] };
      if (["pass", "needs_changes"].includes(report.verdict || "") && Array.isArray(report.findings)) {
        const findings = report.findings.map(asFinding);
        const invalid = findings.some((item) => item === null);
        if (invalid) throw new Error("QA trả về finding thiếu trường, sai severity hoặc sai mã lỗi.");
        return {
          verdict: report.verdict as "pass" | "needs_changes",
          summary: report.summary || "",
          findings: findings as QaFinding[],
        };
      }
    }
  }
  throw new Error("QA không trả về report đúng schema.");
}

/**
 * Token/cost from whatever the QA CLI printed: Claude's single `result` object (`usage` + `total_cost_usd`),
 * Codex's `turn.completed` event line, or an agy `usage`/`stats` block. Unmeasured stays undefined, never 0.
 */
export function usageFrom(raw: string) {
  const out: { inputTokens?: number; cachedInputTokens?: number; outputTokens?: number; costUsd?: number; model?: string } = {};
  const num = (value: unknown) => (Number(value) || undefined);
  for (const line of [raw, ...raw.split(/\r?\n/)]) {
    let value: Record<string, unknown>;
    try { value = JSON.parse(line); } catch { continue; }
    if (!value || typeof value !== "object") continue;
    const usage = (value.usage || value.stats) as Record<string, unknown> | undefined;
    if (usage && typeof usage === "object") {
      out.inputTokens = num(usage.input_tokens ?? usage.inputTokens) ?? out.inputTokens;
      out.cachedInputTokens = num(usage.cached_input_tokens ?? usage.cache_read_input_tokens ?? usage.cachedInputTokens) ?? out.cachedInputTokens;
      out.outputTokens = num(usage.output_tokens ?? usage.outputTokens) ?? out.outputTokens;
      out.costUsd = num(usage.cost_usd ?? usage.costUsd) ?? out.costUsd;
    }
    out.costUsd = num(value.total_cost_usd) ?? out.costUsd;
    // Claude names the model it actually ran in `modelUsage`; better than a configured guess.
    const models = value.modelUsage && typeof value.modelUsage === "object" ? Object.keys(value.modelUsage) : [];
    if (models.length) out.model = models.join(" + ");
  }
  return out;
}

async function command(id: string, label: string, cmd: string, args: string[], opts: { env?: NodeJS.ProcessEnv } = {}) {
  log(id, "system", label);
  setProgress(id, null, label);
  const output: string[] = [];
  const code = await run(id, cmd, args, {
    env: opts.env,
    onLine(line, stream) {
      output.push(line);
      log(id, stream === "stderr" ? "error" : "output", line);
    },
  });
  return { ok: code === 0 && !wasStopped(id), code, output: output.join("\n") };
}

async function deterministicSceneGate(id: string, base: string) {
  const gate = startRun(REPO, id, { stage: "scenes.gate", actor: "system", mode: "deterministic", label: "build + verify + QA stills", machine: machineLabel() });
  const checks: string[] = [];
  try {
    const build = await command(id, "Build design system", "npm", ["run", "build"]);
    if (!build.ok) throw new Error("Build thất bại.");
    checks.push("build");

    const verify = await command(id, "Static verification", "npm", ["run", "verify"]);
    if (!verify.ok) throw new Error("Verify thất bại.");
    checks.push("verify");

    const cues = await cuesInfo(id);
    if (!cues?.cues.length) throw new Error("Không đọc được cues để tạo ảnh QA.");
    // The gate owns qa/auto/ and nothing else: stills a person shot by hand in qa/ are never touched, and
    // clearing the whole folder means a cue removed from the script leaves no orphan still in the packet.
    const qaDir = autoQaDir(id);
    fs.rmSync(qaDir, { recursive: true, force: true });
    fs.mkdirSync(qaDir, { recursive: true });
    const jobs = cues.cues.map((cue) => ({
      url: `${base}/ds/ui_kits/lesson-video/index.html?scene=${encodeURIComponent(id)}&frame=${Math.max(cue.start, cue.end - 15)}`,
      out: path.join(qaDir, `cue-${String(cue.n).padStart(2, "0")}.png`),
      width: 1920,
      height: 1080,
      settle: 120,
    }));
    const jobsFile = path.join(qaDir, "jobs.json");
    fs.writeFileSync(jobsFile, `${JSON.stringify(jobs, null, 2)}\n`);
    const shoot = await command(id, `Chụp ${jobs.length} ảnh QA`, process.execPath, ["tools/shoot.mjs", "--batch", rel(jobsFile)]);
    if (!shoot.ok) throw new Error("Chụp ảnh QA thất bại.");
    checks.push(`${jobs.length} stills`);
    finishRun(REPO, id, gate.runId, { status: "done", checks, artifacts: [rel(jobsFile), rel(qaDir)] });
    return { verify: verify.output, qaDir, jobs: jobs.length };
  } catch (error) {
    finishRun(REPO, id, gate.runId, { status: "error", error: error instanceof Error ? error.message : String(error), checks });
    throw error;
  }
}

export const autoQaDir = (id: string) => path.join(projectDir(id), "qa", "auto");

/**
 * The QA session sees only this folder, and it lives outside the repo on purpose: every CLI walks up
 * from its cwd for CLAUDE.md / AGENTS.md, and a packet under projects/ would hand the reviewer the whole
 * authoring context. Clean context is the point of a separate QA lane.
 */
function qaPacket(id: string, verifyOutput: string, qaDir: string) {
  const packet = fs.mkdtempSync(path.join(os.tmpdir(), `video-studio-qa-${id}-`));
  for (const source of [
    path.join(projectDir(id), "REQUEST.md"),
    path.join(stateDir(id), "IMPROVEMENT-PLAN.md"),
  ]) {
    if (fs.existsSync(/* turbopackIgnore: true */ source)) {
      fs.copyFileSync(/* turbopackIgnore: true */ source, path.join(packet, path.basename(source)));
    }
  }
  fs.writeFileSync(path.join(packet, "verify.txt"), verifyOutput);
  const images = path.join(packet, "stills");
  fs.mkdirSync(images, { recursive: true });
  const stills = fs.readdirSync(qaDir).filter((file) => /\.(png|jpe?g)$/i.test(file)).sort();
  for (const name of stills) fs.copyFileSync(path.join(qaDir, name), path.join(images, name));
  return { packet, stills: stills.map((name) => `stills/${name}`) };
}

const QA_ORDER: QaProvider[] = ["antigravity", "codex", "claude"];
const qaBin = (provider: QaProvider) => ({
  claude: process.env.CLAUDE_BIN || "claude",
  codex: process.env.CODEX_BIN || "codex",
  antigravity: process.env.ANTIGRAVITY_BIN || "agy",
})[provider];

/** Is this CLI installed? A path is checked as is; a bare name is looked up on PATH (with Windows shims). */
function installed(bin: string) {
  if (bin.includes("/") || bin.includes("\\")) return exists(bin);
  const exts = process.platform === "win32" ? ["", ".cmd", ".exe", ".bat"] : [""];
  return (process.env.PATH || "").split(path.delimiter).filter(Boolean)
    .some((dir) => exts.some((ext) => exists(path.join(dir, bin + ext))));
}

/**
 * Who grades the stills. `STUDIO_QA_PROVIDER` pins one; otherwise the first installed provider that is not
 * the one authoring this video, and only when none is installed does a provider review its own work — a
 * same-provider QA in a fresh read-only session still beats a scenes stage that can never pass.
 */
export function pickQaProvider(author: AgentProvider, env = process.env.STUDIO_QA_PROVIDER, isInstalled = (p: QaProvider) => installed(qaBin(p))): QaProvider {
  const pinned = env?.trim();
  if (pinned && pinned !== "auto") {
    if (!isAgentProvider(pinned)) throw new Error(`STUDIO_QA_PROVIDER="${pinned}" không hợp lệ (claude | codex | antigravity | auto).`);
    return pinned;
  }
  const others = QA_ORDER.filter((p) => p !== author && isInstalled(p));
  if (others.length) return others[0];
  if (isInstalled(author)) return author;
  throw new Error("Không tìm thấy CLI nào để QA ảnh (claude, codex hoặc agy).");
}

function qaPrompt(id: string, modules: string[]) {
  const extra = moduleQaCriteria(modules);
  return [
    `Bạn là QA lane độc lập cho video ${id}. Chỉ đọc nội dung trong thư mục hiện tại.`,
    "Mở REQUEST.md, IMPROVEMENT-PLAN.md nếu có, verify.txt và toàn bộ ảnh trong stills/.",
    "Tiêu chí chung cho từng ảnh: chữ đọc được; chữ/khối không tràn, không bị xén, không chồng nhau; bố cục không trống hay dồn một góc; chữ/số trên màn hình không nằm ngoài kịch bản; cả chuỗi ảnh có nhịp và không lặp máy móc.",
    ...(extra.length ? [
      "Video bật thêm các năng lực dưới đây — soi thêm đúng những tiêu chí này, không tự đặt tiêu chí khác (vi phạm ghi code `module`):",
      ...extra.map((m) => `### ${m.name}\n${m.criteria}`),
    ] : ["Video không bật năng lực chọn thêm nào; chỉ dùng tiêu chí chung."]),
    `Mỗi finding chọn đúng một \`code\` trong: ${QA_CODES.join(", ")}. Một lỗi ở lượt sau vẫn dùng đúng code và đúng ảnh đó — câu chữ \`message\` có thể khác, nhận dạng là code.`,
    "Mỗi finding phải nêu đúng file ảnh (scene, vd. cue-03.png), bằng chứng nhìn thấy và điều kiện nghiệm thu. Không sửa file. Không mở đường dẫn ngoài thư mục này.",
    "Chỉ trả JSON đúng schema.",
  ].join("\n");
}

async function visualQa(id: string, packet: { packet: string; stills: string[] }) {
  const { state } = readState(id);
  const provider = pickQaProvider(state.agent.provider);
  const label = agentProviderLabel(provider);
  const model = process.env.STUDIO_QA_MODEL?.trim() || undefined;
  const qaRun = startRun(REPO, id, { stage: "scenes.qa", actor: provider, mode: "agent", label: `visual QA · ${label}`, machine: machineLabel() });
  const prompt = qaPrompt(id, state.request.modules);
  const outDir = path.join(stateDir(id), "qa");
  fs.mkdirSync(outDir, { recursive: true });

  let args: string[];
  let lastMessage: string | null = null;
  if (provider === "claude") {
    args = claudeQaArgs(QA_SCHEMA, model);
  } else if (provider === "codex") {
    const schemaFile = path.join(packet.packet, "qa-schema.json");
    fs.writeFileSync(schemaFile, QA_SCHEMA);
    lastMessage = path.join(outDir, "codex-last-message.json");
    fs.rmSync(lastMessage, { force: true });
    args = codexQaArgs(schemaFile, lastMessage, packet.stills, model);
  } else {
    args = antigravityQaArgs(QA_SCHEMA, model);
  }

  const lines: string[] = [];
  let toolCalls = 0;
  setProgress(id, null, `${label} đang QA ảnh…`);
  log(id, "system", `Bắt đầu QA ảnh · ${label} · phiên riêng, chỉ đọc`);
  const code = await run(id, qaBin(provider), args, {
    cwd: packet.packet,
    env: sanitizedAgentEnv(),
    input: prompt,
    onLine(line, stream) {
      if (stream === "stderr") log(id, provider === "codex" ? "system" : "error", line.slice(0, 500));
      else lines.push(line);
      if (/tool/i.test(line)) toolCalls++;
    },
  });
  const raw = lines.join("\n").trim();
  const usage = usageFrom(raw);
  addRunMetrics(REPO, id, qaRun.runId, { ...usage, toolCalls, model: usage.model || model });
  try {
    if (code !== 0 || wasStopped(id)) {
      finishRun(REPO, id, qaRun.runId, { status: wasStopped(id) ? "stopped" : "error", error: `${label} exit ${code}` });
      throw new Error(`QA ảnh (${label}) thất bại (mã ${code}).`);
    }
    try {
      const report = parseQaReport(lastMessage && fs.existsSync(lastMessage) ? fs.readFileSync(lastMessage, "utf8") : raw);
      fs.writeFileSync(path.join(outDir, "latest.json"), `${JSON.stringify({ ...report, provider, runId: qaRun.runId, createdAt: new Date().toISOString() }, null, 2)}\n`);
      reconcileQaFeedback(REPO, id, "scenes", report.findings, qaRun.runId, provider);
      finishRun(REPO, id, qaRun.runId, { status: "done", artifacts: [rel(path.join(outDir, "latest.json"))] });
      log(id, report.findings.length ? "error" : "result", `QA ảnh (${label}): ${report.summary}`);
      return report;
    } catch (error) {
      finishRun(REPO, id, qaRun.runId, { status: "error", error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  } finally {
    fs.rmSync(packet.packet, { recursive: true, force: true });
  }
}

export async function runSceneQa(id: string, base: string) {
  const deterministic = await deterministicSceneGate(id, base);
  const packet = qaPacket(id, deterministic.verify, deterministic.qaDir);
  return visualQa(id, packet);
}

/**
 * Stage 1 has no build to run, but it has one free check the cues must pass before anyone approves them:
 * the TTS dry-run. It casts every `speaker` against voices.json, rejects an unknown `delivery`, and reports
 * characters with no avatar — without it a misspelt speaker slips through review and only breaks at the
 * voice step, after the script is locked. No key is passed, so it can never spend credit.
 */
export async function runCuesGate(id: string) {
  const gate = startRun(REPO, id, { stage: "cues.gate", actor: "system", mode: "deterministic", label: "TTS dry-run", machine: machineLabel() });
  try {
    const { state } = readState(id);
    const pronounce = path.join(projectDir(id), "pronounce.json");
    const env: NodeJS.ProcessEnv = { ...sanitizedAgentEnv(), ELEVENLABS_API_KEY: "" };
    if (/^[A-Za-z0-9]{8,40}$/.test(state.voice?.voiceId || "")) env.ELEVENLABS_VOICE_ID = state.voice.voiceId;
    const dry = await command(id, "Kiểm tra cues (TTS dry-run, miễn phí)", process.execPath, [
      "tts-elevenlabs/tts.mjs", "generate",
      "--cues", rel(path.join(videoDir(id), "cues.js")),
      "--out", rel(voiceOut(id)),
      ...(fs.existsSync(pronounce) ? ["--pronounce", rel(pronounce)] : []),
      "--dry-run",
    ], { env });
    if (!dry.ok) throw new Error(`Cues không qua TTS dry-run: ${dry.output.split("\n").filter((line) => line.startsWith("✗")).join(" · ") || `mã ${dry.code}`}`);
    finishRun(REPO, id, gate.runId, { status: "done", checks: ["tts dry-run"] });
  } catch (error) {
    finishRun(REPO, id, gate.runId, { status: "error", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function runFinalGate(id: string) {
  const gate = startRun(REPO, id, { stage: "deliver.gate", actor: "system", mode: "deterministic", label: "final build + verify", machine: machineLabel() });
  const checks: string[] = [];
  try {
    const build = await command(id, "Final build", "npm", ["run", "build"]);
    if (!build.ok) throw new Error("Final build thất bại.");
    checks.push("build");
    const verify = await command(id, "Final verification", "npm", ["run", "verify"]);
    if (!verify.ok) throw new Error("Final verify thất bại.");
    checks.push("verify");
    finishRun(REPO, id, gate.runId, { status: "done", checks });
    return true;
  } catch (error) {
    finishRun(REPO, id, gate.runId, { status: "error", error: error instanceof Error ? error.message : String(error), checks });
    throw error;
  }
}
