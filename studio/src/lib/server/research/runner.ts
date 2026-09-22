import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Claim, ClaimKind, Difficulty, Gate2Decision, Priority, ResearchStage, ResearchState, ScriptCheck, ScriptIssue } from "../../research";
import { batches, difficultyOf, gate2Waiting, RUN_RESULT_LABEL } from "../../research";
import type { AgentProvider } from "../../types";
import type { ResearchCall } from "../agent-cli";
import { short } from "../agent-stream";
import { finishJob, isRunning, registry, startJob, stopJob, wasStopped } from "../jobs";
import { HttpError, REPO } from "../paths";
import { resolveAgentBin, runStepAgent, type StepOutcome, type StepSpec } from "./agent";
import { applyEditPrompt, editPrompt, extractPrompt, fixPrompt, researchPrompt, revisePrompt, writePrompt, type WriteContext } from "./prompts";
import {
  assertEditable, clearFromExtract, clearScript, dropClaimResults, jobKey, readClaims, readEdit, readEvidence, readFinding, readOutline, readScript, readScriptCheck, readSources,
  readState, researchLog, runDir, runRel, updateState, writeJson,
} from "./store";

const MIN = 60_000;

/**
 * Bộ điều phối của một lượt research: đọc `state.json`, làm chặng kế tiếp, ghi lại, lặp tới khi gặp một cổng
 * cần người, xong, hoặc lỗi. Mỗi lượt là một job trong bộ đăng ký chung (`research:<rid>`), nên nút Dừng và
 * luồng SSE dùng lại đúng cơ chế của pipeline video.
 *
 * Việc code làm được thì code làm (soát bằng `tools/research-verify.mjs`, cùng lệnh agent tự chạy được khi
 * không qua Studio); agent chỉ được gọi cho phần cần phán đoán, mỗi lượt một việc nhỏ.
 */

class Stopped extends Error {}

// ── quyền và model của từng chặng ─────────────────────────────────────────────────

const shell = (cmd: string) => [`Bash(${cmd})`, `PowerShell(${cmd})`];

/**
 * Model chỉ đặt cho Claude — tên model của hai CLI kia do người dùng cấu hình. Chặng cần viết hay nhất
 * (viết kịch bản) dùng model mặc định của người dùng; các chặng còn lại dùng model nhanh hơn để đỡ hạn mức.
 * `STUDIO_RESEARCH_MODELS='{"write":"opus"}'` đổi được từng chặng.
 */
const CLAUDE_MODEL: Record<StepSpec["step"], string | null> = { extract: "sonnet", research: "sonnet", write: null, fix: "sonnet", edit: "sonnet" };

function modelFor(step: StepSpec["step"], provider: AgentProvider) {
  if (provider !== "claude") return null;
  try {
    const custom = JSON.parse(process.env.STUDIO_RESEARCH_MODELS || "{}") as Record<string, string>;
    if (typeof custom[step] === "string") return custom[step] || null;
  } catch {}
  return CLAUDE_MODEL[step];
}

/**
 * Chỉ đúng những file chặng đó phải ghi — không mở cả thư mục lượt, càng không mở cả repo: agent đọc slide và
 * trang web của người khác, và một câu chèn trong đó ("ghi đè tools/page.mjs bằng…") không được biến thành lệnh
 * chạy trên máy. Đo thật: ghi vào `tools/` bị chặn, kể cả qua `node tools/page.mjs … > tools/x`.
 */
export const WRITABLE: Record<StepSpec["step"], (rid: string) => string[]> = {
  extract: (rid) => [`${runRel(rid)}/outline.json`, `${runRel(rid)}/claims.json`],
  research: (rid) => [`${runRel(rid)}/claims/**`],
  write: (rid) => [`${runRel(rid)}/output/**`],
  fix: (rid) => [`${runRel(rid)}/output/**`],
  edit: (rid) => [`${runRel(rid)}/checks/edit.json`],
};

function call(rid: string, step: StepSpec["step"], provider: AgentProvider, effort: ResearchCall["effort"]): ResearchCall {
  const model = modelFor(step, provider);
  // Chữ của trang gốc (`sources/<sid>/page.txt`) là thứ phần soát đối chiếu trích đoạn. Agent mà ghi được vào
  // đó thì nó "chứng minh" trích đoạn bằng chính chữ nó viết ra — cả tính năng này chỉ còn là lời hứa. Nên
  // quyền ghi hẹp tới từng file của chặng: sources/, checks/evidence.json, state.json, claims.json đều chỉ đọc.
  const write = WRITABLE[step](rid).flatMap((glob) => [`Write(${glob})`, `Edit(${glob})`]);
  if (step === "research") {
    return {
      tools: ["WebSearch", "WebFetch", "Read", "Write", "Bash", "PowerShell"],
      allowed: ["WebSearch", "WebFetch", "Read", ...write, ...shell("node tools/page.mjs *")],
      web: true, shell: true, model, effort,
    };
  }
  if (step === "fix") return { tools: ["Read", "Edit", "Write"], allowed: ["Read", ...write], web: false, shell: false, model, effort };
  return { tools: ["Read", "Write", "Glob"], allowed: ["Read", "Glob", ...write], web: false, shell: false, model, effort };
}

