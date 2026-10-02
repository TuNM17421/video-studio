import { addRunMetrics, finishRun, startRun } from "../../../../../tools/workflow-ledger.mjs";
import type { RunStep } from "../../research";
import type { AgentProvider } from "../../types";
import type { StepCall } from "../agent-cli";
import { runAgentStep, type StepOutcome } from "../agent-step";
import { machineLabel } from "../jobs";
import { REPO } from "../paths";
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

/**
 * Trước 26/09/2026, token/chi phí viết kịch bản chỉ lưu trong `research/<rid>/state.json` — không lên telemetry
 * chung, nên mất khi dọn máy và không cộng được vào tổng. `research:<rid>` (dấu `:`) là khoá job trong bộ đăng
 * ký, nhưng workflow-ledger dùng videoId làm TÊN THƯ MỤC (`projects/<videoId>/.studio`) — dấu `:` vỡ trên
 * Windows, nên telemetry dùng dấu gạch ngang: một mã "video" giả (`research-<rid>`), tự nhận ra trên dashboard.
 * Kịch bản chưa có video thật để gắn vào (mã video chỉ có sau khi tải kịch bản lên bước Kế hoạch) — đây vẫn là
 * điểm cần cải thiện, không phải đã giải quyết: chi phí viết kịch bản và chi phí dựng video của cùng một bài
 * học hiện nằm ở hai "video" khác nhau trên dashboard, không tự cộng lại làm một.
 */
const telemetryVideoRef = (rid: string) => `research-${rid}`;

export async function runStepAgent(rid: string, provider: AgentProvider, spec: StepSpec, prompt: string): Promise<StepOutcome> {
  let n = 0;
  let workflowRunId: string | undefined;
  return runAgentStep({
    key: jobKey(rid),
    log: (kind, text) => researchLog(rid, kind, text),
    onStart: ({ agent, model, startedAt }) => {
      updateState(rid, (s) => {
        n = (s.runs.at(-1)?.n ?? 0) + 1;
        s.runs.push({ n, step: spec.step, ...(spec.claims ? { claims: spec.claims } : {}), agent, model, startedAt });
      });
      // stage "script.<bước>" khớp sẵn với telemetry_phase() (`stage LIKE 'script%'` → phase 'script').
      workflowRunId = startRun(REPO, telemetryVideoRef(rid), { stage: `script.${spec.step}`, actor: agent, mode: "agent", machine: machineLabel() }).runId;
    },
    onEnd: ({ endedAt, result, usage, costUsd }) => {
      updateState(rid, (s) => {
        const r = s.runs.find((x) => x.n === n);
        if (!r) return;
        r.endedAt = endedAt;
        r.result = result;
        if (usage) r.usage = usage;
        if (typeof costUsd === "number") r.costUsd = costUsd;
      });
      if (!workflowRunId) return;
      if (usage || typeof costUsd === "number") {
        addRunMetrics(REPO, telemetryVideoRef(rid), workflowRunId, {
          provider,
          inputTokens: usage?.input,
          cachedInputTokens: usage?.cacheRead,
          outputTokens: usage?.output,
          // Chỉ Claude tự báo chi phí (total_cost_usd) — Codex/Antigravity không, giữ đúng quy ước của pipeline
          // video: không suy chi phí từ token khi provider không tự nói.
          ...(typeof costUsd === "number" && provider === "claude" ? { costUsd, costSource: "provider_reported" } : {}),
        });
      }
      finishRun(REPO, telemetryVideoRef(rid), workflowRunId, { status: result === "ok" ? "done" : "error" });
    },
  }, provider, {
    what: `${STEP_LABEL[spec.step]}${spec.claims?.length ? ` ${spec.claims.join(", ")}` : ""}`,
    call: spec.call, idleMs: spec.idleMs, capMs: spec.capMs,
  }, prompt);
}
