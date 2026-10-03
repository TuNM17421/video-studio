#!/usr/bin/env node
/**
 * Write the manifest.json the VLearn QA platform needs next to a rendered MP4 (spec v3 §6b).
 * Run it after render.mjs; it reads only what already exists and never touches the render.
 *
 * Delivered by the QA team as a standalone folder and copied in here unchanged (only the lib import moved
 * to tools/lib/) so the pipeline can run it: Studio calls it right after the transcript, and the CLI at
 * Stage 4. The rules in tools/lib/qa-manifest.mjs are the platform's contract — do not adjust them to make
 * a video pass; fix the video. Re-copy both files when the QA team ships a new version.
 *
 * ── SỬA TẠI CHỖ so với bản đội QA giao (áp lại khi họ ra bản mới) ───────────────────────────────────────
 * `--fps`: nhịp hình của bản MP4. Trước đây manifest luôn khai 30 vì lấy số đó từ `voice.cues.json`, nên
 * một bản render 60 fps đi kèm manifest nói 30. Nhịp này chỉ vào trường `fps`; mọi mốc thời gian vẫn tính
 * theo đồng hồ của bản thu. Có ffprobe thì số khai được đối chiếu với chính file MP4 và lệch là DỪNG, cùng
 * cách file này đang đối chiếu thời lượng — manifest không nói khác được với file nó đi kèm.
 *
 *   node qa-manifest.mjs --scene <id> --item <10.1> --captions yes|no --mp4 <file.mp4>
 *        [--root <video-studio>] [--title "…"] [--build 1] [--timing voice.cues.json] [--fps 60]
 *        [--video-dir <dir>] [--script kich-ban-goc.md] [--keep-frames] [--out manifest.json]
 *
 *   --root       the video-studio checkout (default: the working directory). Only needed with --scene,
 *                to resolve the recording and projects/<id>/kich-ban-goc.md
 *   --scene      video id under vinuni-lesson-video-ds/ui_kits/lesson-video/videos/ (or give --video-dir)
 *   --video-dir  the folder holding cues.js, for a repo laid out differently — works without --root
 *   --item       item id in the course outline ("1.1", "2.3", "M.2") — required, the platform keys on it
 *   --captions   yes = captions burned into this MP4 (QA builds should have them), no = --no-captions build
 *   --mp4        the rendered file; its duration is checked against the voice, and manifest.json goes next to it
 *   --timing     voice.cues.json (default: the `source` recorded in <video dir>/voice.js)
 *   --fps        nhịp hình của MP4 (render.mjs --fps). Bỏ trống = nhịp của bản thu, tức 30 như trước
 *   --script     kich-ban-goc.md to hash (default: <root>/projects/<id>/kich-ban-goc.md when it exists)
 *   --keep-frames  say so if this MP4 was rendered with --keep-frames: the platform refuses such builds
 *
 * Exits 1 without writing anything when cues.js and the recording disagree (stale voice) or a required
 * field is missing. Quiz problems are warnings: the platform accepts a video with no quiz.
 */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildQaManifest } from './lib/qa-manifest.mjs';

const VIDEOS_UNDER_ROOT = 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next === undefined || next.startsWith('--')) args[argv[i].slice(2)] = true;
  else args[argv[i].slice(2)] = argv[++i];
}
const fail = (m) => {
  console.error(`✗ ${m}`);
  process.exit(1);
};
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

if (!args.scene && !args['video-dir']) fail('usage: node qa-manifest.mjs --scene <id> --item <1.1> --captions yes|no --mp4 <file.mp4> [--root <video-studio>]');
// The video repo: given, else the working directory. Only --scene and the kịch bản lookup need it.
const ROOT = path.resolve(typeof args.root === 'string' ? args.root : process.cwd());
if (args.scene && !fs.existsSync(path.join(ROOT, VIDEOS_UNDER_ROOT))) {
  fail(`không thấy ${VIDEOS_UNDER_ROOT} trong ${ROOT} — chạy lệnh trong repo video-studio, hoặc thêm --root <video-studio>, hoặc dùng --video-dir`);
}
const videoDir = path.resolve(args['video-dir'] || path.join(ROOT, VIDEOS_UNDER_ROOT, args.scene));
const id = args.scene || path.basename(videoDir);
const cuesFile = path.join(videoDir, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`không thấy ${cuesFile}`);
if (!args.item || args.item === true) fail('thiếu --item (mã item trong khung nội dung, vd 10.1)');
if (args.captions !== 'yes' && args.captions !== 'no') fail('thiếu --captions yes|no (MP4 này có phụ đề in cứng không?)');

