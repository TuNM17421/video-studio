#!/usr/bin/env node
/**
 * QA audio thật của một video đã nhập giọng — không nghe tay, đo bằng ffmpeg trên `voice/out/<id>/voice.wav`
 * (+ `voice.cues.json` đi kèm để biết ranh giới từng cue). Đọc-only, không gọi mạng, không sinh giọng.
 *
 *   node tools/audio-qa.mjs --video <id> [--dir <thư mục thay voice/out/<id>>] [--json]
 *
 * Bốn việc đo được, MỖI lần chạy 3 lượt ffmpeg trên CẢ file (không cắt từng cue — nhanh, <30s):
 *   1. clipping        — % mẫu chạm 0dBFS (`volumedetect`), so với phân bố thật 8 video (0.0003–0.0010%).
 *   2. loudness         — integrated loudness (LUFS) + true peak (`ebur128`), so với phân bố thật
 *                         (I: −16,4…−15,7 LUFS · TPK: −0,3…0,4 dBFS).
 *   3. lặng bất thường  — đoạn lặng dài nhất (`silencedetect`), so với phân bố thật (tối đa 2,53s).
 *   4. clip cụt/nuốt chữ — với MỖI cue có lời: đo lại phần KHÔNG LẶNG thật sự trong khoảng
 *      [startFrame,endFrame) của audio HIỆN TẠI (không tin `speechDurationSeconds` cũ trong
 *      voice.cues.json — file audio có thể đã bị thay/cắt sau khi cues.json được ghi), so với kỳ vọng
 *      = số âm tiết / 5,12 (nhịp trung vị OmniVoice, `tools/voice-pace.mjs`).
 *
 * Ngưỡng CHẶN/CẢNH BÁO chọn từ phân bố thật trên 8 video OmniVoice hiện có (`voice/out/*`), xem hằng số
 * bên dưới — mỗi ngưỡng có số đo thật kèm theo, không đoán.
 *
 * Exit code (để tools/qa.mjs của lane khác gọi được):
 *   0  sạch — không có lỗi CHẶN
 *   1  có lỗi CHẶN
 *   2  thiếu dữ liệu (không có voice.wav / voice.cues.json để đo)
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { FF_MAX_BUFFER, ffFailure } from './lib/ff-run.mjs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BACKEND, rateFor } from './lib/voice-backends.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const usage = 'Usage: node tools/audio-qa.mjs --video <id> [--dir <thư mục>] [--json]';
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(usage); process.exit(0); }
const VALUE_FLAGS = new Set(['video', 'dir']);
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
if (!flags.video && !flags.dir) { console.error(`✗ thiếu --video <id> hoặc --dir <thư mục>\n${usage}`); process.exit(2); }

const dir = flags.dir ? path.resolve(flags.dir) : path.join(ROOT, 'voice/out', flags.video);
const wavFile = path.join(dir, 'voice.wav');
const cuesJsonFile = path.join(dir, 'voice.cues.json');
if (!fs.existsSync(wavFile) || !fs.existsSync(cuesJsonFile)) {
  console.error(`✗ thiếu voice.wav hoặc voice.cues.json trong ${path.relative(ROOT, dir)} — video này chưa nhập giọng, không đo được`);
  process.exit(2);
}
const id = flags.video || path.basename(dir);
const cuesData = JSON.parse(fs.readFileSync(cuesJsonFile, 'utf8'));
const fps = cuesData.fps || 30;

// ── ffmpeg ───────────────────────────────────────────────────────────────────────────────────────
let FFMPEG = 'ffmpeg';
try { FFMPEG = (await import('ffmpeg-static')).default || FFMPEG; } catch { /* dùng ffmpeg trên PATH */ }
// Trần buffer + cách đọc kết quả hỏng nằm ở `lib/ff-run.mjs` (có test cho cả ba nhánh hỏng).
// Luật: ffmpeg hỏng kiểu nào cũng phải exit ≠0 — một tool QA im lặng trả về "sạch" còn tệ hơn
// một tool QA chết, vì không ai biết là nó chưa đo được gì.
function ff(args, label = 'ffmpeg') {
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8', maxBuffer: FF_MAX_BUFFER });
  const bad = ffFailure(r, { cmd: `${label} (${FFMPEG})` });
  if (bad) { console.error(`✗ ${bad}`); process.exit(2); }
  return r.stderr || '';
}