/** Trần an toàn theo khối lượng — không phải thời gian dự kiến. */
const PER_CLAIM_MS: Record<Difficulty, number> = { easy: 2 * MIN, normal: 4 * MIN, hard: 6 * MIN };

// ── soát bằng code ────────────────────────────────────────────────────────────────

interface VerifyResult<T> {
  ok: boolean;
  report: T | null;
}

/**
 * Chạy một công cụ soát như tiến trình con **của job**: nút Dừng giết được nó (soát bằng chứng có thể tải hàng
 * chục trang), và có trần thời gian — một trang dựng cố ý không được treo cả lượt.
 */
function runTool(rid: string, args: string[], timeoutMs: number) {
  return new Promise<string>((resolve) => {
    const child = execFile(process.execPath, args, { cwd: REPO, maxBuffer: 16 * 1024 * 1024, timeout: timeoutMs, killSignal: "SIGKILL" }, (_error, stdout) => {
      const job = registry.jobs.get(jobKey(rid));
      if (job?.child === child) job.child = undefined;
      // Mã thoát 1 nghĩa là "chưa đạt", không phải "chạy hỏng" — báo cáo vẫn nằm ở stdout.
      resolve(String(stdout ?? ""));
    });
    const job = registry.jobs.get(jobKey(rid));
    if (job) job.child = child;
  });
}

async function verify<T>(rid: string, args: string[], timeoutMs = 2 * MIN): Promise<VerifyResult<T>> {
  const stdout = await runTool(rid, ["tools/research-verify.mjs", runRel(rid), ...args, "--json"], timeoutMs);
  try {
    const report = JSON.parse(stdout.trim().split("\n").at(-1) ?? "") as T & { ok?: boolean };
    return { ok: Boolean(report.ok), report };
  } catch {
    return { ok: false, report: null };
  }
}

/**
 * Soát bằng chứng cho vài claim. Soát không chạy xong (quá giờ, bị dừng, công cụ lỗi) thì dừng lượt: đi tiếp
 * với kết quả cũ là để cổng 2 quyết định trên dữ liệu sai.
 */
async function verifyEvidence(rid: string, claims: string[], noFetch: boolean) {
  const v = await verify(rid, ["--stage", "evidence", "--claims", claims.join(","), ...(noFetch ? ["--no-fetch"] : [])], noFetch ? 2 * MIN : 10 * MIN);
  if (v.report) return;
  if (wasStopped(jobKey(rid))) throw new Stopped();
  throw new Error(`Soát bằng chứng cho ${claims.join(", ")} không chạy xong (quá giờ hoặc lỗi công cụ). Bấm Chạy tiếp để soát lại.`);
}

// ── các chặng ─────────────────────────────────────────────────────────────────────

/**
 * Một lượt agent không xong thì dừng lượt research và nói rõ vì sao — không được đi tiếp như thể nó đã làm:
 * góp ý ở cổng 3 sẽ "được sửa" mà kịch bản không đổi, và lỗi đăng nhập/hết hạn mức sẽ hiện thành "trượt soát".
 */
function check(outcome: StepOutcome, what: string) {
  if (outcome.result === "stopped") throw new Stopped();
  if (outcome.result !== "ok") {
    throw new Error(`Agent ${RUN_RESULT_LABEL[outcome.result]} ở bước ${what}${outcome.text ? `: ${short(outcome.text, 240)}` : ""}. Xem nhật ký rồi bấm Chạy tiếp để thử lại.`);
  }
}

async function doExtract(state: ResearchState) {
  const rid = state.id;
  const slides = state.deck.slides ?? 30;
  let problems: string[] = [];
  for (let attempt = 1; attempt <= 2; attempt++) {
    check(await runStepAgent(rid, state.agent, {
      step: "extract", call: call(rid, "extract", state.agent, "medium"), idleMs: 4 * MIN, capMs: 3 * MIN + slides * 40_000,
    }, extractPrompt(state, problems)), "bóc tách");
    const v = await verify<{ problems: string[]; warnings: string[]; claims: number }>(rid, ["--stage", "extract"]);
    if (v.ok) {
      researchLog(rid, "result", `Bóc tách đạt soát: ${v.report?.claims ?? 0} claim${v.report?.warnings?.length ? ` · ${v.report.warnings.length} cảnh báo` : ""}.`);
      return true;
    }
    problems = v.report?.problems ?? ["không đọc được kết quả soát — outline.json/claims.json có thể chưa được ghi"];
    researchLog(rid, "error", `Bóc tách chưa đạt soát (lần ${attempt}): ${problems.slice(0, 5).join("; ")}`);
  }
  throw new Error(`Bóc tách chưa đạt soát sau hai lần: ${problems.slice(0, 3).join("; ")}`);
}

// Lô claim theo độ khó nằm ở lib/research.ts (cổng 1 cần nó để báo trước số lượt agent); xuất lại cho test cũ.
export { batches };

const MAX_ATTEMPTS = 2;

