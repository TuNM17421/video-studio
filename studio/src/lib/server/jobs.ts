import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { JobInfo, JobKind, LogEntry } from "../types";
import { REPO, stateDir } from "./paths";

/** Server-side registry, kept on globalThis so dev hot-reload does not lose running jobs. */
type Listener = (event: StudioEvent) => void;
export type StudioEvent = { type: "log"; entry: LogEntry } | { type: "job"; job: JobInfo | null } | { type: "state" };

interface Registry {
  /** `anchor` is the job's first percent reading — where the countdown measures from. */
  jobs: Map<string, JobInfo & { child?: ChildProcess; stopped?: boolean; anchor?: { at: number; percent: number } }>;
  logs: Map<string, LogEntry[]>;
  listeners: Map<string, Set<Listener>>;
  /** ElevenLabs API key: memory only, never written to disk or passed to the agent. */
  elevenKey: string | null;
}
const g = globalThis as typeof globalThis & { __videoStudio?: Registry };
export const registry: Registry = (g.__videoStudio ??= { jobs: new Map(), logs: new Map(), listeners: new Map(), elevenKey: null });

const MAX_LOGS = 1500;

export function emit(id: string, event: StudioEvent) {
  for (const fn of registry.listeners.get(id) || []) fn(event);
}

export function subscribe(id: string, fn: Listener) {
  const set = registry.listeners.get(id) ?? new Set<Listener>();
  set.add(fn);
  registry.listeners.set(id, set);
  return () => set.delete(fn);
}

export function log(id: string, kind: LogEntry["kind"], text: string) {
  const entry: LogEntry = { t: Date.now(), kind, text };
  const list = logs(id);
  list.push(entry);
  if (list.length > MAX_LOGS) list.splice(0, list.length - MAX_LOGS);
  try {
    fs.mkdirSync(stateDir(id), { recursive: true });
    fs.appendFileSync(path.join(stateDir(id), "log.jsonl"), `${JSON.stringify(entry)}\n`);
  } catch {}
  emit(id, { type: "log", entry });
}

/** Recent log entries: memory first, else the tail of .studio/log.jsonl (after a server restart). */
export function logs(id: string) {
  let list = registry.logs.get(id);
  if (!list) {
    list = [];
    const file = path.join(stateDir(id), "log.jsonl");
    if (fs.existsSync(file)) {
      for (const line of fs.readFileSync(file, "utf8").trim().split("\n").slice(-400)) {
        try { list.push(JSON.parse(line)); } catch {}
      }
    }
    registry.logs.set(id, list);
  }
  return list;
}

export function currentJob(id: string): JobInfo | null {
  const job = registry.jobs.get(id);
  if (!job) return null;
  const { kind, status, startedAt, progress } = job;
  return { kind, status, startedAt, progress };
}

export function isRunning(id: string) {
  return registry.jobs.get(id)?.status === "running";
}

export function startJob(id: string, kind: JobKind) {
  if (isRunning(id)) throw new Error("Video này đang có một tác vụ chạy. Chờ xong hoặc bấm Dừng.");
  const job = { kind, status: "running" as const, startedAt: Date.now(), progress: null };
  registry.jobs.set(id, job);
  emit(id, { type: "job", job: currentJob(id) });
  return job;
}

/**
 * A render runs for a quarter of an hour, so the wait needs a number on it. The estimate measures from
 * the job's **first** percent rather than from its start: a render spends its opening half-minute
 * building the design system and moves no percent, and extrapolating across that reported roughly twice
 * the real wait. Stages with no total (an agent reports tool calls, not progress) get no estimate —
 * the UI shows how long they have been running and nothing more.
 */
export function setProgress(id: string, percent: number | null, message: string) {
  const job = registry.jobs.get(id);
  if (!job) return;
  if (percent !== null && !job.anchor) job.anchor = { at: Date.now(), percent };
  const from = job.anchor;
  const etaMs = from && percent !== null && percent > from.percent
    ? Math.round(((100 - percent) / (percent - from.percent)) * (Date.now() - from.at))
    : null;
  job.progress = { percent, message, etaMs };
  emit(id, { type: "job", job: currentJob(id) });
}

export function finishJob(id: string, status: JobInfo["status"]) {
  const job = registry.jobs.get(id);
  if (!job) return;
  job.status = job.stopped ? "stopped" : status;
  job.child = undefined;
  emit(id, { type: "job", job: currentJob(id) });
  emit(id, { type: "state" });
}

