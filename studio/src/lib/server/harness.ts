import fs from "node:fs";
import path from "node:path";
import type { HarnessRun, HarnessStage, HarnessStep, HarnessStepId, HarnessStepStatus } from "../types";
import { emit, isRunning } from "./jobs";
import { stateDir } from "./paths";

/**
 * What the automated checks around a stage are doing, step by step, for the page to show live: the agent
 * turn, then the runner's gates and the cross-review. The latest run per stage is written to
 * .studio/harness/<stage>.json so a reload (or a restart) still shows how it ended.
 */
const LABELS: Record<HarnessStepId, string> = {
  agent: "Agent",
  "dry-run": "TTS dry-run",
  build: "Build",
  verify: "Verify",
  stills: "Chụp ảnh",
  review: "Review chéo",
};

export const HARNESS_STEPS = {
  cues: ["agent", "dry-run"],
  scenes: ["agent", "build", "verify", "stills", "review"],
  review: ["build", "verify", "stills", "review"],
  deliver: ["agent", "build", "verify"],
} satisfies Record<string, HarnessStepId[]>;

const file = (id: string, stage: HarnessStage) => path.join(stateDir(id), "harness", `${stage}.json`);

/** The run in progress per video — one job at a time, so one run at a time. */
const g = globalThis as unknown as { __harness?: Map<string, HarnessRun> };
const current = (g.__harness ??= new Map());

function save(id: string, run: HarnessRun) {
  const target = file(id, run.stage);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(`${target}.tmp`, `${JSON.stringify(run, null, 2)}\n`);
  fs.renameSync(`${target}.tmp`, target);
  emit(id, { type: "state" });
}

export function beginHarness(id: string, stage: HarnessStage, kind: HarnessRun["kind"], steps: HarnessStepId[]) {
  const run: HarnessRun = {
    stage,
    kind,
    status: "running",
    startedAt: Date.now(),
    steps: steps.map((step) => ({ id: step, label: LABELS[step], status: "pending" })),
  };
  current.set(id, run);
  save(id, run);
  return run;
}

function update(id: string, stepId: HarnessStepId, status: HarnessStepStatus, detail?: string) {
  const run = current.get(id);
  const step = run?.steps.find((s: HarnessStep) => s.id === stepId);
  if (!run || !step) return;
  const now = Date.now();
  if (status === "running") step.startedAt = now;
  else if (status !== "pending") {
    step.startedAt ??= now;
    step.finishedAt = now;
  }
  step.status = status;
  if (detail !== undefined) step.detail = detail;
  save(id, run);
}

export const stepStart = (id: string, step: HarnessStepId, detail?: string) => update(id, step, "running", detail);
export const stepDone = (id: string, step: HarnessStepId, detail?: string) => update(id, step, "done", detail);
export const stepError = (id: string, step: HarnessStepId, detail: string) => update(id, step, "error", detail);
export const stepSkip = (id: string, step: HarnessStepId, detail: string) => update(id, step, "skipped", detail);

export function setHarnessReview(id: string, review: NonNullable<HarnessRun["review"]>) {
  const run = current.get(id);
  if (!run) return;
  run.review = review;
  save(id, run);
}

/** Close the run. A step still marked running ends with the run's own outcome; unreached ones stay pending. */
export function endHarness(id: string, status: Exclude<HarnessRun["status"], "running">, error?: string) {
  const run = current.get(id);
  if (!run) return;
  const now = Date.now();
  for (const step of run.steps) {
    if (step.status !== "running") continue;
    step.status = status === "done" ? "done" : "error";
    step.finishedAt = now;
    if (status !== "done") step.detail = status === "stopped" ? "Đã dừng" : error || step.detail;
  }
  run.status = status;
  run.finishedAt = now;
  current.delete(id);
  save(id, run);
}

function read(id: string, stage: HarnessStage): HarnessRun | undefined {
  try {
    const run = JSON.parse(fs.readFileSync(file(id, stage), "utf8")) as HarnessRun;
    // A server restart kills the job; a run left "running" on disk ended without saying so.
    if (run.status === "running" && !isRunning(id)) {
      run.status = "error";
      for (const step of run.steps as HarnessStep[]) if (step.status === "running") { step.status = "error"; step.detail = "Bị ngắt (server khởi động lại)"; }
    }
    return run;
  } catch {
    return undefined;
  }
}

export function harnessRuns(id: string): Partial<Record<HarnessStage, HarnessRun>> {
  const out: Partial<Record<HarnessStage, HarnessRun>> = {};
  for (const stage of ["cues", "scenes", "deliver"] as HarnessStage[]) {
    const run = read(id, stage);
    if (run) out[stage] = run;
  }
  return out;
}