// ── 1. clipping ──────────────────────────────────────────────────────────────────────────────────
// Phân bố thật 8 video (voice/out/*): 0,0003%–0,0010% mẫu chạm 0dBFS — vẫn bình thường (đỉnh câu nói).
// CLIP_PCT_BLOCK = 0,01% (10× số cao nhất đo được) — clipping số thật (nhiều mẫu dẹt liên tục ở đỉnh)
// sẽ cao hơn nhiều bậc so với mốc này.
const CLIP_PCT_BLOCK = 0.01;
const volOut = ff(['-hide_banner', '-nostats', '-i', wavFile, '-af', 'volumedetect', '-f', 'null', '-'], 'volumedetect');
const nSamples = Number(volOut.match(/n_samples:\s*(\d+)/)?.[1] || 0);
const h0db = Number(volOut.match(/histogram_0db:\s*(\d+)/)?.[1] || 0);
const clipPct = nSamples ? (h0db / nSamples) * 100 : 0;
const meanVolume = Number(volOut.match(/mean_volume:\s*([-\d.]+) dB/)?.[1]);

// ── 2. loudness (LUFS + true peak) ──────────────────────────────────────────────────────────────
// Phân bố thật 8 video: I −16,4…−15,7 LUFS · TPK −0,3…0,4 dBFS. Biên rộng hơn nhiều cho WARN/BLOCK.
const LUFS_WARN = [-20, -12];
const LUFS_BLOCK = [-40, -8];
const TPK_WARN = 0.8;
const TPK_BLOCK = 1.5;
const ebOut = ff(['-hide_banner', '-nostats', '-i', wavFile, '-af', 'ebur128=peak=true', '-f', 'null', '-'], 'ebur128');
const ebSummary = ebOut.slice(ebOut.indexOf('Summary:'));
const integratedLufs = Number(ebSummary.match(/Integrated loudness:\s*\n\s*I:\s*([-\d.]+) LUFS/)?.[1]);
const truePeak = Number(ebSummary.match(/Peak:\s*([-\d.]+) dBFS/)?.[1]);

