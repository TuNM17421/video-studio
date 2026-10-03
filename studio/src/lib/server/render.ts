import fs from "node:fs";
import path from "node:path";
import { pickRenderAudio } from "../../../../tools/lib/render-audio.mjs";
import { NO_MUSIC } from "../music";
import { itemIdFor } from "../qa-manifest";
import { runAgent } from "./agent";
import { mixApproved } from "./sfx-plan";
import { finishJob, isRunning, jobHandled, log, ownJob, recordJobMetrics, run, setProgress, startJob, wasStopped } from "./jobs";
import { DS, HttpError, mp4Path, projectDir, qaManifestPath, REPO, rel, transcriptPath, videoDir, voiceOut } from "./paths";
import { clearFramesDir, frameFingerprint, prepareFramesDir } from "./render-frames";
import { readState, setStage } from "./videos";

/** Frame của lần render dở, giữ lại để lần sau chụp nốt (render-frames.ts). Nằm trong render/, đã gitignore. */
export const framesDir = (id: string) => path.join(projectDir(id), "render", "frames");

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
  log(id, "system", `Bắt đầu render · ${state.fps} fps · phụ đề ${state.captions ? "có" : "không"}`);
  // Tiếng động được trộn lại NGAY TRƯỚC khi render, theo đúng những chỗ đang duyệt trong panel. Bắt người
  // dùng tự chạy `sfx-mix` rồi báo lỗi khi bản trộn cũ hơn giọng là một ngõ cụt: Studio không có nút nào
  // chạy lệnh đó. Chưa duyệt chỗ nào thì `mixApproved` xoá bản trộn cũ và render dùng lại giọng gốc.
  if (state.request.modules.includes("sfx")) {
    log(id, "system", "Trộn tiếng động đã duyệt");
    const mixed = await mixApproved(id, (line) => log(id, "output", line));
    if (!mixed) log(id, "system", "Chưa duyệt chỗ nào — render không có tiếng động.");
  }
  // A layered-SFX mix (tools/sfx-mix.mjs → projects/<id>/voice-sfx.wav) replaces the raw narration when it is
  // newer; rendering the raw file after a mix silently drops every accent, and no gate would catch it.
  const pick = pickRenderAudio(id, REPO, { voiceRawRel: rel(wav) });
  if (pick.stale) throw new HttpError(409, pick.note);
  const audio = pick.audio ?? rel(wav);
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
  // Sau build, vì vân tay đọc dist/vk.js vừa sinh: cảnh đã sửa thì bundle đổi và frame cũ bị bỏ.
  const frames = framesDir(id);
  const kept = prepareFramesDir(frames, frameFingerprint({
    videoDir: videoDir(id),
    // styles.css chỉ @import tokens/ và components/vk.css, font nằm ở fonts/: cả ba phải vào vân tay, không thì
    // sửa một màu giữa lúc Dừng và lúc Render lại cho ra video nửa màu cũ nửa màu mới. render.mjs có mặt vì
    // nó đổi cách lấy mẫu (hay khoá trong stamp của nó) thì thư mục cũ không còn hợp lệ.
    shared: [
      path.join(DS, "dist/vk.js"), path.join(DS, "styles.css"), path.join(DS, "ui_kits/lesson-video/index.html"),
      path.join(DS, "tokens"), path.join(DS, "components"), path.join(DS, "fonts"),
      path.join(REPO, "tools/render.mjs"),
    ],
    captions: state.captions,
    fps: state.fps,
  }));
  if (kept.reusable) log(id, "system", `Dùng lại ${kept.reusable} frame của lần render trước (hình chưa đổi) — chỉ chụp phần còn thiếu.`);
  else if (kept.discarded) log(id, "system", "Cảnh, giọng, phụ đề hoặc nhịp fps đã đổi từ lần render dở trước — bỏ frame cũ, chụp lại từ đầu.");
  // TODO: on Windows, 6-tab (default) capture hangs deterministically partway through — reproduced
  // twice at the exact same frame, but a single tab clears the same range fine. Forcing 1 worker
  // avoids the hang there; root cause (Chrome/CDP concurrency) not yet found, not confirmed elsewhere.
  // render.mjs tự giữ một stamp (render.json) và từ chối thư mục lệch stamp. Studio không bỏ thư mục đó thì
  // vân tay của nó vẫn khớp, lần sau lại bị từ chối y như vậy — người dùng kẹt mà không có nút nào gỡ.
  let refused = false;
  const renderOk = await step("Render MP4", process.execPath, [
    "tools/render.mjs", "--scene", id, "--audio", audio, "--out", rel(mp4Path(id)), "--base", `${base}/ds`,
    // always explicit: render.mjs falls back to the catalog's default bed when the flag is missing
    "--music-track", background,
    "--keep-frames", rel(frames),
    ...(quiz !== NO_MUSIC ? ["--quiz-track", quiz] : []),
    ...(state.captions ? [] : ["--no-captions"]),
    // Always explicit, like the music track: `--fps 30` is the same sampling as no flag, and a render log
    // that names the rate is the only place the choice shows up afterwards. The scenes are untouched either
    // way — cues.js, voice.js and every beat stay whole frames at 30 fps.
    "--fps", String(state.fps),
    ...(process.platform === "win32" ? ["--workers", "1"] : []),
  ], (line) => {
    if (/là frame của một lượt render khác/.test(line)) refused = true;
    const m = line.match(/(\d+)\/(\d+) frames/);
    if (!m) return false;
    setProgress(id, (Number(m[1]) / Number(m[2])) * 100, `Render ${m[1]}/${m[2]} frame`);
    return true;
  });
  if (!renderOk) {
    if (refused) {
      clearFramesDir(frames);
      return fail("Frame giữ lại không khớp lượt render này — đã bỏ, bấm Render lại để chụp từ đầu.");
    }
    return fail("Render thất bại, xem nhật ký.");
  }
  // MP4 đã ra: dọn frame không được làm hỏng bước render (Windows: antivirus giữ file → EBUSY/EPERM).
  try {
    clearFramesDir(frames);
  } catch (error) {
    log(id, "error", `Không xoá được thư mục frame ${rel(frames)}: ${error instanceof Error ? error.message : String(error)} — xoá tay để lấy lại dung lượng.`);
  }
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
    // Nhịp hình của chính bản MP4 vừa render. Thiếu cờ này thì manifest lấy nhịp của bản thu (30) và khai
    // sai cho một bản 60 fps; qa-manifest đối chiếu số này với file thật nên lệch là dừng, không ghi ra.
    "--fps", String(state.fps),
    "--mp4", rel(mp4Path(id)),
  ]);
  if (!manifestOk) return fail("Không tạo được manifest.json cho platform QA, xem nhật ký.");
  // manifest.json's duration is ffprobe'd off the MP4 itself and cross-checked against the voice — the
  // one length in this whole pipeline that is actually verified, not estimated. USD/phút rides on it.
  try {
    const manifest = JSON.parse(fs.readFileSync(qaManifestPath(id), "utf8")) as { duration_sec?: number };
    if (typeof manifest.duration_sec === "number") recordJobMetrics(id, { videoDurationSec: manifest.duration_sec });
  } catch (error) {
    log(id, "error", `Không đọc được thời lượng từ manifest.json cho telemetry: ${error instanceof Error ? error.message : String(error)}`);
  }
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
