import fs from "node:fs";
import path from "node:path";
import { CUE_FIELD_LABEL, cueEditBlocked } from "../cue-edit";
import type { CueEditField, CueEditResult } from "../types";
import { beginHarness, endHarness } from "./harness";
import { finishJob, isRunning, log, ownJob, run, setProgress, startJob } from "./jobs";
import { HttpError, projectDir, rel, stateDir, videoDir } from "./paths";
import { runCuesGate } from "./qa";
import { readState, setStage } from "./videos";
import { forgetVoiceChecks } from "./voice";

export const CUE_EDIT_FIELDS: CueEditField[] = ["text", "title", "visual"];

/**
 * Edit one câu (tools/cue-edit.mjs), then run the same free check an agent's cues go through (TTS dry-run).
 * An approved stage stays approved: the member who edits is the one who approves, and approving again would
 * restart image suggestions from scratch — throwing away the images already chosen — over a typo. A stage the
 * dry-run had stopped comes back to "Chờ duyệt" once the edit passes it.
 */
export function editCue(id: string, n: number, changes: Partial<Record<CueEditField, string>>): Promise<CueEditResult> {
  const { state, managed } = readState(id);
  if (!managed) throw new HttpError(400, "Video này chỉ xem, không sửa được.");
  // Before the stage check: while an agent writes the cues the stage reads "running", and the reason to give
  // is the job, not "chưa có lời".
  if (isRunning(id)) throw new HttpError(409, "Video này đang có một tác vụ chạy. Chờ xong rồi sửa.");
  const blocked = cueEditBlocked(state.stages);
  if (blocked) throw new HttpError(400, blocked);
  if (!fs.existsSync(path.join(videoDir(id), "cues.js"))) throw new HttpError(400, "Chưa có cues.js.");
  return ownJob(id, () => edit(id, n, changes), (error) => endHarness(id, "error", error));
}

async function edit(id: string, n: number, changes: Partial<Record<CueEditField, string>>): Promise<CueEditResult> {
  const was = readState(id).state.stages.cues;
  startJob(id, "cue-edit", { actor: "user", label: `sửa câu ${n}` });
  setProgress(id, null, `Đang sửa câu ${n}…`);
  let stdout = "";
  const errors: string[] = [];
  const code = await run(id, process.execPath, [
    "tools/cue-edit.mjs", rel(videoDir(id)), "--n", String(n), "--script", rel(path.join(projectDir(id), "kich-ban-goc.md")),
  ], {
    input: JSON.stringify(changes),
    onLine: (line, stream) => { if (stream === "stdout") stdout += line; else errors.push(line); },
  });
  if (code !== 0) {
    finishJob(id, "error");
    const reason = errors.join(" ").replace(/^✗\s*/, "") || `cue-edit.mjs thoát với mã ${code}.`;
    log(id, "error", `Không sửa được câu ${n}: ${reason}`);
    throw new HttpError(400, reason);
  }
  const result = JSON.parse(stdout) as Omit<CueEditResult, "gate" | "gateError">;
  const fields = Object.keys(result.changed) as CueEditField[];
  if (!fields.length) {
    finishJob(id, "done");
    return { ...result, gate: "skipped" };
  }
  fs.mkdirSync(stateDir(id), { recursive: true });
  fs.appendFileSync(path.join(stateDir(id), "cue-edits.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), ...result })}\n`);
  const script = result.script === "updated" ? " · kịch bản gốc sửa theo"
    : result.script === "not-found" ? " · không thấy câu này trong kịch bản gốc, kịch bản giữ nguyên"
    : result.script === "ambiguous" ? " · lời cũ có ở nhiều chỗ trong kịch bản gốc, kịch bản giữ nguyên"
    : "";
  log(id, "system", `Sửa trực tiếp câu ${n}: ${fields.map((f) => CUE_FIELD_LABEL[f]).join(", ")}${script}`);
  if (fields.includes("text")) forgetVoiceChecks(id);

  setStage(id, "cues", "running");
  beginHarness(id, "cues", "edit", ["dry-run"]);
  try {
    await runCuesGate(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(id, "error", message);
    setStage(id, "cues", "error", message);
    endHarness(id, "error", message);
    finishJob(id, "error");
    return { ...result, gate: "failed", gateError: message };
  }
  setStage(id, "cues", was === "done" ? "done" : "review");
  endHarness(id, "done");
  finishJob(id, "done");
  return { ...result, gate: "ok" };
}
