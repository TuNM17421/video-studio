#!/usr/bin/env node
/**
 * Sinh lại MỘT câu bằng model local, chọn bản tốt, thay vào thư mục giọng — không đụng tới câu nào khác.
 *
 *   node tools/voice-retake.mjs --cues <video dir>/cues.js --dir <thư mục audio> --n <câu> [--takes 3]
 *        [--voice <id|tên>] [--speaker "Tú=<giọng>"]… [--model small] [--json]
 *   node tools/voice-retake.mjs --cues … --dir … --n <câu> --pick <t1|t2|…|orig|prev> [--json]
 *
 *   --dir     thư mục 01.wav, 02.wav… đang nhập (model local hoặc Kaggle tải về)
 *   --takes   số bản sinh thêm (mặc định 3, tối đa 6)
 *   --voice / --speaker  đúng dàn vai đã dùng khi sinh cả video (Studio lấy từ bản ghi lúc sinh)
 *   --pick    không sinh gì: đặt một bản trong danh sách (bản mới, bản gốc, hay bản đang dùng trước lượt
 *             sinh lại gần nhất) vào thư mục — người dùng nghe rồi tự chọn
 *
 * Vì sao cả câu chứ không vá từng từ: mỗi câu là một đoạn riêng, nối với câu kề bằng khoảng lặng
 * (tools/lib/voice-audio.mjs), nên thay nguyên câu không để lại vết cắt nào. OmniVoice không có seed,
 * mỗi lần chạy ra một bản khác — sinh vài bản rồi chọn là cách sửa rẻ và tự nhiên nhất.
 *
 * Chọn bằng đúng phép soát của bảng đối chiếu (judgeHeard + durationFlag trong tools/lib/voice-align.mjs).
 * Chỉ tự thay khi bản ĐANG DÙNG không qua phép soát, và chỉ bằng một bản qua được — không có chuyện lấy
 * "bản đỡ tệ nhất". Bản đang dùng vẫn đạt (người dùng sinh lại vì nghe thấy điều Whisper không bắt được)
 * thì chỉ liệt kê các bản mới cho người dùng nghe và chọn (--pick).
 *
 * Mỗi thư mục giọng có chỗ riêng: projects/<id>/voice-script/retake/<omnivoice|kaggle|mã thư mục>/<câu>/
 *   orig.<đuôi>   bản thư mục có trước lần sinh lại đầu tiên — lúc nào cũng trả lại được
 *   prev.<đuôi>   bản đang dùng ngay trước lượt sinh lại gần nhất (khi đó là một bản đã thay vào)
 *   <câu>_tK.wav  các bản của lượt gần nhất
 *   retake.json   kết quả chấm + vân tay; ghi nguyên tử
 * Một lượt sinh vào next/ trước; chỉ khi sinh và chấm xong mới thay các bản cũ. Hỏng hay bị dừng giữa chừng
 * thì danh sách cũ còn nguyên.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { durationFlag, judgeHeard, SETUP_HINT, transcribe, venvPython } from './lib/voice-align.mjs';
import { cueKey, isAudioFile, matchAudioFolder } from './lib/voice-files.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i < 0 || !argv[i + 1] || argv[i + 1].startsWith('--') ? fallback : argv[i + 1];
};
const values = (name) => argv.flatMap((a, i) => (a === `--${name}` && argv[i + 1] && !argv[i + 1].startsWith('--') ? [argv[i + 1]] : []));
const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const note = (m) => console.error(`  ${m}`);

const cuesFile = value('cues', null);
const dirArg = value('dir', null);
const n = Number(value('n', NaN));
if (!cuesFile || !dirArg || !Number.isInteger(n)) fail('usage: node tools/voice-retake.mjs --cues <video dir>/cues.js --dir <thư mục audio> --n <câu> [--takes 3] [--pick t1|orig|prev]');
if (!fs.existsSync(cuesFile)) fail(`Không thấy ${cuesFile}.`);
const dir = path.resolve(dirArg);
if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) fail(`Không thấy thư mục ${dir}.`);
const takes = Number(value('takes', 3));
if (!Number.isInteger(takes) || takes < 1 || takes > 6) fail(`--takes phải từ 1 tới 6 (nhận được "${value('takes', '')}").`);
const pick = value('pick', null);
if (flag('pick') && !/^(t\d{1,2}|orig|prev)$/.test(pick ?? '')) fail(`--pick nhận t1, t2…, orig hoặc prev (nhận được "${pick ?? ''}").`);

const { CUES = [] } = await import(`${pathToFileURL(path.resolve(cuesFile)).href}?t=${Date.now()}`);
const cues = CUES.map((c, i) => ({ ...c, n: c.n ?? i + 1 }));
const cue = cues.find((c) => c.n === n);
if (!cue || cue.silent || !String(cue.text || '').trim()) fail(`Câu ${n} không có lời để đọc.`);
const text = String(cue.text).trim();
const key = cueKey(cues);
const id = path.basename(path.dirname(path.resolve(cuesFile)));

const relRoot = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const sameDir = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b);
/** Each import folder keeps its own originals: the local folder and the Kaggle folder hold different audio. */
function folderTag(folder) {
  const script = path.join(ROOT, 'projects', id, 'voice-script');
  if (sameDir(folder, path.join(script, 'omnivoice'))) return 'omnivoice';
  if (sameDir(folder, path.join(script, 'kaggle', 'out'))) return 'kaggle';
  return crypto.createHash('sha256').update(process.platform === 'win32' ? folder.toLowerCase() : folder).digest('hex').slice(0, 12);
}
const work = path.join(ROOT, 'projects', id, 'voice-script', 'retake', folderTag(dir), key(n));
const stateFile = path.join(work, 'retake.json');
fs.mkdirSync(work, { recursive: true });

