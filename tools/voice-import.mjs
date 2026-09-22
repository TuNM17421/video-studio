#!/usr/bin/env node
/**
 * Import a narration recorded or generated outside this repo — one audio file per câu — and turn it into
 * the same two files the ElevenLabs path produces, so everything downstream is unchanged:
 *
 *   voice/out/<id>/voice.wav          one continuous master, every câu on a frame boundary
 *   voice/out/<id>/voice.cues.json    per-câu frames, speech length and word timestamps
 *   voice/out/<id>/align-report.json  how well each file matched its câu (see docs/decisions/voice-align.md)
 *
 *   node tools/voice-import.mjs --cues <video dir>/cues.js --from <audio folder> [options]
 *
 *   --from <dir>     folder of 01.wav, 02.wav … (see tools/voice-export.mjs for the reading script)
 *   --out <dir>      default voice/out/<name of the cues folder>
 *   --scan           check the folder and print the report; write nothing
 *   --json           machine-readable output (Video Studio reads this)
 *   --pause <s>      silence after each câu (default 1.4, a câu's own pauseAfter wins)
 *   --model <name>   Whisper model for the word timestamps (default small)
 *   --no-align       skip Whisper: no word timestamps and no wrong-file check. Degraded, see the doc.
 *   --force          import despite blocking problems (a câu whose audio does not match its text)
 *
 * The file-name convention (01.wav = câu 1) and the lenient matching that reads it live in
 * tools/lib/voice-files.mjs, shared with tools/voice-export.mjs so the two cannot drift apart. The
 * report always shows which file went to which câu, because a folder that is silently off by one is
 * the one mistake that survives all the way to the MP4.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemble, FPS, sha256 } from './lib/voice-audio.mjs';
import { cueKey, isAudioFile, matchAudioFolder } from './lib/voice-files.mjs';
import { mapWords, runAlign, SETUP_HINT, venvPython } from './lib/voice-align.mjs';
import { castSpeaker } from './lib/voices.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_RATE = 24000;
/** A câu whose transcript matches this little is almost certainly the wrong file. */
const MATCH_BLOCK = 0.4;
const MATCH_WARN = 0.65;
/** Measured speech this far off the 3 syllables/s estimate is worth a second look. */
const SHORT = 0.45;
const LONG = 2.2;

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const argv = process.argv.slice(2);
const VALUE_FLAGS = new Set(['cues', 'from', 'out', 'pause', 'model']);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
if (!flags.cues) fail('--cues <video dir>/cues.js là bắt buộc');
if (!flags.from) fail('--from <thư mục audio> là bắt buộc');

const cuesFile = path.resolve(flags.cues);
if (!fs.existsSync(cuesFile)) fail(`không có ${cuesFile}`);
const fromDir = path.resolve(flags.from);
if (!fs.existsSync(fromDir) || !fs.statSync(fromDir).isDirectory()) fail(`không có thư mục ${fromDir}`);
const id = path.basename(path.dirname(cuesFile));
const outDir = path.resolve(flags.out || path.join(ROOT, 'voice/out', id));
const pause = Number(flags.pause ?? 1.4);
const model = flags.model || process.env.VOICE_ALIGN_MODEL || 'small';
const align = !flags['no-align'];

// ── cues ─────────────────────────────────────────────────────────────────────
const mod = await import(`${pathToFileURL(cuesFile).href}?t=${Date.now()}`);
const CUES = (mod.CUES || []).map((c, i) => ({
  n: c.n ?? i + 1,
  text: (c.text || '').trim(),
  silent: c.silent || 0,
  pauseAfter: c.pauseAfter,
  speaker: String(c.speaker || '').trim(),
  authoredFrames: c.end != null ? c.end - c.start : null,
}));
if (!CUES.length) fail(`${cuesFile} không export CUES`);