// Timing: explicit --timing, else the recording voice.js was bound from.
let timingFile = args.timing && path.resolve(args.timing);
if (!timingFile) {
  const voiceFile = path.join(videoDir, 'voice.js');
  if (!fs.existsSync(voiceFile)) fail(`${videoDir} chưa gắn giọng (không có voice.js) — truyền --timing <voice.cues.json>`);
  const { VOICE } = await import(pathToFileURL(voiceFile).href);
  if (!VOICE?.source) fail('voice.js không ghi `source` — truyền --timing <voice.cues.json>');
  // `source` is written relative to the repo root: try --root, then each folder above the video.
  const bases = [ROOT];
  for (let dir = videoDir; path.dirname(dir) !== dir; dir = path.dirname(dir)) bases.push(dir);
  timingFile = bases.map((base) => path.resolve(base, VOICE.source)).find((file) => fs.existsSync(file))
    ?? path.resolve(ROOT, VOICE.source);
}
if (!fs.existsSync(timingFile)) fail(`không thấy ${timingFile}`);
const timing = JSON.parse(fs.readFileSync(timingFile, 'utf8'));

const mod = await import(pathToFileURL(cuesFile).href);
const scriptFile = args.script ? path.resolve(args.script) : path.join(ROOT, 'projects', id, 'kich-ban-goc.md');

const { manifest, errors, warnings, questions } = buildQaManifest({
  cues: mod.CUES || [],
  sections: mod.SECTIONS || [],
  timing,
  meta: {
    item_id: args.item,
    title: typeof args.title === 'string' ? args.title : '',
    build_no: args.build ? Number(args.build) : 1,
    script_hash: fs.existsSync(scriptFile) ? sha256(scriptFile) : null,
    cues_hash: sha256(cuesFile),
    captions_burned: args.captions === 'yes',
    keep_frames: Boolean(args['keep-frames']),
    render_fps: args.fps === undefined ? undefined : Number(args.fps),
  },
});
if (errors.length) fail(`không ghi manifest:\n  - ${errors.join('\n  - ')}`);
if (!manifest.title) warnings.push('chưa có --title: platform sẽ hiện trống tên video');
if (!manifest.script_hash) warnings.push(`không thấy kịch bản gốc (${path.relative(ROOT, scriptFile)}) nên script_hash = null`);

// The MP4 must be the render of this timing: compare durations when ffprobe is available. The frame rate is
// checked the same way — a manifest that names a rate the file does not have is the one thing nobody can see
// by watching the video, so it must not be possible to write it.
let mp4 = null;
if (typeof args.mp4 === 'string') {
  mp4 = path.resolve(args.mp4);
  if (!fs.existsSync(mp4)) fail(`không thấy ${mp4}`);
  try {
    const probed = Number(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { encoding: 'utf8' }).trim(),
    );
    if (Math.abs(probed - manifest.duration_sec) > 0.5) {
      fail(`MP4 dài ${probed.toFixed(3)}s nhưng giọng dài ${manifest.duration_sec}s — MP4 này không render từ bản thu này`);
    }
    // r_frame_rate là một phân số ("60/1"), không phải số thập phân.
    const rate = execFileSync(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', mp4],
      { encoding: 'utf8' },
    ).trim();
    const [num, den] = rate.split('/');
    const probedFps = Number(num) / (den === undefined || Number(den) === 0 ? 1 : Number(den));
    if (Number.isFinite(probedFps) && Math.abs(probedFps - manifest.fps) > 0.01) {
      fail(
        `MP4 chạy ${probedFps} fps nhưng manifest khai ${manifest.fps} fps — ` +
          `truyền --fps ${Math.round(probedFps)} cho đúng bản dựng này`,
      );
    }
  } catch (error) {
    if (error?.code === 'ENOENT') warnings.push('không có ffprobe nên chưa đối chiếu thời lượng và nhịp hình của MP4');
    else throw error;
  }
} else {
  warnings.push('chưa có --mp4 nên chưa đối chiếu thời lượng và nhịp hình MP4');
}

const out = path.resolve(typeof args.out === 'string' ? args.out : path.join(mp4 ? path.dirname(mp4) : path.join(ROOT, 'projects', id, 'render'), 'manifest.json'));
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(manifest, null, 2)}\n`);

const answerStart = questions.length ? manifest.cues.find((c) => c.n === questions[0].a_cue_n).start_sec : null;
console.log(`✓ ${path.relative(process.cwd(), out)}`);
console.log(`  item ${manifest.item_id} · bản ${manifest.build_no} · ${manifest.cues.length} câu · ${manifest.chapters.length} chương · ${manifest.duration_sec}s · ${manifest.fps} fps`);
console.log(`  quiz: ${questions.length} bộ${answerStart !== null ? ` · player dừng ở ${answerStart}s` : ''}`);
for (const q of questions) console.log(`    câu ${q.q_cue_n} → đáp án câu ${q.a_cue_n}: ${q.q.slice(0, 70)}${q.q.length > 70 ? '…' : ''}`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