async function doResearch(rid: string) {
  // Claim người dùng bấm "Research lại" không được lấy từ thư viện cho tới khi agent đã thật sự làm lại nó —
  // kể cả khi lượt bị dừng hay lỗi giữa chừng rồi "Chạy tiếp".
  const skip = readState(rid).noReuse ?? [];
  const reused = await verify<{ reused: { claim: string; from: string }[] }>(rid, ["--reuse", ...(skip.length ? ["--skip", skip.join(",")] : [])]);
  if (reused.report?.reused?.length) {
    researchLog(rid, "result", `Dùng lại ${reused.report.reused.length} dữ kiện đã kiểm: ${reused.report.reused.map((r) => `${r.claim} ← ${r.from}`).join(", ")}`);
    await verifyEvidence(rid, reused.report.reused.map((r) => r.claim), true);
  }
  for (;;) {
    const state = readState(rid);
    const evidence = readEvidence(rid);
    const pending = readClaims(rid).filter((c) => !evidence[c.id]?.ok && (state.attempts[c.id] ?? 0) < MAX_ATTEMPTS);
    if (!pending.length) break;
    const plan = batches(pending);
    // Không bao giờ để vòng lặp quay mà không có việc: nó không có await nào và sẽ khoá cả máy chủ.
    if (!plan.length) throw new Error(`Không chia được lô cho ${pending.map((c) => c.id).join(", ")}.`);
    for (const batch of plan) {
      if (wasStopped(jobKey(rid))) throw new Stopped();
      const ev = readEvidence(rid);
      const retry: string[] = [];
      for (const c of batch) {
        const file = path.join(runDir(rid), "claims", c.id, "feedback.json");
        const prev = ev[c.id];
        if (prev && !prev.ok && !prev.missing) {
          // Kèm bảng nguồn và các trang đã tải: không có nó thì lượt sửa đi tìm web lại từ đầu thay vì sửa
          // đúng chỗ bộ soát đã chỉ ra — đo được 125 giây và 48k token cho một claim duy nhất.
          writeJson(file, {
            attempt: (state.attempts[c.id] ?? 0) + 1,
            problems: prev.problems,
            warnings: prev.warnings,
            sources: prev.sources ?? [],
            daTai: readSources(rid).map((s) => ({ id: s.id, url: s.url, publisher: s.publisher ?? null, published: s.published ?? null, ok: s.ok, error: s.error ?? null })),
          });
          retry.push(c.id);
        } else fs.rmSync(file, { force: true });
      }
      const effort = batch.every((c) => difficultyOf(c) === "easy") ? "low" : "medium";
      const capMs = 2 * MIN + batch.reduce((sum, c) => sum + PER_CLAIM_MS[difficultyOf(c)], 0);
      const outcome = await runStepAgent(rid, state.agent, {
        step: "research", claims: batch.map((c) => c.id), call: call(rid, "research", state.agent, effort), idleMs: 4 * MIN, capMs,
      }, researchPrompt(rid, batch, retry));
      // Kẹt hoặc vượt trần thì vẫn tính một lượt — agent có thể đã ghi được vài finding, phần soát sẽ phân xử.
      // Lỗi hẳn (chưa đăng nhập, hết hạn mức, không chạy được CLI) thì dừng: research chưa hề diễn ra.
      if (outcome.result !== "stalled" && outcome.result !== "cap") check(outcome, `research ${batch.map((c) => c.id).join(", ")}`);
      updateState(rid, (s) => {
        for (const c of batch) s.attempts[c.id] = (s.attempts[c.id] ?? 0) + 1;
        const left = (s.noReuse ?? []).filter((id) => !batch.some((c) => c.id === id));
        if (left.length) s.noReuse = left;
        else delete s.noReuse;
      });
      await verifyEvidence(rid, batch.map((c) => c.id), false);
    }
  }
  const evidence = readEvidence(rid);
  const decisions = readState(rid).gates.gate2?.decisions;
  const failing = gate2Waiting(readClaims(rid), evidence, decisions);
  if (!failing.length) {
    const decided = decisions;
    updateState(rid, (s) => {
      // Qua được sau khi người duyệt đã quyết định ở cổng 2 thì giữ lại quyết định đó, đừng ghi thành "tự qua".
      s.gates.gate2 = decided ? { ...s.gates.gate2!, at: new Date().toISOString() } : { at: new Date().toISOString(), auto: true };
      s.stage = "write";
    });
    researchLog(rid, "result", decided ? "Cổng 2: mọi claim còn lại đạt soát sau quyết định của bạn." : "Cổng 2 tự qua: mọi claim đạt soát bằng chứng.");
    return true;
  }
  updateState(rid, (s) => {
    s.stage = "gate2";
    s.status = "waiting";
  });
  researchLog(rid, "system", `Cổng 2: chờ bạn quyết định — ${failing.map((f) => `${f.claim.id} (${f.why})`).join(", ")}.`);
  return false;
}

const problemsOf = (report: ScriptCheck | null): ScriptIssue[] => report?.issues?.filter((i) => i.level === "problem") ?? [];

