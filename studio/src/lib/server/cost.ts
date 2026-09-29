import fs from "node:fs";
import path from "node:path";
import type { VideoCost } from "../types";
import { summarizeCost, type CostRun, type ImageRun } from "../video-cost";
import { projectDir, REPO, stateDir } from "./paths";
import { readRuns } from "./workflow";

/**
 * The system lines of a video's log.jsonl, cached by size and mtime: the list page asks for every video's
 * cost, and the log only grows when something happens.
 */
const systemLines = new Map<string, { key: string; lines: string[] }>();

function systemLog(id: string): string[] {
  const file = path.join(stateDir(id), "log.jsonl");
  let stat: fs.Stats;
  try { stat = fs.statSync(file); } catch { return []; }
  const key = `${stat.size}:${stat.mtimeMs}`;
  const cached = systemLines.get(file);
  if (cached?.key === key) return cached.lines;
  const lines: string[] = [];
  for (const row of fs.readFileSync(file, "utf8").split("\n")) {
    if (!row.includes('"kind":"system"')) continue;
    try {
      const entry = JSON.parse(row) as { kind?: string; text?: unknown };
      if (entry.kind === "system" && typeof entry.text === "string") lines.push(entry.text);
    } catch {}
  }
  systemLines.set(file, { key, lines });
  return lines;
}

function imageRuns(id: string): ImageRun[] {
  try {
    const status = JSON.parse(fs.readFileSync(path.join(projectDir(id), "images", "status.json"), "utf8")) as { runs?: unknown };
    return Array.isArray(status.runs) ? status.runs as ImageRun[] : [];
  } catch {
    return [];
  }
}

export function videoCost(id: string): VideoCost {
  return summarizeCost({ runs: readRuns(REPO, id) as CostRun[], systemLog: systemLog(id), imageRuns: imageRuns(id) });
}