// ── 3 & 4. silence + clip cụt ────────────────────────────────────────────────────────────────────
// Phân bố thật 8 video: đoạn lặng đơn lẻ dài nhất 1,38–2,53s. WARN >3,5s · BLOCK >6s (đôi lần WARN).
const SIL_WARN = 3.5;
const SIL_BLOCK = 6.0;
const SIL_NOISE_DB = -35;
const SIL_MIN_DUR = 0.25;
const sdOut = ff(['-hide_banner', '-nostats', '-i', wavFile, '-af', `silencedetect=noise=${SIL_NOISE_DB}dB:duration=${SIL_MIN_DUR}`, '-f', 'null', '-'], 'silencedetect');
const silenceStarts = [...sdOut.matchAll(/silence_start:\s*([\d.]+)/g)].map((m) => Number(m[1]));
const silenceEnds = [...sdOut.matchAll(/silence_end:\s*([\d.]+)\s*\|\s*silence_duration:\s*([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const silences = silenceStarts.map((s, i) => ({ start: s, end: silenceEnds[i] ? silenceEnds[i][0] : s, duration: silenceEnds[i] ? silenceEnds[i][1] : 0 }));
const maxSilence = silences.reduce((m, s) => Math.max(m, s.duration), 0);
const overlap = (aS, aE, bS, bE) => Math.max(0, Math.min(aE, bE) - Math.max(aS, bS));

/**
 * Nhịp đọc là thuộc tính của BACKEND, không phải hằng số của harness — và đây từng là một giả định
 * chôn cứng: 5,12 âm tiết/giây là trung vị của OmniVoice, còn ZeroTTS `baotrang` đọc ~4,1. Dùng số
 * của OmniVoice cho ZeroTTS thì "kỳ vọng" ngắn đi ~20%, và phép bắt CLIP CỤT sẽ im lặng bỏ sót.
 *
 * `voice.cues.json` ghi backend từ 21/09/2026; receipt cũ không có trường đó → quy về OmniVoice,
 * đúng với mọi video bind trước mốc ấy. Số và CỠ MẪU của từng backend ở `lib/voice-backends.mjs`.
 */
const backendId = cuesData.backend || DEFAULT_BACKEND;
const RATE_INFO = rateFor(backendId);
const RATE = RATE_INFO.value;
// Phân bố thật (222 cue, 4 video có align-report): tỉ lệ đo-được/kỳ-vọng nằm trong [0,72 ; 1,17],
// trung vị 0,88 (xem comment trong tools/voice-risk.mjs cho cách đo). BLOCK dưới một nửa số thấp nhất
// từng thấy thật (0,72) — cắt cụt 40% một clip sẽ rơi xa dưới mốc này.
const TRUNC_BLOCK = 0.45;
const TRUNC_WARN = 0.6;
const syllables = (s) => (String(s || '').match(/\S+/g) || []).length;

const cueChecks = [];
for (const c of cuesData.cues || []) {
  if (c.silent) continue;
  const start = c.startFrame / fps;
  const end = c.endFrame / fps;
  if (!(end > start)) continue;
  let silentSeconds = 0;
  for (const s of silences) silentSeconds += overlap(start, end, s.start, s.end);
  const measured = Math.max(0, (end - start) - silentSeconds);
  const expected = syllables(c.text) / RATE;
  const ratio = expected > 0 ? measured / expected : 1;
  cueChecks.push({ n: c.n, text: c.text, start, end, measured, expected, ratio });
}
const truncated = cueChecks.filter((c) => c.ratio < TRUNC_BLOCK);
const truncatedWarn = cueChecks.filter((c) => c.ratio >= TRUNC_BLOCK && c.ratio < TRUNC_WARN);

// ── tổng hợp ─────────────────────────────────────────────────────────────────────────────────────
const problems = [];
if (clipPct >= CLIP_PCT_BLOCK) problems.push({ level: 'chặn', msg: `clipping: ${clipPct.toFixed(4)}% mẫu chạm 0dBFS (ngưỡng ${CLIP_PCT_BLOCK}%) — mean ${meanVolume}dB` });
if (Number.isFinite(integratedLufs)) {
  if (integratedLufs < LUFS_BLOCK[0] || integratedLufs > LUFS_BLOCK[1]) problems.push({ level: 'chặn', msg: `loudness bất thường: ${integratedLufs} LUFS (biên chặn ${LUFS_BLOCK[0]}…${LUFS_BLOCK[1]})` });
  else if (integratedLufs < LUFS_WARN[0] || integratedLufs > LUFS_WARN[1]) problems.push({ level: 'cảnh báo', msg: `loudness lệch dải thường thấy: ${integratedLufs} LUFS (thường −16,4…−15,7)` });
}
if (Number.isFinite(truePeak)) {
  if (truePeak > TPK_BLOCK) problems.push({ level: 'chặn', msg: `true peak vượt ngưỡng: ${truePeak} dBFS (chặn > ${TPK_BLOCK})` });
  else if (truePeak > TPK_WARN) problems.push({ level: 'cảnh báo', msg: `true peak cao: ${truePeak} dBFS (thường −0,3…0,4)` });
}
if (maxSilence >= SIL_BLOCK) problems.push({ level: 'chặn', msg: `đoạn lặng ${maxSilence.toFixed(2)}s (chặn ≥ ${SIL_BLOCK}s, thường tối đa 1,4–2,5s)` });
else if (maxSilence >= SIL_WARN) problems.push({ level: 'cảnh báo', msg: `đoạn lặng ${maxSilence.toFixed(2)}s dài bất thường (cảnh báo ≥ ${SIL_WARN}s)` });
for (const c of truncated) problems.push({ level: 'chặn', msg: `câu ${c.n} nghi cắt cụt/nuốt chữ: đo được ${c.measured.toFixed(2)}s so với kỳ vọng ${c.expected.toFixed(2)}s (tỉ lệ ${c.ratio.toFixed(2)}, chặn <${TRUNC_BLOCK}) — "${c.text.slice(0, 60)}${c.text.length > 60 ? '…' : ''}"` });
for (const c of truncatedWarn) problems.push({ level: 'cảnh báo', msg: `câu ${c.n} ngắn hơn kỳ vọng: tỉ lệ ${c.ratio.toFixed(2)} (cảnh báo <${TRUNC_WARN})` });

const blocking = problems.filter((p) => p.level === 'chặn');
const exitCode = blocking.length ? 1 : 0;

if (flags.json) {
  console.log(JSON.stringify({
    id, wav: path.relative(ROOT, wavFile), samples: nSamples, clipPct, meanVolume, integratedLufs, truePeak,
    maxSilence, silences: silences.length, cues: cueChecks.length, truncated: truncated.map((c) => c.n),
    truncatedWarn: truncatedWarn.map((c) => c.n), problems, exitCode,
  }, null, 2));
} else {
  console.log(`${id} · ${path.relative(ROOT, wavFile)}`);
  console.log(`  clipping    : ${clipPct.toFixed(4)}% (chặn ≥ ${CLIP_PCT_BLOCK}%) · mean ${meanVolume}dB`);
  console.log(`  loudness    : ${integratedLufs} LUFS · true peak ${truePeak} dBFS`);
  console.log(`  lặng dài nhất: ${maxSilence.toFixed(2)}s (${silences.length} đoạn lặng ≥${SIL_MIN_DUR}s)`);
  console.log(`  cắt cụt     : đo ${cueChecks.length} câu · nghi chặn ${truncated.length} · cảnh báo ${truncatedWarn.length}`);
  console.log(`  nhịp chuẩn  : ${RATE} âm tiết/giây · backend ${RATE_INFO.backend}${RATE_INFO.borrowed ? ` (MƯỢN của ${DEFAULT_BACKEND} — backend "${backendId}" chưa khai)` : ''} · ${RATE_INFO.samples} mẫu (${RATE_INFO.measuredOn})`);
  if (problems.length) {
    console.log('');
    for (const p of problems) console.log(`  ${p.level === 'chặn' ? '✗ CHẶN' : '⚠ cảnh báo'}: ${p.msg}`);
  } else {
    console.log('\n  ✓ sạch, không có lỗi.');
  }
}
process.exit(exitCode);