const sha = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
/** Saved state, or null when there is none; a broken file is an error, never silently "no state". */
function readState() {
  if (!fs.existsSync(stateFile)) return null;
  try { return JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch { return { broken: true }; }
}
/** Write through a temp file: Studio's Dừng kills the process tree, and a half-written state loses the way back. */
function writeState(state) {
  fs.writeFileSync(`${stateFile}.tmp`, `${JSON.stringify(state, null, 2)}\n`);
  fs.renameSync(`${stateFile}.tmp`, stateFile);
}

/** The file that holds câu n in the folder now (the import's own matching rules), or null. */
function currentFile() {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isFile() && isAudioFile(d.name)).map((d) => d.name).sort();
  const name = matchAudioFolder(entries, cues, key).byCue.get(n);
  return name ? path.join(dir, name) : null;
}
const saved = (stem) => fs.readdirSync(work).map((f) => path.join(work, f)).find((f) => new RegExp(`^${stem}\\.[a-z0-9]+$`, 'i').test(path.basename(f))) ?? null;
const takeFiles = () => fs.readdirSync(work).filter((f) => new RegExp(`^${key(n)}_t\\d+\\.wav$`).test(f)).map((f) => path.join(work, f));
const takeName = (file) => path.basename(file).match(/_(t\d+)\.wav$/)[1];
function keepAs(stem, source) {
  for (const f of fs.readdirSync(work)) if (new RegExp(`^${stem}\\.`, 'i').test(f)) fs.rmSync(path.join(work, f), { force: true });
  const target = path.join(work, `${stem}${path.extname(source).toLowerCase()}`);
  fs.copyFileSync(source, target);
  return target;
}

/** Which take the folder holds now, by content: 'orig', 'prev', a take name, or 'other'. */
function inUseNow() {
  const current = currentFile();
  if (!current) return 'none';
  const hash = sha(current);
  for (const [name, file] of [['orig', saved('orig')], ['prev', saved('prev')], ...takeFiles().map((f) => [takeName(f), f])]) {
    if (file && sha(file) === hash) return name;
  }
  return 'other';
}

/**
 * Before touching anything: make sure the take the folder had first is kept as orig, and the take in use
 * now survives the new run. Never overwrite orig on a guess — only when the saved state proves the folder
 * holds a genuinely new original (the whole video was generated again) does orig change.
 */
function prepare() {
  const state = readState();
  if (state && !state.broken && state.dir && !sameDir(path.resolve(ROOT, state.dir), dir)) {
    fail(`Chỗ lưu ${relRoot(work)} là của thư mục ${state.dir}, không phải ${relRoot(dir)}.`);
  }
  const current = currentFile();
  const orig = saved('orig');
  if (!current) return;
  if (!orig) { keepAs('orig', current); return; }
  const hash = sha(current);
  if (hash === sha(orig)) return;
  const known = [saved('prev'), ...takeFiles()].filter(Boolean).some((f) => sha(f) === hash);
  if (known || !state || state.broken) {
    // A take we placed (or, with no readable state, something we cannot vouch for): keep it, keep orig.
    keepAs('prev', current);
    return;
  }
  // The state is readable and knows nothing of this file: the folder was regenerated since. New original.
  for (const f of [saved('prev'), ...takeFiles()]) if (f) fs.rmSync(f, { force: true });
  keepAs('orig', current);
}