/** Soát kịch bản; còn problem thì cho agent sửa đúng các dòng đó, tối đa hai vòng. */
async function lintAndFix(state: ResearchState) {
  const rid = state.id;
  let v = await verify<ScriptCheck>(rid, ["--stage", "script"]);
  // Không có kịch bản thì công cụ trả `{ ok: false, error }` — một báo cáo, nhưng không có `issues`.
  if (!v.report || !Array.isArray(v.report.issues)) throw new Error("Chưa có kịch bản (output/kich-ban.md) — agent không ghi được file.");
  for (let round = 1; round <= 2 && !v.ok; round++) {
    const issues = problemsOf(v.report);
    researchLog(rid, "system", `Soát kịch bản: ${issues.length} lỗi định dạng — gửi agent sửa (vòng ${round}).`);
    check(await runStepAgent(rid, state.agent, {
      step: "fix", call: call(rid, "fix", state.agent, "low"), idleMs: 4 * MIN, capMs: 5 * MIN + issues.length * 30_000,
    }, fixPrompt(rid, issues)), "sửa kịch bản");
    v = await verify<ScriptCheck>(rid, ["--stage", "script"]);
  }
  const r = v.report && Array.isArray(v.report.issues) ? v.report : null;
  researchLog(rid, v.ok ? "result" : "error", r
    ? `Soát kịch bản: ${r.stats.cues} câu · ~${Math.round(r.stats.seconds / 6) / 10} phút · phủ ${r.coverage.covered}/${r.coverage.slides} slide · ${problemsOf(r).length} lỗi, ${r.issues.length - problemsOf(r).length} cảnh báo.`
    : "Không đọc được kết quả soát kịch bản.");
}

const markLintPending = (rid: string) => updateState(rid, (s) => { s.lintPending = true; });

/**
 * Ngữ cảnh cho chặng viết và chặng biên tập — đọc một lần ở đây rồi nội tuyến vào prompt, thay vì để agent
 * tốn 7–11 lượt `Read` cho đúng những file này.
 */
function writeContext(rid: string): WriteContext {
  const evidence = readEvidence(rid);
  return {
    outline: readOutline(rid),
    claims: readClaims(rid).map((claim) => ({ claim, check: evidence[claim.id], finding: readFinding(rid, claim.id) })),
    dropped: readState(rid).gates.gate2?.dropped ?? [],
  };
}

async function doWrite(state: ResearchState) {
  // Điều kiện là **hiện vật trên đĩa**, không phải cờ: `markLintPending` chỉ chạy sau khi agent viết trả về, nên
  // một lượt bị Dừng / watchdog giết / Studio khởi động lại để lại kịch bản đầy đủ mà không có cờ — "Chạy tiếp"
  // sẽ viết lại từ đầu và ghi đè (đo được: 55 giây, 32,9k cache-write cho 10 câu). Kịch bản viết dở thì
  // `lintAndFix` sửa bằng một lượt rẻ; "Viết lại từ đầu" vẫn sạch vì `rerun('write')` gọi `clearScript()` trước.
  if (!state.lintPending && !readScript(state.id)) {
    check(await runStepAgent(state.id, state.agent, {
      step: "write", call: call(state.id, "write", state.agent, "medium"), idleMs: 6 * MIN, capMs: 5 * MIN + state.options.cues * 25_000,
    }, writePrompt(state, writeContext(state.id))), "viết kịch bản");
    markLintPending(state.id);
  }
  await lintAndFix(state);
  updateState(state.id, (s) => { s.stage = "review"; delete s.lintPending; });
}

async function doReview(state: ResearchState) {
  const rid = state.id;
  if (state.lintPending) {
    // Biên tập và lượt sửa theo biên tập đã xong ở lần trước; chỉ còn soát lại.
    await lintAndFix(state);
    return toGate3(rid);
  }
  fs.rmSync(path.join(runDir(rid), "checks", "edit.json"), { force: true });
  check(await runStepAgent(rid, state.agent, {
    step: "edit", call: call(rid, "edit", state.agent, "medium"), idleMs: 4 * MIN, capMs: 3 * MIN + state.options.cues * 10_000,
  }, editPrompt(rid, writeContext(rid))), "biên tập");
  const edit = readEdit(rid);
  if (!edit) researchLog(rid, "error", "Biên tập không ghi được checks/edit.json — chỉ sửa theo cảnh báo của code.");
  const warnings = readScriptCheck(rid)?.issues.filter((i) => i.level === "warning") ?? [];
  const items = (edit?.issues.length ?? 0) + warnings.length;
  if (items) {
    researchLog(rid, "system", `Biên tập: ${edit?.issues.length ?? 0} góp ý · soát tự động: ${warnings.length} cảnh báo — gửi agent sửa một lượt.`);
    check(await runStepAgent(rid, state.agent, {
      step: "fix", call: call(rid, "fix", state.agent, "medium"), idleMs: 4 * MIN, capMs: 5 * MIN + items * 40_000,
    }, applyEditPrompt(rid, edit, warnings)), "sửa theo biên tập");
    markLintPending(rid);
    await lintAndFix(state);
  } else researchLog(rid, "result", "Biên tập: không có góp ý nào, soát tự động không có cảnh báo.");
  toGate3(rid);
}

