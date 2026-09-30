#!/usr/bin/env node
/**
 * Một lệnh ngắn cho mỗi stage TẤT ĐỊNH của video-anatomy.md §3, tự bọc `run-logged.mjs` — agent chỉ
 * cần nhớ `--video <id>`, không phải chép lại chuỗi lệnh dài (audit process #4, "Mỗi stage là chuỗi
 * lệnh dài agent tự gõ + tự nhớ bọc run-logged.mjs").
 *
 *   node tools/stage.mjs build      --video <id> [--dry-run]
 *   node tools/stage.mjs verify     --video <id> [--dry-run]
 *   node tools/stage.mjs shoot      --video <id> [--jobs <file>] [--dry-run]
 *   node tools/stage.mjs sfx        --video <id> [--out <file>] [--db <n>] [--dry-run]
 *   node tools/stage.mjs render     --video <id> [--audio <file>] [--out <file>] [--base <url>] [--dry-run]
 *   node tools/stage.mjs transcript --video <id> --day <label> [--dry-run]
 *   node tools/stage.mjs qa         --video <id> [--dry-run] [-- <cờ riêng của qa.mjs>]
  node tools/stage.mjs serve      [--status | --stop] [--port 8765]
 *
 * Dùng qua `npm run stage:<tên> -- --video <id>` (package.json).
 *
 * CHỈ gồm stage tất định — cues/scenes/deliver là stage agent tự viết, không có lệnh shell cố định,
 * vẫn dùng `node tools/video-workflow.mjs run start/finish` (xem SKILL.md "Ledger — CLI mode").
 *
 * `--dry-run` in đúng lệnh SẼ chạy (đã bọc run-logged.mjs) mà KHÔNG chạy — dùng để kiểm trước khi
 * tiêu thời gian/credit, hoặc khi không có quyền tự chạy build/verify/render (vd lane không giữ
 * `tools/verify.mjs`).
 *
 * `render` chọn audio TỰ ĐỘNG (Thái nghiệm thu 21/09, sửa lỗi âm thầm mất SFX):
 *   - có `projects/<id>/voice-sfx.wav` MỚI HƠN `voice/out/<id>/voice.wav`  → dùng voice-sfx.wav
 *   - có nhưng CŨ HƠN voice.wav (voice đổi sau lần trộn SFX cuối)          → DỪNG, exit 2, bảo chạy lại sfx-mix
 *   - không có voice-sfx.wav                                              → dùng voice.wav, in rõ "không có SFX"
 *   `--audio <file>` ép tay, bỏ qua mọi suy luận ở trên.
 *
 * `npm run serve` (cổng 8765) phải đang chạy sẵn cho shoot/render — stage.mjs không tự khởi nó.
 */
import fs from 'node:fs';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pickRenderAudio } from './lib/render-audio.mjs';
import { quizTrackArgs } from './lib/quiz-track.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (message) => {
  console.error(`✗ ${message}`);
  process.exit(2);
};

const STAGES = ['build', 'verify', 'shoot', 'sfx', 'render', 'transcript', 'qa'];
/** `serve` không phải stage của một video: nó quản SERVER dùng chung, nên không đi qua ledger. */
const SERVICES = ['serve'];

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || !argv.length) {
  console.log(`Usage:
  node tools/stage.mjs build      --video <id> [--dry-run]
  node tools/stage.mjs verify     --video <id> [--dry-run]
  node tools/stage.mjs shoot      --video <id> [--jobs <file>] [--dry-run]
  node tools/stage.mjs sfx        --video <id> [--out <file>] [--db <n>] [--dry-run]
  node tools/stage.mjs render     --video <id> [--audio <file>] [--out <file>] [--base <url>] [--dry-run]
  node tools/stage.mjs transcript --video <id> --day <label> [--dry-run]
  node tools/stage.mjs qa         --video <id> [--dry-run] [-- <cờ riêng của qa.mjs>]
  node tools/stage.mjs serve      [--status | --stop] [--port 8765]

Stage tất định (styles/poster.md): ${STAGES.join(', ')}. Stage tự viết (cues/scenes/deliver) dùng
\`video-workflow.mjs run start/finish\` trực tiếp — không có wrapper ở đây.
--dry-run in lệnh sẽ chạy (đã bọc run-logged.mjs) mà KHÔNG chạy.
render tự chọn voice-sfx.wav nếu có và mới hơn voice.wav; voice.wav MỚI HƠN voice-sfx.wav → exit 2.
serve: khởi server tĩnh CÓ PIDFILE (.studio/serve.pid) — hỏi \`--status\` trước khi mở cái thứ hai,
\`--stop\` để tắt. Ba lần ở lượt dựng trước phải nhắn nhau "ai đang giữ cổng 8765?".`);
  process.exit(argv.length ? 0 : 2);
}

