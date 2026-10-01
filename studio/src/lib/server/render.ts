import fs from "node:fs";
import path from "node:path";
import { NO_MUSIC } from "../music";
import { itemIdFor } from "../qa-manifest";
import { runAgent } from "./agent";
import { finishJob, isRunning, jobHandled, log, ownJob, run, setProgress, startJob, wasStopped } from "./jobs";
import { HttpError, importedPage, mp4Path, rel, transcriptPath, voiceOut } from "./paths";
import { readState, setStage } from "./videos";

/** What a render needs before it can start — checked while the request is still open, so it shows on screen. */
export function renderPreflight(id: string) {
  if (!fs.existsSync(path.join(voiceOut(id), "voice.wav"))) throw new HttpError(400, "Chưa có voice.wav. Tạo giọng đọc trước.");
}

/**
 * Build → render MP4 (frames from this server's /ds) → transcript; then the agent writes chapters. Starts
 * the job before its first await, so a caller that checked `isRunning` just before cannot race a second one.
 */
export function renderVideo(id: string, base: string) {
  return ownJob(id, () => renderSteps(id, base), (error) => setStage(id, "render", "error", error));
}

async function renderSteps(id: string, base: string) {
  const { state } = readState(id);
  renderPreflight(id);
  const wav = path.join(voiceOut(id), "voice.wav");
  const day = state.request.day;
  // render.mjs resolves both tracks against music.json: it caches the audio from the media bucket into
  // assets/music/ and reads the gain from the track's measured loudness. A track it cannot fetch is
  // dropped there with a warning rather than failing the render.
  const { background, quiz } = state.music;
  startJob(id, "render");
  setStage(id, "render", "running");
  // Opens this run in the shared log — the scenes gate also starts with "Build design system".
  log(id, "system", `Bắt đầu render · phụ đề ${state.captions ? "có" : "không"}`);
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
  // Chỉ dùng bản nhập khi người dùng đã chọn Claude Design, không phải cứ thấy thư mục là lấy: một video
  // dựng bằng agent ở máy rồi nhập thêm bản của Claude Design để so sẽ bị render nhầm bản, không một lời báo.
  const imported = state.request.sceneBuilder === "claude-design" ? importedPage(id) : null;
  const renderOk = await step("Render MP4", process.execPath, [
    "tools/render.mjs", "--scene", id, "--audio", rel(wav), "--out", rel(mp4Path(id)),
    // Cảnh dựng bên Claude Design không nằm trong khuôn videos/<id>/ của repo, nên chụp thẳng trang của nó.
    // `--scene` vẫn giữ: render.mjs đọc cues.js của video để lấy mốc nhạc quiz và đối chiếu độ dài giọng.
    ...(imported ? ["--url", `${base}/ds-bundle/cd/${id}/${imported}`] : ["--base", `${base}/ds`]),
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
  // chapters + PROMPTS.md need judgement (chapter titles), so the agent finishes the delivery. The MP4 is
  // done whatever happens there: a deliver that fails shows on its own stage, never as a failed render.
  try {
    return await runAgent(id, "deliver", base);
  } catch (error) {
    // After its job started, runAgent has already logged it and marked the deliver stage.
    if (!jobHandled(error)) {
      const message = error instanceof Error ? error.message : String(error);
      log(id, "error", message);
      if (!isRunning(id)) setStage(id, "deliver", "error", message);
    }
    return false;
  }
}