/**
 * Ai nói câu nào. Thẻ hội thoại lấy avatar, phía và màu từ voice.cues.json chứ không từ danh sách viết
 * tay trong cảnh, và bản ElevenLabs ghi sẵn những thứ đó — giọng nhập vào phải ghi y hệt, nếu không thì
 * cùng một kịch bản hội thoại lại mất mặt nhân vật chỉ vì đổi nguồn giọng (tự thu hay model local).
 *
 * Tên lạ không dừng cả lượt quét: nó thành lỗi của đúng những câu mang tên đó, hiện ngay trong bảng
 * ghép cùng với các vấn đề khác — sửa một lần rồi quét lại, thay vì mỗi lần chỉ thấy một lỗi.
 */
const CAST = new Map();
for (const c of CUES) {
  if (!c.speaker || CAST.has(c.speaker)) continue;
  try {
    CAST.set(c.speaker, { who: castSpeaker(c.speaker) });
  } catch (error) {
    CAST.set(c.speaker, { error: error instanceof Error ? error.message : String(error) });
  }
}
const key = cueKey(CUES);
const syllables = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const secs = (v) => `${v.toFixed(1).replace('.', ',')}s`;
const expectedSeconds = (c) => (c.silent ? Number(c.silent) : syllables(c.text) / 3);

// ── which file belongs to which câu ──────────────────────────────────────────
const entries = fs.readdirSync(fromDir, { withFileTypes: true })
  .filter((d) => d.isFile() && isAudioFile(d.name))
  .map((d) => d.name)
  .sort();
const { byCue, extra, clashes } = matchAudioFolder(entries, CUES, key);

// ── audio ────────────────────────────────────────────────────────────────────
const require = createRequire(import.meta.url);
const FFMPEG = process.env.FFMPEG || (() => {
  try { const b = require('ffmpeg-static'); if (b && fs.existsSync(b)) return b; } catch {}
  return 'ffmpeg';
})();
if (spawnSync(FFMPEG, ['-version'], { stdio: 'ignore' }).status !== 0) {
  fail(`không tìm thấy ffmpeg (${FFMPEG}) — chạy \`npm install\` ở gốc repo hoặc đặt FFMPEG=/đường/dẫn/ffmpeg`);
}
const CACHE = path.join(ROOT, 'voice/cache');
const fileSha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

/** Decode to the master's format (16-bit mono 24 kHz), cached by the source file's content hash. */
function decode(file, hash) {
  const cached = path.join(CACHE, 'pcm', `${hash}.pcm`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), '-f', 's16le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout?.length) throw new Error(String(res.stderr || '').trim().split('\n').pop() || 'ffmpeg không đọc được tệp');
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  fs.writeFileSync(cached, res.stdout);
  return res.stdout;
}

// ── build the report ─────────────────────────────────────────────────────────
const rows = [];
const missing = [];
for (const c of CUES) {
  const file = byCue.get(c.n);
  const row = { n: c.n, key: key(c.n), file: file || null, silent: Boolean(c.silent), text: c.text, expectedSeconds: +expectedSeconds(c).toFixed(1), level: 'ok', notes: [] };
  rows.push(row);
  if (c.silent) { row.level = 'ok'; row.notes.push(`khoảng dừng ${c.silent}s, không cần file`); continue; }
  const cast = c.speaker ? CAST.get(c.speaker) : null;
  if (cast?.error) { row.level = 'error'; row.notes.push(cast.error.split('\n')[0]); }
  else if (cast?.who) row.speaker = cast.who.name;
  if (!file) { row.level = 'error'; row.notes.push('thiếu file audio'); missing.push(c.n); continue; }
  if (path.basename(file, path.extname(file)) !== row.key) row.notes.push(`tên không theo quy ước ${row.key}${path.extname(file)}`);
  try {
    row.hash = fileSha(path.join(fromDir, file));
    const pcm = decode(path.join(fromDir, file), row.hash);
    c.pcm = pcm;
    row.seconds = +(pcm.length / 2 / SAMPLE_RATE).toFixed(2);
    const ratio = row.seconds / Math.max(0.5, row.expectedSeconds);
    if (ratio < SHORT) { row.level = 'warn'; row.notes.push(`ngắn bất thường (${secs(row.seconds)} so với ~${secs(row.expectedSeconds)})`); }
    else if (ratio > LONG) { row.level = 'warn'; row.notes.push(`dài bất thường (${secs(row.seconds)} so với ~${secs(row.expectedSeconds)})`); }
  } catch (e) {
    row.level = 'error';
    row.notes.push(`không giải mã được: ${e.message}`);
  }
}