/**
 * Dừng phải với tới cả tiến trình cháu. Sinh giọng bằng model local là node → python, và python giữ
 * vài GB VRAM: giết mỗi node thì job báo "đã dừng" trong khi GPU vẫn bận và vẫn ghi wav.
 *
 * Trên Windows SIGTERM chỉ là TerminateProcess — tiến trình con không chạy được handler nào để dọn
 * đứa cháu, nên phải nhờ `taskkill /T`. Trên macOS/Linux thì ngược lại: SIGTERM tới nơi và tool tự
 * chuyển tín hiệu xuống python, nên không cần đụng tới process group (đổi group sẽ làm Ctrl-C ở cửa
 * sổ chạy studio không còn lan xuống job).
 */
function killTree(child: ChildProcess | undefined) {
  if (!child?.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" }).on("error", () => child.kill());
    return;
  }
  child.kill("SIGTERM");
}

/**
 * Giết tiến trình con đang chạy của một job mà không đánh dấu job là "đã dừng" — cho bộ canh kẹt của pipeline
 * research: dừng một lượt agent đứng im không phải là người dùng bấm Dừng, và không được xoá dấu Dừng thật
 * nếu người dùng bấm đúng lúc đó.
 */
export function killChild(id: string) {
  const job = registry.jobs.get(id);
  if (!job?.child) return false;
  killTree(job.child);
  return true;
}

export function stopJob(id: string) {
  const job = registry.jobs.get(id);
  if (!job || job.status !== "running") return false;
  job.stopped = true;
  killTree(job.child);
  return true;
}

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  input?: string;
  onLine?: (line: string, stream: "stdout" | "stderr") => void;
}

/**
 * On Windows a batch shim (`npm`, and any agent CLI installed through npm) can only be run through a
 * shell: spawning one directly throws EINVAL. Matched on the extension too, so pointing CLAUDE_BIN /
 * CODEX_BIN / ANTIGRAVITY_BIN at a `.cmd` works instead of crashing the job.
 */
const needsShell = (cmd: string) => process.platform === "win32" && (cmd === "npm" || /\.(cmd|bat)$/i.test(cmd));

/**
 * One argument for cmd.exe. With `shell: true` Node joins the arguments with spaces and cmd.exe re-splits
 * them, so a permission rule like `Bash(node tools/page.mjs *)` arrived as four arguments and never matched
 * (measured). Quote anything cmd.exe or the program's argv parser would split or interpret; inner quotes
 * and the backslashes before them are escaped the way MSVCRT-style parsers (node.exe behind every npm shim)
 * read them back.
 */
export function quoteForCmd(arg: string) {
  if (arg !== "" && !/[\s"&|<>^()!,;=%]/.test(arg)) return arg;
  return `"${arg.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/, "$1$1")}"`;
}

/** Run a command in the repo, attached to the video's current job (so Dừng can kill it). */
export function run(id: string, cmd: string, args: string[], opts: RunOptions = {}) {
  return new Promise<number>((resolve) => {
    const shell = needsShell(cmd);
    const child = shell
      ? spawn(quoteForCmd(cmd), args.map(quoteForCmd), { cwd: REPO, env: opts.env ?? process.env, stdio: ["pipe", "pipe", "pipe"], shell: true })
      : spawn(cmd, args, { cwd: REPO, env: opts.env ?? process.env, stdio: ["pipe", "pipe", "pipe"] });
    const job = registry.jobs.get(id);
    if (job) job.child = child;
    // A job outlives each process it runs (the research runner spends minutes between agents). Keeping an
    // exited child here would make Dừng taskkill its PID — which Windows may already have handed to an
    // unrelated process of the user's.
    const release = () => { const current = registry.jobs.get(id); if (current?.child === child) current.child = undefined; };
    const pipe = (stream: NodeJS.ReadableStream, name: "stdout" | "stderr") => {
      let buf = "";
      stream.on("data", (chunk: Buffer) => {
        buf += chunk.toString();
        const lines = buf.split(/\r?\n|\r/);
        buf = lines.pop() ?? "";
        for (const line of lines) if (line.trim()) opts.onLine?.(line, name);
      });
      stream.on("end", () => { if (buf.trim()) opts.onLine?.(buf, name); });
    };
    pipe(child.stdout, "stdout");
    pipe(child.stderr, "stderr");
    child.on("error", (error) => { release(); opts.onLine?.(`${cmd}: ${error.message}`, "stderr"); resolve(127); });
    child.on("close", (code) => { release(); resolve(code ?? 1); });
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

export function wasStopped(id: string) {
  return Boolean(registry.jobs.get(id)?.stopped);
}