async function doRevise(state: ResearchState) {
  const feedback = state.feedback?.at(-1)?.text;
  if (!feedback) return toGate3(state.id);
  if (!state.lintPending) {
    check(await runStepAgent(state.id, state.agent, {
      step: "fix", call: call(state.id, "fix", state.agent, "medium"), idleMs: 4 * MIN, capMs: 10 * MIN,
    }, revisePrompt(state.id, feedback, readEdit(state.id))), "sửa theo góp ý");
    markLintPending(state.id);
  }
  await lintAndFix(state);
  toGate3(state.id);
}

function toGate3(rid: string) {
  updateState(rid, (s) => {
    s.stage = "gate3";
    s.status = "waiting";
    delete s.lintPending;
  });
  researchLog(rid, "system", "Cổng 3: kịch bản sẵn sàng — chờ bạn duyệt hoặc góp ý.");
}

// ── vòng điều phối ────────────────────────────────────────────────────────────────

async function advance(rid: string) {
  const key = jobKey(rid);
  try {
    for (;;) {
      if (wasStopped(key)) throw new Stopped();
      const state = readState(rid);
      if (state.stage === "extract") {
        await doExtract(state);
        updateState(rid, (s) => { s.stage = "gate1"; s.status = "waiting"; });
        researchLog(rid, "system", "Cổng 1: danh sách claim sẵn sàng — chờ bạn duyệt.");
        break;
      }
      if (state.stage === "research") {
        if (!(await doResearch(rid))) break;
        continue;
      }
      if (state.stage === "write") { await doWrite(state); continue; }
      if (state.stage === "review") { await doReview(state); break; }
      if (state.stage === "revise") { await doRevise(state); break; }
      break;
    }
    // Vòng lặp dừng ở một cổng hay ở cuối: trạng thái "đang chạy" phải được gỡ, kể cả khi chặng vừa rồi
    // không tự đặt trạng thái chờ.
    updateState(rid, (s) => {
      if (s.status === "running") s.status = s.stage === "done" ? "done" : s.stage.startsWith("gate") ? "waiting" : "idle";
    });
    finishJob(key, "done");
  } catch (error) {
    const stopped = error instanceof Stopped || wasStopped(key);
    const message = stopped ? "Đã dừng." : error instanceof Error ? error.message : String(error);
    try {
      updateState(rid, (s) => { s.status = "failed"; s.error = message; });
      researchLog(rid, stopped ? "system" : "error", message);
    } finally {
      finishJob(key, stopped ? "stopped" : "error");
    }
  }
}

/** Chạy tiếp từ chặng hiện tại, trong nền. Trả về ngay. */
export function startAdvance(rid: string) {
  const key = jobKey(rid);
  if (isRunning(key)) throw new HttpError(409, "Lượt này đang chạy. Chờ xong hoặc bấm Dừng.");
  startJob(key, "research");
  updateState(rid, (s) => { s.status = "running"; s.error = null; });
  void advance(rid);
}

// ── tạo lượt, cổng, chạy lại ──────────────────────────────────────────────────────

/** Chặng 0: lưu slide tải lên rồi gọi `tools/research-slide.mjs` — cùng lệnh agent dùng khi không qua Studio. */
export async function createRun(upload: { name: string; bytes: Uint8Array }, opts: { title: string; agent: AgentProvider; cues: number }) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "research-upload-"));
  const file = path.join(tmp, `slide${path.extname(upload.name).toLowerCase()}`);
  fs.writeFileSync(file, upload.bytes);
  try {
    // Không qua job (lượt chưa tồn tại) nhưng vẫn có trần: một PPTX dựng cố ý không được treo yêu cầu tải lên.
    const stdout = await new Promise<string>((resolve) => {
      execFile(process.execPath, [
        "tools/research-slide.mjs", file, "--name", upload.name, "--title", opts.title, "--agent", opts.agent, "--cues", String(opts.cues), "--json",
      ], { cwd: REPO, timeout: 2 * MIN, killSignal: "SIGKILL" }, (_error, out) => resolve(String(out ?? "")));
    });
    let out: { ok?: boolean; id?: string; error?: string } = {};
    try { out = JSON.parse(stdout.trim() || "{}"); } catch {}
    if (!out.ok || !out.id) throw new HttpError(400, out.error || "Không nạp được slide (file hỏng hoặc đọc quá lâu).");
    researchLog(out.id, "system", `Nạp slide ${upload.name} · ${opts.agent}`);
    startAdvance(out.id);
    return out.id;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

const KINDS: ClaimKind[] = ["number", "date", "product", "technical", "quote", "example"];
const DIFFS: Difficulty[] = ["easy", "normal", "hard"];
const PRIOS: Priority[] = ["high", "normal", "low"];
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Danh sách claim người duyệt gửi về: giữ mã cũ, cấp mã mới cho claim thêm tay, điền mặc định, bỏ dòng trống. */
export function cleanClaims(raw: unknown, slideCount: number | null): Claim[] {
  const list = Array.isArray(raw) ? raw : [];
  const used = new Set<string>();
  const out: Claim[] = [];
  let next = 1 + Math.max(0, ...list.map((c) => Number(/^c(\d{1,3})$/.exec(String((c as Claim)?.id))?.[1] ?? 0)));
  for (const item of list.slice(0, 25)) {
    const c = (item ?? {}) as Partial<Claim>;
    const claimText = text(c.text, 600);
    const question = text(c.question, 400) || claimText;
    if (!claimText) continue;
    let id = /^c\d{1,3}$/.test(String(c.id)) && !used.has(String(c.id)) ? String(c.id) : `c${next++}`;
    while (used.has(id)) id = `c${next++}`;
    used.add(id);
    const slides = (Array.isArray(c.slides) ? c.slides : []).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && (!slideCount || n <= slideCount));
    out.push({
      id,
      slides: [...new Set(slides)],
      text: claimText,
      question,
      kind: KINDS.includes(c.kind as ClaimKind) ? (c.kind as ClaimKind) : "technical",
      difficulty: DIFFS.includes(c.difficulty as Difficulty) ? (c.difficulty as Difficulty) : "normal",
      timeSensitive: Boolean(c.timeSensitive),
      priority: PRIOS.includes(c.priority as Priority) ? (c.priority as Priority) : "normal",
      key: text(c.key, 120) || question.toLowerCase().slice(0, 120),
    });
  }
  return out;
}

