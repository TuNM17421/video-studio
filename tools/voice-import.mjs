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
 *   --gaps           khoảng nghỉ theo NGHĨA của khe thay cho `pauseAfter` khai cứng: mỗi khe được
 *                    đưa về một ĐÍCH THỰC NGHE THẤY (xem tools/lib/voice-gaps.mjs). KHÔNG bật cờ
 *                    thì mọi thứ y nguyên — 10 video đã render không đổi một byte.
 *   --gaps-report <f> ghi bảng khe (loại · thực cũ → thực mới) ra file markdown
 *   --backend <spec> backend đã sinh thư mục này (`zerotts:baotrang`, `omnivoice`). Không truyền thì
 *                    đọc `voice-backend.json` trong chính `--from`, rồi dòng `voice:` của
 *                    `projects/<id>/REQUEST.md`, rồi mới tới mặc định `omnivoice`.
 *
 * ── Chuẩn hoá mức lời theo backend (21/09/2026) ───────────────────────────────────────────────
 * Mỗi backend ra một mức khác nhau. Đo thật: OmniVoice −15,8 LUFS (đúng mức nhà), ZeroTTS
 * `baotrang` **−21,6**, `giahuy` −19,5. Nhập thẳng ZeroTTS thì `voice.wav` thiếu gần 6 dB và
 * `audio-qa` chặn ngay vì lệch dải LUFS.
 *
 * Cách làm: đo LUFS TỪNG clip, lấy **trung vị của cả batch**, cộng ĐÚNG MỘT mức gain cho mọi clip.
 * Cố ý không normalize từng clip riêng — làm vậy sẽ san phẳng chênh lệch giữa các câu, mà chênh
 * lệch đó là một phần của cách đọc. Một gain chung kéo cả batch về đích mà giữ nguyên tương quan.
 *
 * Backend có `targetLufs = null` (OmniVoice) thì KHÔNG đo, KHÔNG nhân gì — đường cũ giữ nguyên từng
 * byte, 7 video đang chạy không đổi.
 *
 * Chuẩn hoá chạy TRƯỚC `speechBounds`, và đó là chủ đích: `speechBounds` so biên độ tuyệt đối với
 * ngưỡng 100 (int16), tức nó CÓ phụ thuộc mức. Đo thật trên `Z1-baotrang`: +5,8 dB làm lặng đầu
 * 0,032 → 0,029 s (3 ms) — nhỏ, nhưng nhỏ vì đã chuẩn hoá trước. `voice-gaps.mjs` thì KHÔNG chôn
 * hằng số lặng nào: nó gọi `keptEdges` đo trên chính clip, nên ZeroTTS (lặng đầu ~0,03 s so với
 * ~0,20 s của OmniVoice) vẫn ra đúng khe thực.
 *
 * The file-name convention (01.wav = câu 1) and the lenient matching that reads it live in
 * tools/lib/voice-files.mjs, shared with tools/voice-export.mjs so the two cannot drift apart. The
 * report always shows which file went to which câu, because a folder that is silently off by one is
 * the one mistake that survives all the way to the MP4.
 *
 * For a file that is the right one, the report also lists what the recording seems to have lost or
 * doubled (`issues`: a cut ending, a skipped run of words, a looped word — see speechIssues in
 * tools/lib/voice-align.mjs). Each is a warning to listen to that câu, not a block.
 */
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assemble, FPS, sha256 } from './lib/voice-audio.mjs';
import { cueKey, isAudioFile, matchAudioFolder } from './lib/voice-files.mjs';
import { durationFlag, mapWords, MATCH_BLOCK, MATCH_WARN, runAlign, SETUP_HINT, speechIssues, venvPython } from './lib/voice-align.mjs';
import { castSpeaker } from './lib/voices.mjs';
import { backendFromRequest, DEFAULT_BACKEND, resolveBackend } from './lib/voice-backends.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAMPLE_RATE = 24000;
// MATCH_BLOCK / MATCH_WARN and durationFlag (SHORT / LONG) live in tools/lib/voice-align.mjs, shared with voice-retake.mjs.

