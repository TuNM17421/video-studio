import type { RunStep } from "../../research";
import type { AgentProvider } from "../../types";
import type { StepCall } from "../agent-cli";
import { runAgentStep, type StepOutcome } from "../agent-step";
import { jobKey, researchLog, updateState } from "./store";

export { resolveAgentBin, type StepOutcome } from "../agent-step";

/**
 * Một lượt agent cho một chặng research — `runAgentStep` (lib/server/agent-step.ts) làm phần chạy; ở đây chỉ
 * nối nó vào lượt research: nhật ký của lượt, job `research:<rid>`, và bản ghi trong `state.runs`.
 */
export interface StepSpec {
  step: RunStep;
  call: StepCall;
  claims?: string[];
  idleMs: number;
  capMs: number;
}

const STEP_LABEL: Record<RunStep, string> = { extract: "bóc tách", research: "research", write: "viết", fix: "sửa kịch bản", edit: "biên tập" };

export async function runStepAgent(rid: string, provider: AgentProvider, spec: StepSpec, prompt: string): Promise<StepOutcome> {
  let n = 0;
  return runAgentStep({
    key: jobKey(rid),
    log: (kind, text) => researchLog(rid, kind, text),
    onStart: ({ agent, model, startedAt }) => updateState(rid, (s) => {
      n = (s.runs.at(-1)?.n ?? 0) + 1;
      s.runs.push({ n, step: spec.step, ...(spec.claims ? { claims: spec.claims } : {}), agent, model, startedAt });
    }),
    onEnd: ({ endedAt, result, usage, costUsd }) => updateState(rid, (s) => {
      const r = s.runs.find((x) => x.n === n);
      if (!r) return;
      r.endedAt = endedAt;
      r.result = result;
      if (usage) r.usage = usage;
      if (typeof costUsd === "number") r.costUsd = costUsd;
    }),
  }, provider, {
    what: `${STEP_LABEL[spec.step]}${spec.claims?.length ? ` ${spec.claims.join(", ")}` : ""}`,
    call: spec.call, idleMs: spec.idleMs, capMs: spec.capMs,
  }, prompt);
}