/**
 * Khoá thư viện dữ kiện của agent mô tả đúng câu agent bóc ra. Người duyệt sửa câu hay câu hỏi thì khoá cũ
 * không còn nói về claim này nữa — giữ nguyên là lấy nhầm (rồi ghi đè) dữ kiện của một câu hỏi khác.
 */
export function rekeyEdited(claims: Claim[], extracted: Claim[]): Claim[] {
  return claims.map((c) => {
    const before = extracted.find((x) => x.id === c.id);
    const edited = !before || before.text !== c.text || before.question !== c.question;
    return edited && (!before || c.key === before.key) ? { ...c, key: c.question.toLowerCase().slice(0, 120) } : c;
  });
}

function assertWaiting(state: ResearchState, stage: ResearchState["stage"]) {
  assertEditable(state);
  if (state.stage !== stage) throw new HttpError(409, "Lượt này không còn ở bước đó — tải lại trang.");
  if (isRunning(jobKey(state.id))) throw new HttpError(409, "Lượt này đang chạy.");
}

export function approveClaims(rid: string, raw: unknown) {
  const state = readState(rid);
  assertWaiting(state, "gate1");
  const extracted = readClaims(rid);
  const claims = rekeyEdited(cleanClaims(raw, state.deck.slides), extracted);
  // Claim bị bỏ, bị sửa hay mới thêm thì không được mang kết quả nào còn sót dưới cùng mã.
  const unchanged = new Set(claims.filter((c) => {
    const before = extracted.find((x) => x.id === c.id);
    return before && before.text === c.text && before.question === c.question;
  }).map((c) => c.id));
  dropClaimResults(rid, [...new Set([...extracted.map((c) => c.id), ...claims.map((c) => c.id)])].filter((id) => !unchanged.has(id)));
  writeJson(path.join(runDir(rid), "claims.json"), { claims });
  updateState(rid, (s) => {
    s.gates.gate1 = { at: new Date().toISOString(), claims: claims.length };
    s.stage = "research";
    s.attempts = {};
  });
  researchLog(rid, "system", `Cổng 1: duyệt ${claims.length} claim.`);
  startAdvance(rid);
}

/**
 * Quyết định cổng 2 dồn qua các lần dừng: chỉ nhận quyết định cho claim đang chờ, giữ quyết định cũ của claim
 * khác, và không lưu "Research lại" — kết quả mới phải được xét lại từ đầu.
 */
export function mergeGate2Decisions(before: Record<string, Gate2Decision>, waiting: string[], decisions: Record<string, Gate2Decision>) {
  const merged: Record<string, Gate2Decision> = { ...before };
  for (const id of waiting) {
    if (decisions[id] === "retry") delete merged[id];
    else if (decisions[id]) merged[id] = decisions[id];
  }
  return merged;
}