const fail = (m) => { console.error(`✗ ${m}`); process.exit(1); };
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`usage: node tools/voice-import.mjs --cues <video dir>/cues.js --from <thư mục audio> [tuỳ chọn]
  --out <dir>        mặc định voice/out/<tên thư mục cues>
  --scan             chỉ soát và in báo cáo, không ghi gì
  --json             output máy đọc (Video Studio dùng)
  --pause <s>        lặng sau mỗi câu (mặc định 1.4; pauseAfter của cue thắng)
  --model <name>     model Whisper cho mốc từ (mặc định small)
  --no-align         bỏ Whisper: không mốc từ, không bắt được file lệch câu
  --force            nhập bất chấp lỗi chặn
  --gaps             nghỉ theo LOẠI KHE thay cho pauseAfter cứng (opt-in, xem tools/lib/voice-gaps.mjs)
  --gaps-report <f>  ghi bảng khe ra file markdown
  --backend <spec>   \`omnivoice\` | \`zerotts:<giọng>\` — quyết định mức chuẩn hoá LUFS`);
  process.exit(0);
}
const VALUE_FLAGS = new Set(['cues', 'from', 'out', 'pause', 'model', 'gaps-report', 'backend']);
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

// ── backend giọng ────────────────────────────────────────────────────────────
// Thứ tự: --backend → voice-backend.json cạnh chính các clip → REQUEST.md của project → mặc định.
// `voice-backend.json` đứng trên REQUEST.md vì nó là sự thật về THƯ MỤC NÀY: REQUEST nói video
// "nên" dùng backend gì, còn file kia nói clip này thật sự do backend nào sinh ra.
const sidecarFile = path.join(fromDir, 'voice-backend.json');
let sidecar = null;
try { if (fs.existsSync(sidecarFile)) sidecar = JSON.parse(fs.readFileSync(sidecarFile, 'utf8')); } catch {}
const sidecarSpec = sidecar ? (sidecar.voice ? `${sidecar.backend}:${sidecar.voice}` : sidecar.backend) : null;
const requestFile = path.join(ROOT, 'projects', id, 'REQUEST.md');
const requestSpec = fs.existsSync(requestFile) ? backendFromRequest(fs.readFileSync(requestFile, 'utf8')) : null;
const backendSpec = flags.backend || sidecarSpec || requestSpec || null;
let chosen;
try { chosen = resolveBackend(backendSpec, { fallback: DEFAULT_BACKEND }); }
catch (e) { fail(e.message); }
const backendSource = flags.backend ? '--backend'
  : sidecarSpec ? 'voice-backend.json cạnh clip'
  : requestSpec ? `projects/${id}/REQUEST.md (voice:)`
  : 'mặc định';