const stage = argv[0];
if (![...STAGES, ...SERVICES].includes(stage)) fail(`stage "${stage}" không hợp lệ — một trong: ${[...STAGES, ...SERVICES].join(', ')}. Xem --help.`);
const rest = argv.slice(1);
const dryRun = rest.includes('--dry-run');
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : fallback;
};
/* ── `serve` — server tĩnh dùng chung, CÓ PIDFILE ────────────────────────────────────────────
 * Retro d05-v06 F3/F12: `npm run serve` chạy nền không để lại dấu vết, nên hai lane song song
 * không biết ai đang giữ cổng 8765; ba lần phải nhắn nhau "tắt giùm cái server". Pidfile biến câu
 * hỏi đó thành một lệnh. Pidfile nằm ở `.studio/serve.pid` (ngoài thư mục video — server là của
 * cả repo, không của một video).
 */
if (stage === 'serve') {
  const port = Number(flag('port', '8765'));
  const pidFile = path.join(REPO, '.studio', 'serve.pid');
  const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };
  const read = () => {
    if (!fs.existsSync(pidFile)) return null;
    try {
      const rec = JSON.parse(fs.readFileSync(pidFile, 'utf8'));
      return alive(rec.pid) ? rec : null;
    } catch { return null; }
  };

  if (rest.includes('--status')) {
    const rec = read();
    if (!rec) { console.log('· không có server nào do stage:serve giữ (pidfile trống hoặc tiến trình đã chết).'); process.exit(1); }
    console.log(`✓ server đang chạy: pid ${rec.pid} · cổng ${rec.port} · từ ${rec.at} · root ${rec.root}`);
    console.log(`  tắt: npm run stage:serve -- --stop`);
    process.exit(0);
  }
  if (rest.includes('--stop')) {
    const rec = read();
    if (!rec) { fs.rmSync(pidFile, { force: true }); console.log('· không có gì để tắt.'); process.exit(0); }
    try { process.kill(rec.pid); } catch { /* đã chết giữa hai lệnh */ }
    fs.rmSync(pidFile, { force: true });
    console.log(`✓ đã tắt server pid ${rec.pid} (cổng ${rec.port}).`);
    process.exit(0);
  }

  const running = read();
  if (running) {
    // KHÔNG mở cái thứ hai: cổng đã bận thì tiến trình mới chết ngay và lane lại tưởng mình sai.
    console.log(`· server đã chạy sẵn: pid ${running.pid} · cổng ${running.port} (từ ${running.at}) — dùng luôn, không mở thêm.`);
    process.exit(0);
  }
  const root = path.join(REPO, 'vinuni-lesson-video-ds');
  const args = ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', root];
  if (dryRun) { console.log(`python3 ${args.join(' ')}`); process.exit(0); }
  const child = spawn('python3', args, { cwd: REPO, detached: true, stdio: 'ignore' });
  child.unref();
  fs.mkdirSync(path.dirname(pidFile), { recursive: true });
  const at = (() => { try { return execFileSync('date', ['+%Y-%m-%dT%H:%M:%S%z'], { encoding: 'utf8' }).trim(); } catch { return new Date().toISOString(); } })();
  fs.writeFileSync(pidFile, `${JSON.stringify({ pid: child.pid, port, at, root: path.relative(REPO, root) }, null, 2)}\n`);
  console.log(`✓ server chạy nền: pid ${child.pid} · http://127.0.0.1:${port}/ · root ${path.relative(REPO, root)}`);
  console.log('  trạng thái: npm run stage:serve -- --status   ·   tắt: npm run stage:serve -- --stop');
  process.exit(0);
}

