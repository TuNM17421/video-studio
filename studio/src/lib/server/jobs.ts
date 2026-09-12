import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { JobInfo, JobKind, LogEntry } from "../types";
import { REPO, stateDir } from "./paths";

/** Server-side registry, kept on globalThis so dev hot-reload does not lose running jobs. */
type Listener = (event: StudioEvent) => void;
export type StudioEvent = { type: "log"; entry: LogEntry } | { type: "job"; job: JobInfo | null } | { type: "state" };

interface Registry {
  jobs: Map<string, JobInfo & { child?: ChildProcess; stopped?: boolean }>;
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

export function setProgress(id: string, percent: number | null, message: string) {
  const job = registry.jobs.get(id);
  if (!job) return;
  job.progress = { percent, message };
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

export function stopJob(id: string) {
  const job = registry.jobs.get(id);
  if (!job || job.status !== "running") return false;
  job.stopped = true;
  job.child?.kill("SIGTERM");
  return true;
}

interface RunOptions {
  env?: NodeJS.ProcessEnv;
  input?: string;
  onLine?: (line: string, stream: "stdout" | "stderr") => void;
}

/** On Windows `npm` is a .cmd shim; Node can only run it through a shell, not by direct spawn. */
const needsShell = (cmd: string) => process.platform === "win32" && cmd === "npm";

/** Run a command in the repo, attached to the video's current job (so Dừng can kill it). */
export function run(id: string, cmd: string, args: string[], opts: RunOptions = {}) {
  return new Promise<number>((resolve) => {
    const child = spawn(cmd, args, { cwd: REPO, env: opts.env ?? process.env, stdio: ["pipe", "pipe", "pipe"], shell: needsShell(cmd) });
    const job = registry.jobs.get(id);
    if (job) job.child = child;
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
    child.on("error", (error) => { opts.onLine?.(`${cmd}: ${error.message}`, "stderr"); resolve(127); });
    child.on("close", (code) => resolve(code ?? 1));
    if (opts.input !== undefined) child.stdin.end(opts.input);
    else child.stdin.end();
  });
}

export function wasStopped(id: string) {
  return Boolean(registry.jobs.get(id)?.stopped);
}