// ── word timestamps + the wrong-file check ───────────────────────────────────
let alignInfo = { used: false, model: null, note: align ? null : '--no-align: không có mốc từng từ và không kiểm tra được file có đúng câu' };
const heardByCue = new Map();
if (align) {
  if (!venvPython()) fail(`${SETUP_HINT}\n  (hoặc chạy lại với --no-align để nhập tạm, chất lượng beat sẽ kém hơn)`);
  const todo = [];
  for (const row of rows) {
    if (row.silent || !row.hash || row.level === 'error') continue;
    const cached = path.join(CACHE, 'align', `${row.hash}-${model}.json`);
    if (fs.existsSync(cached)) { heardByCue.set(row.n, JSON.parse(fs.readFileSync(cached, 'utf8'))); continue; }
    todo.push({ n: row.n, wav: path.join(fromDir, row.file), cache: cached });
  }
  if (todo.length) {
    if (!flags.json) console.error(`· nhận diện ${todo.length}/${rows.filter((r) => !r.silent).length} câu bằng Whisper "${model}" (đã cache ${heardByCue.size})`);
    const res = await runAlign({ model, items: todo.map(({ n, wav }) => ({ n, wav })) }, { onLine: (l) => { if (!flags.json) console.error(`  ${l}`); } });
    if (!res.ok) fail(res.error);
    for (const item of res.result.items) {
      const job = todo.find((t) => t.n === item.n);
      if (!job || item.error) continue;
      fs.mkdirSync(path.dirname(job.cache), { recursive: true });
      fs.writeFileSync(job.cache, JSON.stringify(item));
      heardByCue.set(item.n, item);
    }
  }
  alignInfo = { used: true, model, note: null };
  for (const row of rows) {
    if (row.silent || row.level === 'error') continue;
    const heard = heardByCue.get(row.n);
    if (!heard) { row.level = row.level === 'ok' ? 'warn' : row.level; row.notes.push('không nhận diện được giọng, câu này sẽ không có mốc từng từ'); continue; }
    const { matchRatio, heard: heardCount } = mapWords(row.text, heard.words);
    row.matchRatio = matchRatio;
    row.heardWords = heardCount;
    row.heardText = heard.text;
    row.avgLogprob = heard.avgLogprob ?? null;
    if (matchRatio < MATCH_BLOCK) {
      row.level = 'error';
      row.notes.push(`nội dung nghe được không khớp lời câu ${row.key} — nhiều khả năng nhầm file`);
    } else if (matchRatio < MATCH_WARN) {
      row.level = row.level === 'error' ? 'error' : 'warn';
      row.notes.push('chỉ khớp một phần lời — nghe lại câu này trước khi nhập');
    }
  }
}

const problems = rows.filter((r) => r.level === 'error');
const warnings = rows.filter((r) => r.level === 'warn');
const report = {
  schema: 'vinuni-voice-import/1',
  id,
  from: path.relative(ROOT, fromDir).split(path.sep).join('/'),
  cues: CUES.length,
  needFile: CUES.filter((c) => !c.silent).length,
  matched: rows.filter((r) => r.file).length,
  pause,
  align: alignInfo,
  ok: problems.length === 0,
  missing,
  extra,
  clashes,
  rows: rows.map(({ hash, ...r }) => r),
};