const videoId = flag('video');
if (!videoId) fail('thiếu --video <id>. Xem --help.');

/** Audio mặc định cho `render` — luật ở `tools/lib/render-audio.mjs` (một chỗ, test được). */
function resolveRenderAudio(videoId) {
  const { audio, stale, note } = pickRenderAudio(videoId, REPO);
  if (stale) fail(note);
  console.error(`\u2139 ${note}`);
  return audio;
}

function buildCommands() {
  if (stage === 'build') return [['node', 'tools/build.mjs']];
  // `verify --video` thuộc PR upstream riêng; cho tới khi PR đó merge, stage dùng full-repo gate.
  if (stage === 'verify') return [['node', 'tools/verify.mjs']];
  if (stage === 'shoot') {
    const jobs = flag('jobs', `projects/${videoId}/qa/jobs.json`);
    return [['node', 'tools/scene-gate.mjs', '--video', videoId, '--jobs', jobs]];
  }
  if (stage === 'sfx') {
    const out = flag('out', `projects/${videoId}/voice-sfx.wav`);
    const db = flag('db');
    return [['node', 'tools/sfx-mix.mjs', '--video', videoId, '--out', out, ...(db ? ['--db', db] : [])]];
  }
  if (stage === 'render') {
    const audio = flag('audio') || resolveRenderAudio(videoId);
    const base = flag('base', 'http://127.0.0.1:8765');
    const explicitOut = flag('out');
    const out = explicitOut || `projects/${videoId}/render/${videoId}.mp4`;
    /*
     * Nhạc quiz: `render.mjs` biết CHỖ đặt nhạc (cue `quiz: true`) nhưng không biết TRACK nào —
     * track chỉ vào được qua cờ. Thiếu cờ thì ba khoảng chờ quiz câm mà không gate nào đỏ, nên
     * ở đây thiếu khai báo là DỪNG, không phải cảnh báo. Video không có quiz: lệnh y nguyên.
     */
    const quiz = quizTrackArgs(videoId, REPO);
    if (quiz.problem) fail(quiz.problem);
    if (quiz.args.length) console.error(`ℹ ${quiz.note}`);
    return [['node', 'tools/render.mjs', '--scene', videoId, '--audio', audio, '--out', out, '--base', base, ...quiz.args]];
  }
  if (stage === 'transcript') {
    const day = flag('day');
    if (!day) fail('stage transcript cần --day <label> (vd. Day05, demo) — xem transcripts/ hiện có.');
    return [['node', 'tools/transcript.mjs', `voice/out/${videoId}/voice.cues.json`, `transcripts/${day}/${videoId}.txt`]];
  }
  // stage === 'qa'
  const sep = rest.indexOf('--');
  const extra = sep >= 0 ? rest.slice(sep + 1) : [];
  return [['node', 'tools/qa.mjs', '--video', videoId, ...extra]];
}

// Mỗi lệnh con là MỘT lượt ledger riêng.
const commands = buildCommands();
const wrapped = commands.map((c) => ['node', 'tools/run-logged.mjs', stage, '--video', videoId, '--', ...c]);

if (dryRun) {
  for (const w of wrapped) console.log(w.join(' '));
  process.exit(0);
}

for (const w of wrapped) {
  const [bin, ...args] = w;
  const result = spawnSync(bin, args, { cwd: REPO, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
process.exit(0);