/** Put `source` into the folder as câu n (<key>.<ext>), replacing whatever file held câu n. */
function place(source) {
  const target = path.join(dir, `${key(n)}${path.extname(source).toLowerCase()}`);
  const current = currentFile();
  if (current && path.resolve(current) !== path.resolve(target)) fs.rmSync(current, { force: true });
  fs.copyFileSync(source, target);
}

// ── --pick: the user listened and chose ───────────────────────────────────────
if (flag('pick')) {
  const state = readState();
  if (!state || state.broken) fail(`Chưa có lần sinh lại nào đọc được cho câu ${n} — sinh lại câu này trước.`);
  if (state.dir && !sameDir(path.resolve(ROOT, state.dir), dir)) fail(`Chỗ lưu ${relRoot(work)} là của thư mục ${state.dir}, không phải ${relRoot(dir)}.`);
  const listed = [...(state.takes || []), state.original, state.previous].filter(Boolean).map((t) => t.name);
  if (!listed.includes(pick)) fail(`Bản ${pick} không có trong lần sinh lại gần nhất của câu ${n}.`);
  // Every take the folder can hold at this point is in the list, so picking loses nothing — unless the folder
  // changed since (the whole video was generated again): then the list no longer describes it.
  if (inUseNow() === 'other') fail(`Tệp của câu ${n} đã đổi kể từ lần sinh lại gần nhất (có thể vừa sinh lại cả video). Sinh lại câu này trước.`);
  const source = pick === 'orig' || pick === 'prev' ? saved(pick) : path.join(work, `${key(n)}_${pick}.wav`);
  if (!source || !fs.existsSync(source)) fail(`Không còn tệp của bản ${pick} — sinh lại câu này trước.`);
  place(source);
  const result = { ...state, chosen: pick, replaced: true, decision: 'picked', inUse: inUseNow(), at: new Date().toISOString() };
  writeState(result);
  if (flag('json')) console.log(JSON.stringify(result));
  else console.log(`✓ Câu ${n}: đang dùng ${pick === 'orig' ? 'bản gốc' : pick === 'prev' ? 'bản trước' : `bản ${pick}`}.`);
  process.exit(0);
}

// ── generate k takes of câu n ────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG || (() => { try { const b = require('ffmpeg-static'); if (b && fs.existsSync(b)) return b; } catch {} return 'ffmpeg'; })();
// Both checks before the GPU runs: a take that cannot be measured or heard can never be judged.
if (spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status !== 0) fail(`không tìm thấy ffmpeg (${FFMPEG}) — chạy \`npm install\` ở gốc repo hoặc đặt FFMPEG=/đường/dẫn/ffmpeg`);
if (!venvPython()) fail(`${SETUP_HINT}\n  (bước sinh lại nghe từng bản bằng Whisper để chọn)`);
prepare();

const next = path.join(work, 'next');
fs.rmSync(next, { recursive: true, force: true });
fs.mkdirSync(next, { recursive: true });
const abandon = () => fs.rmSync(next, { recursive: true, force: true });
process.once('exit', (code) => { if (code !== 0) abandon(); });

const cast = [
  ...(value('voice', null) ? ['--voice', value('voice', null)] : []),
  ...values('speaker').flatMap((s) => ['--speaker', s]),
];
note(`Sinh ${takes} bản của câu ${n}…`);
let generated = '';
const code = await new Promise((resolve) => {
  // Same working directory as this process: a relative --cues or --speaker "Tú=./mau.wav" must mean the same file.
  const child = spawn(process.execPath, [path.join(ROOT, 'tools/omnivoice-generate.mjs'), '--cues', path.resolve(cuesFile), ...cast, '--only', String(n), '--takes', String(takes), '--out', next, '--json'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const forward = (sig) => { try { child.kill(sig); } catch {} };
  process.once('SIGINT', () => forward('SIGINT'));
  process.once('SIGTERM', () => forward('SIGTERM'));
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (d) => { generated += d; });
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (d) => process.stderr.write(d));
  child.on('error', () => resolve(1));
  child.on('close', (c) => resolve(c ?? 1));
});
if (code !== 0) fail('Sinh lại câu này thất bại — xem nhật ký phía trên. Các bản của lần trước vẫn còn nguyên.');
let made;
try { made = JSON.parse(generated.trim().split('\n').pop()); } catch { fail('omnivoice-generate.mjs trả về dữ liệu không đọc được.'); }

