/**
 * What a video has cost so far, from what the Studio actually recorded — never a guess that looks like a
 * measurement. Kept in the units each source reports, because they are billed apart:
 *
 * - agents (every CLI the Studio drives, and every lane: authoring stages, visual QA, image suggestions — read
 *   from the workflow ledger runs.jsonl and images/status.json):
 *   · Claude Code reports a price (`total_cost_usd`, the API price even on a subscription) → summed in USD;
 *   · Codex reports tokens but no price and no model name → summed as tokens, never turned into a guessed USD;
 *   · Antigravity reports neither, and runs from before the ledger existed have nothing → counted as runs
 *     without a figure, so "$3.20" never pretends to be the whole bill.
 * - ElevenLabs: the characters it billed, which tts.mjs prints per câu ("tính phí N ký tự") and the voice run
 *   records as `ttsCharacters`. Runs from before that line existed are counted as `unrecorded`.
 *
 * Pure: the server reads the files (lib/server/cost.ts), this adds them up — and the tests feed it real rows.
 */
import type { VideoCost } from "./types";

/** One row of readRuns(): only the fields cost needs. `actor` is the CLI for an agent run. */
export interface CostRun {
  mode?: string;
  status?: string;
  actor?: string;
  costUsd?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  toolCalls?: number | null;
  turns?: number | null;
  ttsCharacters?: number | null;
}

/** images/status.json → runs: the agent-step record (lib/server/agent-step.ts). */
export interface ImageRun {
  agent?: string;
  result?: string;
  costUsd?: number | null;
  usage?: { input?: number; output?: number } | null;
}

export interface CostInputs {
  runs: CostRun[];
  /** The `text` of every system line in the video's log.jsonl. */
  systemLog: string[];
  imageRuns: ImageRun[];
}