// ── cues ─────────────────────────────────────────────────────────────────────
const mod = await import(`${pathToFileURL(cuesFile).href}?t=${Date.now()}`);
const CUES = (mod.CUES || []).map((c, i) => ({
  n: c.n ?? i + 1,
  text: (c.text || '').trim(),
  silent: c.silent || 0,
  pauseAfter: c.pauseAfter,
  speaker: String(c.speaker || '').trim(),
  gap: c.gap,
  scene: c.scene,
  section: c.section,
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

/** LUFS tích hợp của một file, đo bằng `ebur128`. `null` nếu đoạn quá ngắn để đo (ffmpeg trả -inf). */
function measureLufs(file) {
  const res = spawnSync(FFMPEG, ['-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { maxBuffer: 64 * 1024 * 1024 });
  const txt = String(res.stderr || '');
  const sum = txt.slice(txt.lastIndexOf('Integrated loudness'));
  const m = sum.match(/I:\s*(-?[\d.]+)\s*LUFS/);
  const v = m ? Number(m[1]) : NaN;
  return Number.isFinite(v) ? v : null;
}

const med = (xs) => {
  const a = [...xs].sort((x, y) => x - y);
  if (!a.length) return null;
  return a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
};

/**
 * Một gain chung cho cả batch (xem đầu file). `gainDb = 0` nghĩa là KHÔNG đụng vào audio và cũng
 * KHÔNG đổi khoá cache — đường OmniVoice ra đúng byte như trước.
 */
let normalize = { applied: false, targetLufs: chosen.backend.targetLufs, gainDb: 0, medianLufs: null, perClip: [] };

/** Decode to the master's format (16-bit mono 24 kHz), cached by the source file's content hash. */
function decode(file, hash, gainDb = 0) {
  // Khoá cache phải mang cả gain: cùng một file nguồn với hai mức gain là hai PCM khác nhau.
  const ceil = chosen.backend.peakCeilingDb;
  const cached = path.join(CACHE, 'pcm', gainDb ? `${hash}-g${gainDb.toFixed(2)}c${ceil ?? 'x'}.pcm` : `${hash}.pcm`);
  if (fs.existsSync(cached)) return fs.readFileSync(cached);
  // `volume` rồi `alimiter` — xem `peakCeilingDb` ở `lib/voice-backends.mjs` cho lý do đo được.
  const chain = gainDb
    ? `volume=${gainDb.toFixed(2)}dB${ceil != null ? `,alimiter=limit=${(10 ** (ceil / 20)).toFixed(4)}:attack=1:release=50:level=disabled` : ''}`
    : null;
  const filter = chain ? ['-af', chain] : [];
  const res = spawnSync(FFMPEG, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', String(SAMPLE_RATE), ...filter, '-f', 's16le', '-'], { maxBuffer: 512 * 1024 * 1024 });
  if (res.status !== 0 || !res.stdout?.length) throw new Error(String(res.stderr || '').trim().split('\n').pop() || 'ffmpeg không đọc được tệp');
  fs.mkdirSync(path.dirname(cached), { recursive: true });
  fs.writeFileSync(cached, res.stdout);
  return res.stdout;
}

// Đo mức TRƯỚC khi decode bất kỳ clip nào — gain là thuộc tính của cả batch, không của từng file.
if (chosen.backend.targetLufs != null) {
  const measured = [];
  for (const c of CUES) {
    if (c.silent) continue;
    const f = byCue.get(c.n);
    if (!f) continue;
    const l = measureLufs(path.join(fromDir, f));
    if (l != null) measured.push({ n: c.n, lufs: l });
  }
  const m = med(measured.map((x) => x.lufs));
  if (m != null) {
    const gain = +(chosen.backend.targetLufs - m).toFixed(2);
    normalize = { applied: gain !== 0, targetLufs: chosen.backend.targetLufs, gainDb: gain, peakCeilingDb: chosen.backend.peakCeilingDb ?? null, medianLufs: +m.toFixed(2), perClip: measured };
    if (!flags.json) {
      console.error(`· chuẩn hoá ${chosen.spec}: trung vị ${m.toFixed(1)} LUFS → đích ${chosen.backend.targetLufs} LUFS · gain chung ${gain >= 0 ? '+' : ''}${gain} dB (${measured.length} clip)${chosen.backend.peakCeilingDb != null ? ` · limiter trần ${chosen.backend.peakCeilingDb} dBFS` : ''}`);
    }
  } else if (!flags.json) {
    console.error(`! không đo được LUFS clip nào — bỏ chuẩn hoá cho ${chosen.spec}`);
  }
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
    const pcm = decode(path.join(fromDir, file), row.hash, normalize.gainDb);
    c.pcm = pcm;
    row.seconds = +(pcm.length / 2 / SAMPLE_RATE).toFixed(2);
    // Same function the retake judges with — a take one passes, the other never flags.
    const flagged = durationFlag(c.text, row.seconds);
    if (flagged === 'short') { row.level = 'warn'; row.notes.push(`ngắn bất thường (${secs(row.seconds)} so với ~${secs(row.expectedSeconds)})`); }
    else if (flagged === 'long') { row.level = 'warn'; row.notes.push(`dài bất thường (${secs(row.seconds)} so với ~${secs(row.expectedSeconds)})`); }
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
    // Right file, but maybe not the whole câu: a cut ending, a skipped run of words, a looped word.
    // matchRatio passes all three (losing 2 of 10 words still scores 0.8), so they get their own line —
    // a warning to listen, since Whisper's own mishearings can look the same.
    if (matchRatio >= MATCH_BLOCK) {
      const issues = speechIssues(row.text, heard.words);
      if (issues.length) {
        row.issues = issues;
        row.level = row.level === 'error' ? 'error' : 'warn';
      }
    }
  }
}

/** One line per finding, for the CLI and the log; Studio draws them itself with a play button. */
const ISSUE_LABEL = {
  truncation: (w) => `có thể mất đuôi câu — không nghe thấy "${w}"`,
  dropped: (w) => `có thể nuốt chữ — không nghe thấy "${w}"`,
  repeat: (w) => `có thể lặp chữ — nghe "${w}" hai lần`,
};

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
  backend: { spec: chosen.spec, source: backendSource, normalize },
  ok: problems.length === 0,
  missing,
  extra,
  clashes,
  rows: rows.map(({ hash, ...r }) => r),
};

function print() {
  if (flags.json) return console.log(JSON.stringify(report));
  console.log(`\nbackend: ${chosen.spec} (${backendSource})${normalize.applied ? ` · chuẩn hoá ${normalize.gainDb >= 0 ? '+' : ''}${normalize.gainDb} dB → ${normalize.targetLufs} LUFS` : ' · không chuẩn hoá'}`);
  console.log(`${report.matched}/${report.needFile} câu có file · ${problems.length} lỗi · ${warnings.length} cảnh báo`);
  for (const r of rows) {
    const mark = r.level === 'error' ? '✗' : r.level === 'warn' ? '!' : '·';
    const match = r.matchRatio != null ? ` · khớp ${Math.round(r.matchRatio * 100)}%` : '';
    const notes = [...r.notes, ...(r.issues || []).map((i) => ISSUE_LABEL[i.code](i.words))];
    console.log(`${mark} ${r.key} ← ${r.file || '—'}${r.seconds ? ` · ${secs(r.seconds)}` : ''}${match}${notes.length ? ` · ${notes.join('; ')}` : ''}`);
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

// ── khoảng nghỉ theo nghĩa (chỉ khi --gaps) ──────────────────────────────────
// Đặt NGAY TRƯỚC assemble và chỉ sửa đúng trường `pauseAfter`: không cờ thì không nhánh nào chạy,
// nên đường cũ giữ nguyên từng byte.
let gapPlan = null;
if (flags.gaps) {
  const { keptEdges, resolveGaps } = await import('./lib/voice-gaps.mjs');
  const edges = new Map();
  for (const c of CUES) {
    if (c.silent || !c.pcm) continue;
    edges.set(c.n, keptEdges(c.pcm, SAMPLE_RATE));
  }
  gapPlan = resolveGaps(CUES, (n) => edges.get(n));
  for (const row of gapPlan) {
    const cue = CUES.find((c) => c.n === row.n);
    if (cue && row.kind) cue.pauseAfter = row.pauseAfter;
  }
  if (!flags.json) {
    const byKind = {};
    for (const r of gapPlan) if (r.kind) byKind[r.kind] = (byKind[r.kind] || 0) + 1;
    console.log(`\n--gaps: ${gapPlan.filter((r) => r.kind).length} khe · ` + Object.entries(byKind).map(([k, v]) => `${k}×${v}`).join(' · '));
  }
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
if (gapPlan && flags['gaps-report']) {
  const { GAP_KINDS } = await import('./lib/voice-gaps.mjs');
  const L = ['# Bảng khe — khoảng nghỉ theo nghĩa', '',
    'Khe THỰC = đuôi giữ lại của clip trước + `pauseAfter` + đầu giữ lại của clip sau.',
    '`assemble()` giữ ≤50 ms đầu và ≤80 ms đuôi mỗi clip, nên khai `pauseAfter: 0` vẫn ra ~0,17 s.', '',
    '| loại | khoảng đích | ý nghĩa |', '|---|---|---|'];
  for (const [k, v] of Object.entries(GAP_KINDS)) L.push(`| \`${k}\` | ${v.range[0]}–${v.range[1]}s | ${v.why} |`);
  L.push('', '| khe | loại | vì sao | giữ lại | THỰC cũ | đích | THỰC mới |', '|---|---|---|---|---|---|---|');
  for (const r of gapPlan) {
    if (!r.kind) continue;
    L.push(`| ${r.n}→${r.n + 1} | \`${r.kind}\` | ${r.source} | ${r.kept}s | ${r.before}s | ${r.target}s | **${r.after}s** |`);
  }
  const sum = (f) => gapPlan.filter((r) => r.kind).reduce((s, r) => s + f(r), 0);
  L.push('', `Tổng khe cũ **${sum((r) => r.before).toFixed(2)}s** → mới **${sum((r) => r.after).toFixed(2)}s**.`);
  fs.writeFileSync(path.resolve(String(flags['gaps-report'])), L.join('\n') + '\n');
  if (!flags.json) console.log(`✓ ${flags['gaps-report']}`);
}
const receipt = {
  schema: 'vinuni-tts-elevenlabs/1',
  generator: 'import',
  /**
   * `backend` nói CLIP đến từ đâu. `generator: 'import'` chỉ nói "không phải ElevenLabs" — nó gom
   * mọi backend vào một rổ, nên `voice-pace`/`audio-qa` từng lấy chung một nhịp đọc cho những giọng
   * đọc nhanh chậm khác hẳn nhau. Ba trường dưới đây là thứ tách chúng ra.
   */
  backend: chosen.backend.id,
  backendVoice: chosen.voice,
  backendVersion: sidecar?.version ?? chosen.backend.version ?? null,
  backendSource,
  normalize: normalize.applied
    ? { targetLufs: normalize.targetLufs, medianSourceLufs: normalize.medianLufs, gainDb: normalize.gainDb, clips: normalize.perClip.length }
    : null,
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
