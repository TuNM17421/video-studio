import fs from "node:fs";
import path from "node:path";
import { pickRenderAudio } from "../../../../tools/lib/render-audio.mjs";
import { NO_MUSIC } from "../music";
import { itemIdFor } from "../qa-manifest";
import { runAgent } from "./agent";
import { finishJob, log, run, setProgress, startJob, wasStopped } from "./jobs";
import { HttpError, mp4Path, REPO, rel, transcriptPath, voiceOut } from "./paths";
import { readState, setStage } from "./videos";

/** Build → render MP4 (frames from this server's /ds) → transcript; then the agent writes chapters. */
export async function renderVideo(id: string, base: string) {
  const { state } = readState(id);
  const wav = path.join(voiceOut(id), "voice.wav");
  if (!fs.existsSync(wav)) throw new HttpError(400, "Chưa có voice.wav. Tạo giọng đọc trước.");
  // A layered-SFX mix (tools/sfx-mix.mjs → projects/<id>/voice-sfx.wav) replaces the raw narration when it is
  // newer; rendering the raw file after a mix silently drops every accent, and no gate would catch it.
  const pick = pickRenderAudio(id, REPO, { voiceRawRel: rel(wav) });
  if (pick.stale) throw new HttpError(409, pick.note);
  const audio = pick.audio ?? rel(wav);
  const day = state.request.day;
  // render.mjs resolves both tracks against music.json: it caches the audio from the media bucket into
  // assets/music/ and reads the gain from the track's measured loudness. A track it cannot fetch is
  // dropped there with a warning rather than failing the render.
  const { background, quiz } = state.music;
  startJob(id, "render");
  setStage(id, "render", "running");
  // Opens this run in the shared log — the scenes gate also starts with "Build design system".
  log(id, "system", `Bắt đầu render · phụ đề ${state.captions ? "có" : "không"}`);
  log(id, "system", `Âm thanh: ${pick.note}`);
  const step = async (label: string, cmd: string, args: string[], onLine?: (line: string) => boolean) => {
    log(id, "system", label);
    setProgress(id, null, label);
    const code = await run(id, cmd, args, {
      onLine(line, stream) {
        if (onLine?.(line)) return;
        log(id, stream === "stderr" ? "error" : "output", line);
      },
    });
    return code === 0 && !wasStopped(id);
  };
  const fail = (msg: string) => {
    setStage(id, "render", "error", wasStopped(id) ? "Đã dừng." : msg);
    finishJob(id, "error");
    return false;
  };

  if (!(await step("Build design system", "npm", ["run", "build"]))) return fail("Build thất bại.");
  // TODO: on Windows, 6-tab (default) capture hangs deterministically partway through — reproduced
  // twice at the exact same frame, but a single tab clears the same range fine. Forcing 1 worker
  // avoids the hang there; root cause (Chrome/CDP concurrency) not yet found, not confirmed elsewhere.
  const renderOk = await step("Render MP4", process.execPath, [
    "tools/render.mjs", "--scene", id, "--audio", audio, "--out", rel(mp4Path(id)), "--base", `${base}/ds`,
    // always explicit: render.mjs falls back to the catalog's default bed when the flag is missing
    "--music-track", background,
    ...(quiz !== NO_MUSIC ? ["--quiz-track", quiz] : []),
    ...(state.captions ? [] : ["--no-captions"]),
    ...(process.platform === "win32" ? ["--workers", "1"] : []),
  ], (line) => {
    const m = line.match(/(\d+)\/(\d+) frames/);
    if (!m) return false;
    setProgress(id, (Number(m[1]) / Number(m[2])) * 100, `Render ${m[1]}/${m[2]} frame`);
    return true;
  });
  if (!renderOk) return fail("Render thất bại, xem nhật ký.");
  if (state.request.scope.transcript && day) {
    fs.mkdirSync(path.dirname(transcriptPath(day, id)), { recursive: true });
    const ok = await step("Transcript", process.execPath, ["tools/transcript.mjs", rel(path.join(voiceOut(id), "voice.cues.json")), rel(transcriptPath(day, id))]);
    if (!ok) return fail("Không tạo được transcript.");
  }
  // manifest.json beside the MP4: what the QA platform keys every finding to a câu with. It reads only
  // finished artefacts, so it cannot damage the render — but it refuses a stale voice or a mismatched
  // MP4, which is exactly the build nobody should send out.
  const manifestOk = await step("Manifest QA", process.execPath, [
    "tools/qa-manifest.mjs", "--scene", id,
    "--item", itemIdFor(state.request.itemId, id),
    "--title", state.request.title || id,
    "--build", String(state.buildNo),
    "--captions", state.captions ? "yes" : "no",
    "--mp4", rel(mp4Path(id)),
  ]);
  if (!manifestOk) return fail("Không tạo được manifest.json cho platform QA, xem nhật ký.");
  setStage(id, "render", "done");
  finishJob(id, "done");
  // chapters + PROMPTS.md need judgement (chapter titles), so the agent finishes the delivery
  return runAgent(id, "deliver", base);
}
