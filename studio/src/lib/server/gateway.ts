import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/**
 * Codex cost through the local 9router gateway, for video jobs the Studio UI starts — nothing else.
 *
 * Codex never reports a cost; 9router records one per request in its own SQLite (`usageHistory`, keyed by the
 * API key that made it). A video run goes through a dedicated key (`video-studio`), so the key plus the run's
 * time window finds exactly that run's requests. The key is looked up by NAME in 9router's local DB and handed to
 * the child process only — no file holds it. See telemetry/GATEWAY-9ROUTER.md.
 */
export interface GatewayConfig {
  profile: string;
  key: string;
  db: string;
  modelPrefix: string;
}

export const defaultGatewayDb = () => path.join(os.homedir(), ".9router", "db", "data.sqlite");

function openReadOnly(file: string) {
  return new DatabaseSync(file, { readOnly: true });
}

/** Off unless `STUDIO_GATEWAY=9router` and a key of the configured name exists; a broken setup is off, never an error. */
export function gatewayConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig | null {
  if (env.STUDIO_GATEWAY !== "9router") return null;
  const db = env.NINEROUTER_DB || defaultGatewayDb();
  const name = env.STUDIO_GATEWAY_KEY_NAME || "video-studio";
  try {
    const conn = openReadOnly(db);
    try {
      const row = conn.prepare("SELECT key FROM apiKeys WHERE name = ? AND isActive = 1 LIMIT 1").get(name) as { key?: string } | undefined;
      if (!row?.key) return null;
      return { profile: env.STUDIO_CODEX_PROFILE || "9router", key: row.key, db, modelPrefix: env.STUDIO_GATEWAY_MODEL_PREFIX ?? "cx/" };
    } finally {
      conn.close();
    }
  } catch {
    return null;
  }
}

/**
 * The gateway is opt-in per machine and never a hard dependency: enabled but not answering → the run goes direct
 * (cost unavailable, as before) instead of failing the video job.
 */
export async function activeGateway(
  env: NodeJS.ProcessEnv = process.env,
  probe: (url: string) => Promise<boolean> = async (url) => {
    try { return (await fetch(url, { signal: AbortSignal.timeout(1500) })).ok; } catch { return false; }
  },
): Promise<{ cfg: GatewayConfig | null; note?: string }> {
  const cfg = gatewayConfig(env);
  if (!cfg) return { cfg: null };
  const base = (env.NINEROUTER_URL || "http://127.0.0.1:20128").replace(/\/$/, "");
  if (await probe(`${base}/v1/models`)) return { cfg };
  return { cfg: null, note: "9router không phản hồi — Codex chạy thẳng, lượt này không đo chi phí." };
}

/** `codex exec …` → `codex --profile 9router exec …`; a configured model gets 9router's provider prefix (`cx/`). */
export function withGatewayArgs(args: string[], cfg: GatewayConfig) {
  const out = [...args];
  const m = out.indexOf("-m");
  if (m >= 0 && out[m + 1] && !out[m + 1].includes("/")) out[m + 1] = `${cfg.modelPrefix}${out[m + 1]}`;
  return ["--profile", cfg.profile, ...out];
}

export const withGatewayEnv = (env: NodeJS.ProcessEnv, cfg: GatewayConfig) => ({ ...env, NINEROUTER_API_KEY: cfg.key });

// Runs going through the gateway right now and recently, to tell whether two windows shared the key.
type Window = { start: number; end: number | null };
const g = globalThis as typeof globalThis & { __studioGatewayRuns?: Map<string, Window> };
const windows = (g.__studioGatewayRuns ??= new Map());

export function beginGatewayRun(token: string, now = Date.now()) {
  for (const [key, w] of windows) if (w.end !== null && now - w.end > 24 * 3600_000) windows.delete(key);
  windows.set(token, { start: now, end: null });
}

// 9router writes a request's row as the response ends, which can be a moment after the CLI exits.
export const SETTLE_MS = 3000;

export interface GatewaySettlement {
  gatewayStatus: "ok" | "mismatch" | "overlap" | "no_requests" | "error";
  gatewayRequests?: number;
  costUsd?: number;
  costSource?: "gateway_reported";
  /** The model 9router actually served — Codex's own stream never names it. */
  model?: string;
  message: string;
}

/** Waits for 9router to settle, then sums this run's requests. Never throws: the video job must not fail on cost. */
export async function endGatewayRun(
  token: string,
  cfg: GatewayConfig,
  cli: { inputTokens?: number; outputTokens?: number },
  opts: { now?: number; settleMs?: number } = {},
): Promise<GatewaySettlement> {
  const mine = windows.get(token);
  if (!mine) return { gatewayStatus: "error", message: "9router: không có cửa sổ run." };
  const now = opts.now ?? Date.now();
  const settleMs = opts.settleMs ?? SETTLE_MS;
  mine.end = now;
  const until = now + settleMs;
  if (settleMs > 0) await new Promise((resolve) => setTimeout(resolve, settleMs));
  // Another gateway run whose window touches ours shares the key: its requests are indistinguishable from ours.
  const overlap = [...windows].some(([key, w]) => key !== token && w.start < until && (w.end === null ? true : w.end + settleMs > mine.start));
  if (overlap) return { gatewayStatus: "overlap", message: "9router: có run khác chạy chồng cùng key — không gán chi phí (không đoán)." };
  try {
    const conn = openReadOnly(cfg.db);
    try {
      const cols = new Set((conn.prepare("PRAGMA table_info(usageHistory)").all() as { name: string }[]).map((c) => c.name));
      for (const need of ["timestamp", "apiKey", "promptTokens", "completionTokens", "cost"]) {
        if (!cols.has(need)) return { gatewayStatus: "error", message: `9router: schema usageHistory thiếu cột ${need} — bỏ qua chi phí.` };
      }
      const row = conn.prepare(`
        SELECT count(*) AS requests, coalesce(sum(promptTokens), 0) AS input, coalesce(sum(completionTokens), 0) AS output,
               coalesce(sum(cost), 0) AS cost, group_concat(DISTINCT model) AS models
        FROM usageHistory WHERE apiKey = ? AND timestamp >= ? AND timestamp <= ?
      `).get(cfg.key, new Date(mine.start).toISOString(), new Date(until).toISOString()) as { requests: number; input: number; output: number; cost: number; models: string | null };
      if (!row.requests) return { gatewayStatus: "no_requests", gatewayRequests: 0, message: "9router: không thấy request nào của run này — kiểm tra profile Codex/9router." };
      const matches = (cli.inputTokens === undefined || cli.inputTokens === row.input) && (cli.outputTokens === undefined || cli.outputTokens === row.output);
      const cost = Math.round(row.cost * 1e6) / 1e6;
      return {
        gatewayStatus: matches ? "ok" : "mismatch",
        gatewayRequests: row.requests,
        costUsd: cost,
        costSource: "gateway_reported",
        ...(row.models ? { model: row.models.split(",").join(" + ") } : {}),
        message: matches
          ? `9router: ${row.requests} request · $${cost.toFixed(4)} (quy đổi)`
          : `9router: ${row.requests} request · $${cost.toFixed(4)} — token lệch CLI (${row.input}/${row.output} vs ${cli.inputTokens ?? "?"}/${cli.outputTokens ?? "?"})`,
      };
    } finally {
      conn.close();
    }
  } catch (error) {
    return { gatewayStatus: "error", message: `9router: không đọc được usage (${(error as Error).message}).` };
  }
}
