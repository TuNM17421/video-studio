import fs from "node:fs";
import path from "node:path";
import type { LocalTelemetry, TelemetryEventStatus, TelemetryPreviewEvent, TelemetryVideoMetrics } from "@/lib/types";
import { readState, syncStateFile, unsafeReason } from "../../../../tools/telemetry-sync.mjs";

/**
 * The event schema `workflow-ledger.mjs#emitTelemetry` writes, as nested key whitelists. Only these values
 * are copied into the preview; anything else the raw line carries is reported by key name (`extraKeys`).
 */
const MEASUREMENT = ["duration_ms", "input_tokens", "cached_input_tokens", "output_tokens", "tool_calls", "characters", "credits", "gpu_seconds", "video_duration_s"] as const;
const WHITELIST: Record<string, true | Record<string, true | Record<string, true>>> = {
  event_id: true, schema_version: true, occurred_at: true, event_type: true, installation_id: true,
  project_ref: true, video_ref: true, run_id: true, stage: true, actor_kind: true, provider: true, model: true,
  outcome: { status: true, error_code: true },
  measurement: { ...Object.fromEntries(MEASUREMENT.map((k) => [k, true as const])), cost: { amount: true, currency: true, source: true } },
  privacy: { payload_class: true },
  run_context: { attempt: true, version: true, trigger: true, feedback_ids: true, session_id: true, prompt_sha256: true, gateway_status: true },
  feedback: {
    feedback_id: true, stage: true, scope: true, code: true, severity: true, source: true, qa_provider: true,
    status: true, recurrence: true, found_by_run: true, resolved_by_run: true, verified_by_run: true, created_at: true,
  },
};

type Shape = true | { [key: string]: Shape };

function isScalar(value: unknown) {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/** Copy only whitelisted keys; a leaf must be a scalar (or an array of scalars) or it is dropped as extra. */
export function projectEvent(raw: unknown): { event: Record<string, unknown>; extraKeys: string[] } {
  const extraKeys: string[] = [];
  const walk = (value: unknown, shape: { [key: string]: Shape }, prefix: string): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (!value || typeof value !== "object" || Array.isArray(value)) return out;
    for (const [key, child] of Object.entries(value)) {
      const here = prefix ? `${prefix}.${key}` : key;
      const rule = shape[key];
      if (!rule) { extraKeys.push(here); continue; }
      if (rule === true) {
        if (isScalar(child) || (Array.isArray(child) && child.every(isScalar))) out[key] = child;
        else extraKeys.push(here);
      } else if (child === null) {
        out[key] = null;
      } else {
        out[key] = walk(child, rule, here);
      }
    }
    return out;
  };
  return { event: walk(raw, WHITELIST as { [key: string]: Shape }, ""), extraKeys };
}

function readLines(file: string) {
  if (!fs.existsSync(file)) return { rows: [] as unknown[], unreadable: 0 };
  let unreadable = 0;
  const rows: unknown[] = [];
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { rows.push(JSON.parse(line)); } catch { unreadable++; }
  }
  return { rows, unreadable };
}

const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const addNullable = (a: number | null, b: number | null) => (b === null ? a : (a ?? 0) + b);

export interface LocalTelemetryOptions {
  sending: LocalTelemetry["sending"];
  aiLogsEnabled: boolean;
  previewLimit?: number;
}

