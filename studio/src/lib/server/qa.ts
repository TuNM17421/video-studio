import fs from "node:fs";
import path from "node:path";
import { antigravityQaArgs } from "./agent-cli";
import { log, machineLabel, run, setProgress, wasStopped } from "./jobs";
import { projectDir, REPO, rel, stateDir } from "./paths";
import { cuesInfo } from "./videos";
import {
  addRunMetrics,
  finishRun,
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
        required: ["severity", "scene", "message", "evidence", "acceptance"],
        properties: {
          severity: { type: "string", enum: ["blocker", "major", "minor"] },
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
    for (const key of ["result", "response", "content", "output"]) {
      if (row[key] !== undefined) queue.push(row[key]);
    }
  }
  return found;
}

const SEVERITIES = new Set(["blocker", "major", "minor"]);

type QaFinding = { severity: "blocker" | "major" | "minor"; scene: string; message: string; evidence: string; acceptance: string };

function asFinding(value: unknown): QaFinding | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!SEVERITIES.has(String(row.severity))) return null;
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

export function parseAntigravityQa(raw: string) {
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
        if (invalid) throw new Error("Antigravity trả về finding thiếu trường hoặc sai severity.");
        return {
          verdict: report.verdict as "pass" | "needs_changes",
          summary: report.summary || "",
          findings: findings as QaFinding[],
        };
      }
    }
  }
  throw new Error("Antigravity không trả về report đúng schema.");
}

function usageFrom(raw: string) {
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    const usage = (value.usage || value.stats || {}) as Record<string, unknown>;
    return {
      inputTokens: Number(usage.input_tokens || usage.inputTokens || 0) || undefined,
      cachedInputTokens: Number(usage.cached_input_tokens || usage.cachedInputTokens || 0) || undefined,
      outputTokens: Number(usage.output_tokens || usage.outputTokens || 0) || undefined,
      costUsd: Number(usage.cost_usd || usage.costUsd || 0) || undefined,
    };
  } catch {
    return {};
  }
}

async function command(id: string, label: string, cmd: string, args: string[]) {
  log(id, "system", label);
  setProgress(id, null, label);
  const output: string[] = [];
  const code = await run(id, cmd, args, {
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
    const qaDir = path.join(projectDir(id), "qa");
    fs.mkdirSync(qaDir, { recursive: true });
    for (const name of fs.readdirSync(qaDir)) if (/\.(png|jpe?g)$/i.test(name)) fs.rmSync(path.join(qaDir, name));
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

function qaPacket(id: string, verifyOutput: string, qaDir: string) {
  const packet = path.join(stateDir(id), "qa-packet");
  fs.rmSync(packet, { recursive: true, force: true });
  fs.mkdirSync(packet, { recursive: true });
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
  for (const name of fs.readdirSync(qaDir).filter((file) => /\.(png|jpe?g)$/i.test(file))) {
    fs.copyFileSync(path.join(qaDir, name), path.join(images, name));
  }
  return packet;
}

async function antigravityQa(id: string, packet: string) {
  const qaRun = startRun(REPO, id, { stage: "scenes.qa", actor: "antigravity", mode: "agent", label: "visual QA", machine: machineLabel() });
  const prompt = [
    `Bạn là QA lane độc lập cho video ${id}. Chỉ đọc nội dung trong thư mục hiện tại.`,
    "Mở REQUEST.md, IMPROVEMENT-PLAN.md nếu có, verify.txt và toàn bộ ảnh trong stills/.",
    "Đánh giá từng ảnh: nội dung có đọc được; chữ/khối không tràn hoặc chồng; bố cục không trống; mascot đứng thẳng trừ khi hành động cố ý nghiêng; mắt, lông mày, miệng và action đa dạng; sách, bảng, gậy chỉ và element tương tác đủ lớn; chuỗi hình có nhịp và không lặp máy móc.",
    "Mỗi finding phải nêu đúng file ảnh, bằng chứng nhìn thấy và điều kiện nghiệm thu. Không sửa file. Không mở đường dẫn ngoài packet.",
    "Chỉ trả JSON đúng schema.",
  ].join("\n");
  const lines: string[] = [];
  let toolCalls = 0;
  setProgress(id, null, "Antigravity đang QA ảnh…");
  log(id, "system", "Bắt đầu Antigravity QA · read-only plan sandbox");
  const code = await run(id, process.env.ANTIGRAVITY_BIN || "agy", antigravityQaArgs(QA_SCHEMA), {
    cwd: packet,
    input: prompt,
    onLine(line, stream) {
      if (stream === "stderr") log(id, "error", line.slice(0, 500));
      else lines.push(line);
      if (/tool/i.test(line)) toolCalls++;
    },
  });
  const raw = lines.join("\n").trim();
  addRunMetrics(REPO, id, qaRun.runId, { ...usageFrom(raw), toolCalls });
  if (code !== 0 || wasStopped(id)) {
    finishRun(REPO, id, qaRun.runId, { status: wasStopped(id) ? "stopped" : "error", error: `Antigravity exit ${code}` });
    throw new Error(`Antigravity QA thất bại (mã ${code}).`);
  }
  try {
    const report = parseAntigravityQa(raw);
    const outDir = path.join(stateDir(id), "qa");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, "latest.json"), `${JSON.stringify({ ...report, runId: qaRun.runId, createdAt: new Date().toISOString() }, null, 2)}\n`);
    reconcileQaFeedback(REPO, id, "scenes", report.findings, qaRun.runId);
    finishRun(REPO, id, qaRun.runId, { status: "done", artifacts: [rel(path.join(outDir, "latest.json"))] });
    log(id, report.findings.length ? "error" : "result", `Antigravity QA: ${report.summary}`);
    return report;
  } catch (error) {
    finishRun(REPO, id, qaRun.runId, { status: "error", error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

export async function runSceneQa(id: string, base: string) {
  const deterministic = await deterministicSceneGate(id, base);
  const packet = qaPacket(id, deterministic.verify, deterministic.qaDir);
  return antigravityQa(id, packet);
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
