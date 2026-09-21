import type { LogEntry } from "./types";

/** Stages whose runs share the one video log; each run opens with a system line these recognise. */
export type LogStage = "cues" | "voice" | "scenes" | "render" | "deliver";
const RUN_STARTS: [LogStage, RegExp][] = [
  ["cues", /agent · cues|agent \(cues\)/],
  ["voice", /^Tạo giọng ·|^Nhập giọng ·|^Kiểm tra thư mục giọng|^Cài model local|^Cài Whisper|^Model local đã sinh/],
  ["scenes", /agent · scenes|agent \(scenes\)|^Review lại dựng cảnh/],
  ["render", /^Bắt đầu render/],
  ["deliver", /agent · deliver|agent \(deliver\)/],
];
const runStage = (entry: LogEntry) => entry.kind === "system" ? RUN_STARTS.find(([, re]) => re.test(entry.text))?.[0] ?? null : null;

/**
 * The latest run of `stages[0]` and whatever of `stages` follows it, up to the next run of any other stage.
 * Without the end the scenes step showed the deliver agent's summary: every later run is in the same log.
 */
export function stageLogs(logs: LogEntry[], stages: LogStage[]) {
  let start = -1;
  logs.forEach((entry, i) => { if (runStage(entry) === stages[0]) start = i; });
  if (start < 0) return [];
  const end = logs.findIndex((entry, i) => {
    if (i <= start) return false;
    const stage = runStage(entry);
    return stage !== null && !stages.includes(stage);
  });
  return logs.slice(start, end < 0 ? undefined : end);
}