export async function decideGate2(rid: string, decisions: Record<string, Gate2Decision>) {
  const state = readState(rid);
  assertWaiting(state, "gate2");
  const evidence = readEvidence(rid);
  const claims = readClaims(rid);
  const before = state.gates.gate2?.decisions ?? {};
  // Đúng danh sách cổng này đang chờ (cùng hàm bảng chọn dùng), không phải "claim trượt soát": claim qua soát mà
  // `insufficient` hay mang cảnh báo nặng cũng dừng ở đây, và quyết định cho nó phải được nhận.
  const waiting = gate2Waiting(claims, evidence, before).map((w) => w.claim);
  const missing = waiting.filter((c) => !decisions[c.id]);
  if (missing.length) throw new HttpError(400, `Chưa chọn cách xử lý cho ${missing.map((c) => c.id).join(", ")}.`);
  const decide = (c: Claim) => (waiting.includes(c) ? decisions[c.id] : undefined);
  const passed = (c: Claim) => Boolean(evidence[c.id]?.ok);
  const keep: Claim[] = [];
  const dropped: string[] = [];
  // Chữ của claim bị bỏ phải giữ lại: `claims.json` được ghi lại không còn dòng đó và `dropClaimResults` xoá
  // finding, nên nếu không chép ra đây thì chặng viết không hề biết ý này từng bị nghi ngờ — nó đọc slide và
  // viết lại nguyên si, kèm `**Nguồn:** slide:N` như một giấy thông hành.
  const droppedClaims: { id: string; text: string; slides: number[] }[] = [];
  for (const c of claims) {
    const d = decide(c);
    if (d === "drop") { dropped.push(c.id); droppedClaims.push({ id: c.id, text: c.text, slides: c.slides ?? [] }); continue; }
    keep.push(c);
    // Claim đã qua soát thì "ghi nhận" là giữ nguyên kết quả của nó; chỉ claim trượt soát mới cần finding thay thế.
    if (d === "accept" && !passed(c)) {
      writeJson(path.join(runDir(rid), "claims", c.id, "finding.json"), {
        claim: c.id, verdict: "insufficient", answer: "Chưa có nguồn đủ tin cậy cho điều này.",
        reason: "Người duyệt ghi nhận không đủ nguồn ở cổng 2.", sources: [], evidence: [],
      });
    }
  }
  // Research lại một claim đã qua soát: vòng research chỉ nhặt claim chưa đạt, nên kết quả cũ phải được dọn — như
  // nút "Research lại claim này" — không thì nó đi thẳng tới lại cổng 2 với đúng kết quả đó.
  const redo = waiting.filter((c) => decisions[c.id] === "retry" && passed(c)).map((c) => c.id);
  writeJson(path.join(runDir(rid), "claims.json"), { claims: keep });
  dropClaimResults(rid, [...dropped, ...redo]);
  // Claim ghi nhận "không đủ nguồn" phải được soát lại ngay, không thì vòng research coi nó vẫn trượt và
  // đi tìm lại — đúng việc người duyệt vừa bảo đừng làm.
  const accepted = waiting.filter((c) => decisions[c.id] === "accept" && !passed(c)).map((c) => c.id);
  if (accepted.length && !(await verify(rid, ["--stage", "evidence", "--claims", accepted.join(","), "--no-fetch"])).report) {
    throw new HttpError(500, "Không soát lại được các claim vừa ghi nhận — thử lại.");
  }
  // Quyết định dồn qua các lần dừng ở cổng: ghi đè thì claim đã quyết lần trước mất quyết định và bị hỏi lại.
  // "Research lại" thì không lưu — kết quả mới phải được xét lại từ đầu, kể cả khi nó vẫn không đủ nguồn.
  const merged = mergeGate2Decisions(before, waiting.map((c) => c.id), decisions);
  updateState(rid, (s) => {
    for (const c of waiting) {
      if (decisions[c.id] === "retry") s.attempts[c.id] = MAX_ATTEMPTS - 1;
      if (decisions[c.id] === "accept" && !passed(c)) s.attempts[c.id] = MAX_ATTEMPTS;
      if (decisions[c.id] === "drop") delete s.attempts[c.id];
    }
    if (redo.length) s.noReuse = [...new Set([...(s.noReuse ?? []), ...redo])];
    const droppedBefore = s.gates.gate2?.dropped ?? [];
    s.gates.gate2 = {
      at: new Date().toISOString(), auto: false,
      ...(Object.keys(merged).length ? { decisions: merged } : {}),
      ...(droppedBefore.length || droppedClaims.length ? { dropped: [...droppedBefore, ...droppedClaims] } : {}),
    };
    s.stage = "research";
  });
  researchLog(rid, "system", `Cổng 2: ${waiting.map((c) => `${c.id} → ${decisions[c.id]}`).join(", ") || "không còn claim nào chờ"}`);
  startAdvance(rid);
}

export function approveScript(rid: string) {
  const state = readState(rid);
  assertWaiting(state, "gate3");
  updateState(rid, (s) => {
    s.gates.gate3 = { at: new Date().toISOString() };
    s.stage = "done";
    s.status = "done";
  });
  researchLog(rid, "result", "Cổng 3: đã duyệt kịch bản.");
}

export function sendFeedback(rid: string, feedback: string) {
  const state = readState(rid);
  assertEditable(state);
  if (isRunning(jobKey(rid))) throw new HttpError(409, "Lượt này đang chạy.");
  if (state.stage !== "gate3" && state.stage !== "done") throw new HttpError(409, "Chưa có kịch bản để góp ý.");
  const message = feedback.trim().slice(0, 4000);
  if (!message) throw new HttpError(400, "Góp ý đang trống.");
  updateState(rid, (s) => {
    s.feedback = [...(s.feedback ?? []), { at: new Date().toISOString(), text: message }];
    s.stage = "revise";
    delete s.gates.gate3;
    delete s.lintPending;
  });
  researchLog(rid, "system", `Góp ý của người duyệt: ${message.slice(0, 300)}`);
  startAdvance(rid);
}

export type RerunStep = "extract" | "research" | "write" | "review";

/** Thứ tự chặng để biết lượt đã tới đâu — một chặng chỉ chạy lại được khi lượt đã đi qua nó. */
const REACHED: Record<ResearchStage, number> = { extract: 0, gate1: 1, research: 2, gate2: 3, write: 4, review: 5, revise: 5, gate3: 6, done: 7 };
const RERUN_FROM: Record<RerunStep, number> = { extract: 0, research: 2, write: 4, review: 5 };