// ── listen to every new take, and to what the folder has ─────────────────────
/** Length in seconds, decoded the way the import decodes (mono 24 kHz 16-bit); null when unreadable. */
function seconds(file) {
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '24000', '-f', 's16le', '-'], { maxBuffer: 256 * 1024 * 1024 });
  return res.status === 0 && res.stdout?.length ? +(res.stdout.length / 2 / 24000).toFixed(2) : null;
}
const fresh = made.takes.map((f) => ({ name: f.match(/_(t\d+)\.wav$/)[1], file: path.join(next, f) }));
const kept = [['orig', saved('orig')], ['prev', saved('prev')]].filter(([, f]) => f).map(([name, file]) => ({ name, file }));
const all = [...kept, ...fresh];
note(`Nghe lại ${all.length} bản bằng Whisper…`);
const heard = await transcribe(all.map((c) => ({ key: c.name, file: c.file })), { model: value('model', process.env.VOICE_ALIGN_MODEL || 'small'), onLine: note });
if (!heard.ok) fail(`${heard.error} Các bản của lần trước vẫn còn nguyên.`);

/** `file` is where the take lives now — a new take has just been moved out of next/. */
function judge(c, file) {
  const s = seconds(file);
  const h = heard.heard.get(c.name);
  const base = { name: c.name, file: relRoot(file), seconds: s };
  if (!h) return { ...base, matchRatio: null, heardText: null, issues: [], level: 'warn', duration: null, pass: false };
  const { matchRatio, issues, level } = judgeHeard(text, h.words);
  // A length that cannot be measured is a failed check, not a skipped one.
  const duration = s == null ? 'unmeasured' : durationFlag(text, s);
  return { ...base, matchRatio, heardText: h.text, issues, level, duration, pass: level === 'ok' && !duration };
}

// Only now replace the previous run's takes: the new ones are generated and judged.
for (const f of takeFiles()) fs.rmSync(f, { force: true });
const judged = all.map((c) => {
  if (c.file.startsWith(next + path.sep)) {
    const target = path.join(work, path.basename(c.file));
    fs.renameSync(c.file, target);
    return judge(c, target);
  }
  return judge(c, c.file);
});
abandon();

const byName = Object.fromEntries(judged.map((t) => [t.name, t]));
const inUseBefore = inUseNow();
const current = byName[inUseBefore === 'orig' || inUseBefore === 'prev' ? inUseBefore : ''] ?? null;
const newTakes = judged.filter((t) => /^t\d+$/.test(t.name));
// Best take that passes: most of the câu heard, then the length closest to what the folder has now (so the
// scene timing moves as little as possible).
const ref = current?.seconds ?? null;
const best = newTakes
  .filter((t) => t.pass)
  .sort((a, b) => (b.matchRatio - a.matchRatio) || (ref == null || a.seconds == null || b.seconds == null ? 0 : Math.abs(a.seconds - ref) - Math.abs(b.seconds - ref)))[0] ?? null;
// Replace only a take that fails the checks. A passing one stays: the user hears the new takes and decides.
const currentPasses = Boolean(current?.pass);
if (best && !currentPasses) place(path.join(ROOT, best.file));

const result = {
  n, key: key(n), dir: relRoot(dir), text,
  takes: newTakes,
  original: byName.orig ?? null,
  previous: byName.prev ?? null,
  chosen: best && !currentPasses ? best.name : null,
  replaced: Boolean(best && !currentPasses),
  decision: best && !currentPasses ? 'replaced' : currentPasses ? 'kept-passing' : 'none-passed',
  inUse: inUseNow(),
  at: new Date().toISOString(),
};
writeState(result);

if (flag('json')) console.log(JSON.stringify(result));
else {
  const label = (name) => (name === 'orig' ? 'bản gốc' : name === 'prev' ? 'bản trước' : `bản ${name}`);
  for (const t of judged) {
    const why = t.pass ? 'đạt' : [t.level === 'error' ? 'không khớp lời' : null, t.matchRatio != null && t.level === 'warn' && !t.issues.length ? 'chỉ khớp một phần' : null, ...t.issues.map((i) => i.code), t.duration].filter(Boolean).join(', ') || 'Whisper không nghe được';
    console.log(`${t.name === result.inUse ? '✓' : '·'} ${label(t.name)} · ${t.seconds ?? '—'}s · khớp ${t.matchRatio == null ? '—' : `${Math.round(t.matchRatio * 100)}%`} · ${why}`);
  }
  console.log({
    replaced: `\n✓ Câu ${n}: đã thay bằng bản ${result.chosen}.`,
    'kept-passing': `\n· Câu ${n}: bản đang dùng vẫn đạt — giữ nguyên. Nghe các bản mới rồi chọn bằng --pick nếu muốn đổi.`,
    'none-passed': `\n! Câu ${n}: không bản nào đạt — giữ nguyên. Nghe rồi chọn bằng --pick <t1|…|orig>.`,
  }[result.decision]);
}