/** Local-only view: reads the outbox + receipts on disk, opens no network connection. */
export function readLocalTelemetry(repo: string, options: LocalTelemetryOptions): LocalTelemetry {
  const root = path.join(repo, ".studio", "telemetry");
  const { rows, unreadable } = readLines(path.join(root, "outbox.jsonl"));
  const receiptsFound = fs.existsSync(syncStateFile(repo));
  const state = readState(syncStateFile(repo));
  const acked = new Set<string>(state.sentEventIds);
  // The uploader parks an event the collector refused with a 4xx and never offers it again. Without reading
  // that file this view would keep calling it "chờ gửi" for good — a queue that is not actually a queue.
  const rejected = new Map<string, string>();
  for (const row of readLines(path.join(root, "outbox.rejected.jsonl")).rows) {
    const entry = row as { event?: { event_id?: unknown }; reason?: unknown };
    const id = typeof entry.event?.event_id === "string" ? entry.event.event_id : "";
    if (id) rejected.set(id, typeof entry.reason === "string" ? entry.reason : "Máy chủ từ chối event này.");
  }
  const previewLimit = options.previewLimit ?? 50;

  const byType: Record<string, number> = {};
  const counts = { acked: 0, pending: 0, blocked: 0, rejected: 0 };
  const videos = new Map<string, TelemetryVideoMetrics>();
  const feedbackLatest = new Map<string, { video: string; status: string }>();
  const unsent: TelemetryPreviewEvent[] = [];

  for (const raw of rows) {
    const { event, extraKeys } = projectEvent(raw);
    const blockedReason = unsafeReason(raw);
    const id = typeof event.event_id === "string" ? event.event_id : "";
    const rejectedReason = rejected.get(id) ?? null;
    const status: TelemetryEventStatus = blockedReason
      ? "blocked"
      : acked.has(id) ? "acked" : rejectedReason ? "rejected" : "pending";
    counts[status]++;
    const type = typeof event.event_type === "string" ? event.event_type : "unknown";
    byType[type] = (byType[type] || 0) + 1;
    if (status !== "acked") unsent.push({ status, blockedReason, rejectedReason, extraKeys, event });

    const video = typeof event.video_ref === "string" && event.video_ref ? event.video_ref : "(không rõ)";
    const row = videos.get(video) ?? {
      video, runs: 0, finished: 0, errors: 0, durationMs: null, inputTokens: null, outputTokens: null,
      costUsd: null, costMeasured: 0, costUnknown: 0, feedbackOpen: 0, lastAt: null,
    };
    videos.set(video, row);
    const at = typeof event.occurred_at === "string" ? event.occurred_at : null;
    if (at && (!row.lastAt || at > row.lastAt)) row.lastAt = at;
    const m = (event.measurement ?? {}) as Record<string, unknown>;
    const cost = (m.cost ?? {}) as Record<string, unknown>;
    if (type === "run_started") row.runs++;
    if (type === "run_finished") {
      row.finished++;
      const outcome = (event.outcome ?? {}) as Record<string, unknown>;
      if (outcome.status === "error") row.errors++;
      row.durationMs = addNullable(row.durationMs, num(m.duration_ms));
    }
    if (type === "usage_recorded") {
      row.inputTokens = addNullable(row.inputTokens, num(m.input_tokens));
      row.outputTokens = addNullable(row.outputTokens, num(m.output_tokens));
      const amount = num(cost.amount);
      // NULL is "not measured", never $0: only a cost with a declared source enters the sum.
      if (amount !== null && typeof cost.source === "string" && cost.source !== "unavailable") {
        row.costUsd = addNullable(row.costUsd, amount);
        row.costMeasured++;
      } else {
        row.costUnknown++;
      }
    }
    if (type === "feedback_state") {
      const fb = (event.feedback ?? {}) as Record<string, unknown>;
      if (typeof fb.feedback_id === "string") feedbackLatest.set(`${video}:${fb.feedback_id}`, { video, status: String(fb.status) });
    }
  }
  for (const { video, status } of feedbackLatest.values()) {
    if (["open", "planned"].includes(status)) videos.get(video)!.feedbackOpen++;
  }

  const aiLogs = readLines(path.join(root, "ai-logs-outbox.jsonl"));
  const aiLogsRejected = readLines(path.join(root, "ai-logs.rejected.jsonl"));
  // Newest first; a refused event leads so it is never hidden past the limit.
  const refusedFirst = (p: TelemetryPreviewEvent) => Number(p.status === "blocked" || p.status === "rejected");
  const preview = unsent
    .sort((a, b) => refusedFirst(b) - refusedFirst(a) || String(b.event.occurred_at ?? "").localeCompare(String(a.event.occurred_at ?? "")))
    .slice(0, previewLimit);

  return {
    outbox: { total: rows.length, unreadableLines: unreadable, byType },
    counts,
    receipts: {
      found: receiptsFound,
      lastAttemptAt: state.lastAttemptAt,
      lastSuccessAt: state.lastSuccessAt,
      lastFailureAt: state.lastFailureAt,
      lastError: state.lastError,
    },
    sending: options.sending,
    aiLogs: {
      count: aiLogs.rows.length + aiLogs.unreadable,
      enabled: options.aiLogsEnabled,
      rejected: aiLogsRejected.rows.length,
    },
    videos: [...videos.values()].sort((a, b) => String(b.lastAt ?? "").localeCompare(String(a.lastAt ?? ""))),
    preview,
    previewLimit,
  };
}