function print() {
  if (flags.json) return console.log(JSON.stringify(report));
  console.log(`\n${report.matched}/${report.needFile} câu có file · ${problems.length} lỗi · ${warnings.length} cảnh báo`);
  for (const r of rows) {
    const mark = r.level === 'error' ? '✗' : r.level === 'warn' ? '!' : '·';
    const match = r.matchRatio != null ? ` · khớp ${Math.round(r.matchRatio * 100)}%` : '';
    console.log(`${mark} ${r.key} ← ${r.file || '—'}${r.seconds ? ` · ${secs(r.seconds)}` : ''}${match}${r.notes.length ? ` · ${r.notes.join('; ')}` : ''}`);
  }
  for (const e of extra) console.log(`! thừa: ${e.file} (${e.reason})`);
  for (const c of clashes) console.log(`! trùng số câu ${c.n}: dùng ${c.kept}, bỏ qua ${c.file}`);
  if (alignInfo.note) console.log(`! ${alignInfo.note}`);
}

if (flags.scan) { print(); process.exit(0); }
if (problems.length && !flags.force) {
  print();
  fail(`${problems.length} câu chưa dùng được (${problems.map((r) => r.key).join(', ')}). Sửa rồi nhập lại, hoặc thêm --force nếu bạn chắc chắn.`);
}

// ── assemble ─────────────────────────────────────────────────────────────────
const built = assemble({
  items: CUES.map((c) => ({
    n: c.n,
    text: c.text,
    pcm: c.pcm ?? Buffer.alloc(0),
    silent: c.silent,
    pauseAfter: c.pauseAfter,
    authoredFrames: c.authoredFrames,
    // `speaker` đi thẳng vào voice.js qua voice-timing.mjs, và cảnh dựng thẻ hội thoại từ đó — giống
    // hệt đường ElevenLabs, nên một video hội thoại đổi sang giọng tự thu hay model local không mất mặt ai.
    extra: {
      source: byCue.get(c.n) || null,
      ...(CAST.get(c.speaker)?.who
        ? (({ name, avatar, side, tone }) => ({ speaker: name, avatar, side, tone }))(CAST.get(c.speaker).who)
        : {}),
    },
  })),
  sampleRate: SAMPLE_RATE,
  pause,
  onSegment: (c, offsetSeconds) => {
    const heard = heardByCue.get(c.n);
    if (c.silent || !heard?.words?.length) return {};
    const { words, matchRatio } = mapWords(c.text, heard.words, offsetSeconds);
    return words.length ? { words, matchRatio } : {};
  },
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'voice.wav'), built.wav);
const receipt = {
  schema: 'vinuni-tts-elevenlabs/1',
  generator: 'import',
  voiceId: null,
  model: alignInfo.used ? `whisper:${model}` : null,
  language: 'vi',
  outputFormat: `pcm_${SAMPLE_RATE}`,
  voiceSettings: null,
  fps: FPS,
  sampleRate: SAMPLE_RATE,
  pauseSeconds: pause,
  source: report.from,
  cuesSource: path.relative(ROOT, cuesFile).split(path.sep).join('/'),
  cuesSha256: sha256(fs.readFileSync(cuesFile, 'utf8')),
  durationInFrames: built.durationInFrames,
  audioDurationSeconds: built.audioDurationSeconds,
  masterSha256: sha256(built.wav),
  cues: built.cues,
};
fs.writeFileSync(path.join(outDir, 'voice.cues.json'), `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(path.join(outDir, 'align-report.json'), `${JSON.stringify({ ...report, at: new Date().toISOString(), forced: Boolean(flags.force) }, null, 2)}\n`);

if (flags.json) {
  console.log(JSON.stringify({ ...report, out: path.relative(ROOT, outDir).split(path.sep).join('/'), durationInFrames: built.durationInFrames, seconds: built.audioDurationSeconds }));
} else {
  print();
  console.log(`\n✓ ${path.relative(process.cwd(), outDir)}/voice.wav · ${built.audioDurationSeconds}s · ${built.durationInFrames} frame`);
  console.log(`✓ voice.cues.json · ${built.cues.length} câu · ${built.cues.filter((c) => c.words).length} câu có mốc từng từ`);
  console.log(`\nGắn vào video: node tools/voice-timing.mjs ${path.relative(ROOT, path.join(outDir, 'voice.cues.json'))} ${path.relative(ROOT, path.dirname(cuesFile))} --write-cues`);
}