/** Log lines each agent run and each ElevenLabs generation writes when it starts (agent.ts, qa.ts, voice.ts). */
const AGENT_START = [/^Bắt đầu agent · /, /^Góp ý gửi agent \(/, /^Bắt đầu QA ảnh · /];
const ELEVEN_START = /^Tạo giọng · /;

const PROVIDER_NAME: Record<string, string> = { claude: "Claude Code", codex: "Codex", antigravity: "Antigravity" };

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** One agent run, whatever lane it came from, as the three things cost cares about. */
interface Measured { provider: string | null; usd: number | null; tokens: number | null; ran: boolean }

export function summarizeCost({ runs, systemLog, imageRuns }: CostInputs): VideoCost {
  const ledgerAgents = runs.filter((run) => run.mode === "agent");
  const measured: Measured[] = [
    ...ledgerAgents.filter((run) => run.status !== "running").map((run) => {
      const tokens = finite(run.inputTokens) || finite(run.outputTokens) ? (run.inputTokens ?? 0) + (run.outputTokens ?? 0) : null;
      // A run whose CLI never started (not installed, stopped at once) reported nothing and cost nothing: it is
      // not a run with a missing price.
      // Antigravity reports only its turn count: that is a run that happened, with no figure.
      const ran = finite(run.costUsd) || tokens !== null || (run.toolCalls ?? 0) > 0 || (run.turns ?? 0) > 0;
      return { provider: run.actor ?? null, usd: finite(run.costUsd) ? run.costUsd : null, tokens, ran };
    }),
    ...imageRuns.filter((run) => run.result !== undefined).map((run) => {
      const u = run.usage;
      const tokens = u && (finite(u.input) || finite(u.output)) ? (u.input ?? 0) + (u.output ?? 0) : null;
      return { provider: run.agent ?? null, usd: finite(run.costUsd) ? run.costUsd : null, tokens, ran: true };
    }),
  ].filter((run) => run.ran);
  // Agent runs the log saw start but the ledger never recorded: they ran before the ledger existed.
  const logged = systemLog.filter((text) => AGENT_START.some((re) => re.test(text))).length;
  const beforeLedger = Math.max(0, logged - ledgerAgents.length);

  const priced = measured.filter((run) => run.usd !== null);
  const tokenOnly = measured.filter((run) => run.usd === null && run.tokens !== null);
  const silent = measured.filter((run) => run.usd === null && run.tokens === null);

  const ttsRuns = runs.filter((run) => finite(run.ttsCharacters));
  const elevenLogged = systemLog.filter((text) => ELEVEN_START.test(text)).length;

  return {
    agentUsd: round2(priced.reduce((sum, run) => sum + (run.usd as number), 0)),
    agentRuns: measured.length + beforeLedger,
    pricedRuns: priced.length,
    tokenRuns: tokenOnly.length,
    tokens: tokenOnly.reduce((sum, run) => sum + (run.tokens as number), 0),
    tokenProviders: [...new Set(tokenOnly.map((run) => PROVIDER_NAME[run.provider ?? ""] ?? run.provider ?? "CLI khác"))],
    silentRuns: silent.length + beforeLedger,
    ttsCharacters: ttsRuns.reduce((sum, run) => sum + (run.ttsCharacters as number), 0),
    ttsRuns: ttsRuns.length,
    // A run that recorded characters also logged its start, so the rest are runs from before the count existed.
    ttsUnrecorded: Math.max(0, elevenLogged - ttsRuns.length),
  };
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

const usd = (value: number) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** 1234567 → "1,2 triệu", 45210 → "45 nghìn", 812 → "812" — a token count is an order of magnitude, not a bill. */
export function tokenCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} triệu`;
  if (value >= 1_000) return `${Math.round(value / 1_000).toLocaleString("vi-VN")} nghìn`;
  return value.toLocaleString("vi-VN");
}

export interface CostLine {
  /** False when no run of this kind reported any figure: `value` is then "chưa có số", not an amount. */
  known: boolean;
  value: string;
  /** What the value does not include, in a few words ("+ 1,2 triệu token Codex · thiếu 2 lượt"), or null. */
  missing: string | null;
  /** The whole story, for a tooltip. */
  note: string;
}

/**
 * The words the list and the video page show. `null` = nothing of that kind ever ran — a video with an
 * imported voice has no ElevenLabs line at all.
 */
export function costLabels(cost: VideoCost): { agent: CostLine | null; tts: CostLine | null } {
  const tokens = `${tokenCount(cost.tokens)} token ${cost.tokenProviders.join("/")}`;
  const parts = [
    cost.pricedRuns ? `${cost.pricedRuns} lượt Claude Code báo giá ${usd(cost.agentUsd)} (giá API quy đổi, kể cả khi dùng gói thuê bao)` : "",
    cost.tokenRuns ? `${cost.tokenRuns} lượt ${cost.tokenProviders.join("/")} báo ${tokenCount(cost.tokens)} token vào + ra nhưng không báo giá` : "",
    cost.silentRuns ? `${cost.silentRuns} lượt không báo số nào (Antigravity, hoặc chạy trước khi Studio ghi sổ)` : "",
  ].filter(Boolean);
  const agent: CostLine | null = !cost.agentRuns ? null : {
    known: cost.pricedRuns > 0 || cost.tokenRuns > 0,
    value: cost.pricedRuns ? usd(cost.agentUsd) : cost.tokenRuns ? tokens : "chưa có số",
    missing: [
      cost.pricedRuns && cost.tokenRuns ? `+ ${tokens}` : "",
      cost.silentRuns && (cost.pricedRuns || cost.tokenRuns) ? `thiếu ${cost.silentRuns} lượt` : "",
      !cost.pricedRuns && !cost.tokenRuns ? `${cost.silentRuns} lượt không báo số` : "",
    ].filter(Boolean).join(" · ") || null,
    note: `${parts.join(" · ")}.`,
  };
  const tts: CostLine | null = !cost.ttsRuns && !cost.ttsUnrecorded ? null
    : !cost.ttsRuns
      ? { known: false, value: "chưa có số", missing: `${cost.ttsUnrecorded} lượt trước khi ghi số`, note: `${cost.ttsUnrecorded} lượt tạo giọng trước khi Studio ghi số ký tự.` }
      : {
          known: true,
          value: `${cost.ttsCharacters.toLocaleString("vi-VN")} ký tự`,
          missing: cost.ttsUnrecorded ? `thiếu ${cost.ttsUnrecorded} lượt` : null,
          note: `Ký tự ElevenLabs tính phí qua ${cost.ttsRuns} lượt tạo giọng trong Studio${cost.ttsUnrecorded ? ` · chưa tính ${cost.ttsUnrecorded} lượt trước khi Studio ghi số` : ""}.`,
        };
  return { agent, tts };
}

/** "câu 03 → ElevenLabs … 4.21 s · tính phí 57 ký tự" → 57; any other line → null. */
export function billedFromLine(line: string): number | null {
  const m = line.match(/→ ElevenLabs .*· tính phí (\d+) ký tự/);
  return m ? Number(m[1]) : null;
}