/**
 * Chạy lại một chặng (và mọi chặng sau nó); với research có thể chỉ vài claim. Kết quả của chặng đó trở đi
 * được dọn trước: kết quả cũ mà còn thì claim mới cùng mã mang nhầm kết luận cũ, và cổng đã duyệt bị vượt.
 */
export function rerun(rid: string, step: RerunStep, claims: string[] = [], agent?: AgentProvider) {
  const state = readState(rid);
  assertEditable(state);
  if (isRunning(jobKey(rid))) throw new HttpError(409, "Lượt này đang chạy.");
  if (REACHED[state.stage] < RERUN_FROM[step]) throw new HttpError(409, "Lượt này chưa tới chặng đó — duyệt cổng đang chờ trước đã.");
  if (step === "review" && !readScript(rid)) throw new HttpError(409, "Chưa có kịch bản để soát lại.");
  const known = readClaims(rid).map((c) => c.id);
  const targets = claims.filter((c) => known.includes(c));
  if (step === "extract") clearFromExtract(rid);
  if (step === "research") dropClaimResults(rid, targets.length ? targets : known);
  if (step === "write") clearScript(rid);
  updateState(rid, (s) => {
    s.stage = step;
    delete s.lintPending;
    if (agent) s.agent = agent;
    if (step === "extract") { s.gates = {}; s.attempts = {}; s.feedback = []; delete s.noReuse; }
    if (step === "research") {
      const list = targets.length ? targets : known;
      for (const cid of list) delete s.attempts[cid];
      // Research lại = tìm mới, không lấy lại từ thư viện dữ kiện kết quả người dùng vừa muốn làm lại.
      s.noReuse = list;
      delete s.gates.gate2;
      delete s.gates.gate3;
    }
    if (step === "write" || step === "review") delete s.gates.gate3;
  });
  researchLog(rid, "system", `Chạy lại chặng ${step}${targets.length ? ` cho ${targets.join(", ")}` : ""}${agent ? ` bằng ${agent}` : ""}.`);
  startAdvance(rid);
}

export function resume(rid: string) {
  const state = readState(rid);
  assertEditable(state);
  if (["gate1", "gate2", "gate3", "done"].includes(state.stage)) throw new HttpError(409, "Lượt này đang chờ bạn ở một cổng duyệt, không có gì để chạy tiếp.");
  startAdvance(rid);
}

export function stop(rid: string) {
  return stopJob(jobKey(rid));
}

/** Kịch bản đã duyệt → tệp cho form tạo video (bước Kế hoạch), không đụng vào `projects/`. */
export function scriptForVideo(rid: string) {
  const state = readState(rid);
  if (state.stage !== "done") throw new HttpError(409, "Kịch bản chưa được duyệt ở cổng 3 — duyệt xong mới tạo video được.");
  const content = readScript(rid);
  if (content === null) throw new HttpError(404, "Lượt này chưa có kịch bản.");
  const evidence = readEvidence(rid);
  const claims = readClaims(rid);
  const line = `- **Nguồn kịch bản:** đóng gói từ \`research/${rid}\`, duyệt ngày ${(state.gates.gate3?.at ?? new Date().toISOString()).slice(0, 10)}`
    + `, ${claims.filter((c) => evidence[c.id]?.ok).length}/${claims.length} claim qua soát bằng chứng.`;
  return { name: `${state.id}.md`, content: withProvenance(content, line), title: state.title };
}

/**
 * Thêm dòng **Nguồn kịch bản:** vào phần đầu.
 *
 * Kịch bản đi sang pipeline video là một file markdown, và sau đó không còn đường nào lần ngược về lượt
 * research đã tạo ra nó. Một dòng ở đầu file giữ lại vết đó: lượt nào, ngày nào, bao nhiêu claim đã qua soát
 * bằng chứng. Mẫu `templates/kich-ban-co-ban.md` khai dòng này là mục không bắt buộc của phần đầu, nên bên
 * video đọc qua được và `script-check.mjs` không kêu.
 */
export function withProvenance(content: string, line: string) {
  if (/^\s*[-*]\s*\*\*Nguồn kịch bản:/m.test(content)) return content;
  const lines = content.split("\n");
  // Đặt ngay sau khối mục đầu file (các dòng `- **…:**` liền nhau sau tiêu đề), trước phần `##` đầu tiên.
  let at = lines.findIndex((l) => /^##\s/.test(l));
  if (at === -1) at = lines.length;
  while (at > 0 && !lines[at - 1].trim()) at--;
  return [...lines.slice(0, at), line, ...lines.slice(at)].join("\n");
}

// ── agent có trên máy ─────────────────────────────────────────────────────────────

/** Agent nào chạy được trên máy này — bộ chọn chỉ nên đưa ra những cái đó. */
export async function installedAgents(): Promise<Record<AgentProvider, boolean>> {
  const providers: AgentProvider[] = ["claude", "codex", "antigravity"];
  const found = await Promise.all(providers.map(async (p) => [p, Boolean(await resolveAgentBin(p))] as const));
  return Object.fromEntries(found) as Record<AgentProvider, boolean>;
}
