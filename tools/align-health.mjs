#!/usr/bin/env node
/**
 * Is the imported-voice word alignment good enough?
 *
 *   node tools/align-health.mjs [--json]
 *
 * Reads every voice/out/<id>/align-report.json and the Video Studio log of the same video, and measures
 * the two things docs/decisions/voice-align.md says would justify moving from Whisper's own word
 * timestamps to a forced aligner (Whisper + CTC):
 *
 *   1. how many câu Whisper only partly recognised — those get interpolated beats, not measured ones;
 *   2. how often the scenes stage had to be sent back with a complaint about timing.
 *
 * Prints a verdict against the thresholds in that document. It reports; it never changes anything.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeNumberWords, stripThousandDots } from './lib/voice-numbers.mjs';
import { termHealth } from './lib/voice-terms.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argvAH = process.argv.slice(2);
const json = argvAH.includes('--json');
const valueAH = (n) => { const i = argvAH.indexOf(`--${n}`); return i >= 0 ? argvAH[i + 1] : undefined; };
if (argvAH.includes('--help') || argvAH.includes('-h')) {
  console.log(`usage: node tools/align-health.mjs [--terms] [--dir <thư mục>] [--video <id>] [--json]

  --terms      soát theo TỪ: cụm 2–3 âm tiết lặp ở ≥2 cue mà Whisper KHÔNG nghe ra. Một cụm hụt ở
               ≥2 cue = lỗi HỆ THỐNG của từ ⇒ ĐỔI LỜI, đừng sinh lại (retro F4: "đòn bẩy" tốn 2
               lượt Kaggle vì soát theo % từng cue thì cue nào cũng "gần đạt").
  --dir <d>    đọc align-report.json trong thư mục này thay vì voice/out/* — để soát bản DÀN DỰNG
               (staging) trước khi cài vào file sống. Đối xứng với \`audio-qa --dir\`.
  --video <id> chỉ một video trong voice/out/`);
  process.exit(0);
}

// Thresholds — keep in step with docs/decisions/voice-align.md.
const WEAK_MATCH = 0.65;
const WEAK_SHARE = 0.1;
const MIN_VIDEOS = 3;
const NOISY_ROUNDS = 2;
const NOISY_VIDEOS = 2;
const TIMING = /lệch|chưa khớp|không khớp|sai nhịp|trật nhịp|hiện sớm|hiện muộn|quá sớm|quá muộn|trễ nhịp|đồng bộ|spokenAt|timing|beat/i;

const parse = (text) => { try { return JSON.parse(text); } catch { return null; } };
const read = (file) => (fs.existsSync(file) ? parse(fs.readFileSync(file, 'utf8')) : null);

/**
 * Whisper hay phiên số THÀNH chữ số ("một chín bảy ba" → "1973", "27.000" thay vì "27000") trong khi
 * giọng đọc đúng — khiến matchRatio (so từng từ) tụt vì LỆCH ĐỊNH DẠNG, không phải lỗi đọc thật. Quy cả
 * hai vế về cùng dạng số rồi so lại bằng một tỉ lệ trùng từ đơn giản (Dice trên đa tập từ) — chỉ để BÁO
 * CÁO thêm, không đổi `matchRatio` gốc hay ngưỡng migrate/ok phía trên (điều đó vẫn dựa trên số liệu
 * gốc, để không âm thầm đổi một quyết định đã dựa vào ngưỡng cũ).
 */
const wordsOf = (s) => String(s || '').toLowerCase().replace(/[.,;:!?…"'()]/g, '').split(/\s+/).filter(Boolean);
function overlapRatio(a, b) {
  const ca = new Map();
  for (const w of a) ca.set(w, (ca.get(w) || 0) + 1);
  const cb = new Map();
  for (const w of b) cb.set(w, (cb.get(w) || 0) + 1);
  let inter = 0;
  for (const [w, c] of ca) inter += Math.min(c, cb.get(w) || 0);
  const total = a.length + b.length;
  return total ? (2 * inter) / total : 1;
}
/** row weak thật vs. weak chỉ vì số viết khác dạng giữa `text` (kịch bản) và `heardText` (Whisper nghe). */
function numberFormatVerdict(row) {
  const normText = normalizeNumberWords(row.text);
  if (normText === row.text) return null; // không có số viết chữ trong câu này — không liên quan
  const normHeard = stripThousandDots(row.heardText || '');
  const adjusted = overlapRatio(wordsOf(normText), wordsOf(normHeard));
  return { adjusted, explained: adjusted >= WEAK_MATCH };
}

/** Scenes rounds sent back to the agent, and how many of them complained about timing. */
function feedback(id) {
  const file = path.join(ROOT, 'projects', id, '.studio/log.jsonl');
  if (!fs.existsSync(file)) return { rounds: 0, timing: 0 };
  let rounds = 0;
  let timing = 0;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const entry = parse(line);
    const m = entry?.text?.match(/^Góp ý gửi agent \(scenes\): ([\s\S]*)$/);
    if (!m) continue;
    rounds++;
    if (TIMING.test(m[1])) timing++;
  }
  return { rounds, timing };
}

/*
 * `--dir`: soát một bản DÀN DỰNG nằm ngoài `voice/out/`. Lượt dựng trước lane VOICE phải tự tính
 * tay chỉ số khớp yếu trên `staging/out/align-report.json` vì tool không có cờ nào trỏ ra ngoài
 * (F: "align-health chỉ quét voice/out/*"). Đối xứng với `audio-qa --dir`.
 */
const dirFlag = valueAH('dir');
const onlyVideo = valueAH('video');
const outRoot = dirFlag ? path.resolve(dirFlag) : path.join(ROOT, 'voice/out');
const entries = dirFlag
  ? (fs.existsSync(path.join(outRoot, 'align-report.json')) ? ['.'] : (fs.existsSync(outRoot) ? fs.readdirSync(outRoot).sort() : []))
  : (fs.existsSync(outRoot) ? fs.readdirSync(outRoot).sort() : []);
const videos = [];
for (const entry of entries) {
  const dir = path.join(outRoot, entry);
  const report = read(path.join(dir, 'align-report.json'));
  const receipt = read(path.join(dir, 'voice.cues.json'));
  const id = entry === '.' ? (report?.id ?? path.basename(outRoot)) : entry;
  if (onlyVideo && id !== onlyVideo) continue;
  // Với `--dir`, bản dàn dựng chưa chắc có receipt `generator: import` — đừng loại nó vì lý do đó.
  if (!report || (!dirFlag && receipt?.generator !== 'import')) continue;
  const scored = report.rows.filter((r) => r.matchRatio != null);
  const weak = scored.filter((r) => r.matchRatio < WEAK_MATCH);
  const noWords = report.rows.filter((r) => !r.silent && r.matchRatio == null);
  const numberFormat = weak.map((r) => ({ key: r.key, verdict: numberFormatVerdict(r) })).filter((r) => r.verdict);
  const weakNumberFormat = numberFormat.filter((r) => r.verdict.explained);
  videos.push({
    id,
    at: report.at ?? null,
    model: report.align?.model ?? null,
    aligned: Boolean(report.align?.used),
    forced: Boolean(report.forced),
    cues: report.needFile,
    scored: scored.length,
    weak: weak.length,
    weakCues: weak.map((r) => r.key),
    weakNumberFormatCues: weakNumberFormat.map((r) => r.key),
    noWords: noWords.length,
    ...feedback(id),
    terms: termHealth(report.rows || []),
  });
}

const aligned = videos.filter((v) => v.aligned);
const scored = aligned.reduce((s, v) => s + v.scored, 0);
const weak = aligned.reduce((s, v) => s + v.weak, 0);
const weakShare = scored ? weak / scored : 0;
const weakNumberFormat = aligned.reduce((s, v) => s + v.weakNumberFormatCues.length, 0);
const noisy = aligned.filter((v) => v.timing >= NOISY_ROUNDS);

const reasons = [];
if (aligned.length >= MIN_VIDEOS && noisy.length >= NOISY_VIDEOS) {
  reasons.push(`${noisy.length} video phải sửa nhịp từ ${NOISY_ROUNDS} vòng trở lên (${noisy.map((v) => v.id).join(', ')})`);
}
if (scored && weakShare >= WEAK_SHARE) {
  reasons.push(`${(weakShare * 100).toFixed(1)}% câu chỉ khớp dưới ${Math.round(WEAK_MATCH * 100)}% (${weak}/${scored})`);
}
const verdict = reasons.length ? 'migrate' : aligned.length < MIN_VIDEOS ? 'insufficient-data' : 'ok';

if (json) {
  console.log(JSON.stringify({ verdict, reasons, weakNumberFormat, thresholds: { WEAK_MATCH, WEAK_SHARE, MIN_VIDEOS, NOISY_ROUNDS, NOISY_VIDEOS }, videos }, null, 2));
} else if (!aligned.length) {
  console.log('Chưa có video nào dùng giọng nhập kèm nhận diện từ. Không có gì để đánh giá.');
} else {
  console.log(`${aligned.length} video dùng giọng nhập · ${scored} câu có đối chiếu · ${weak} câu khớp yếu (${(weakShare * 100).toFixed(1)}%)`);
  if (weakNumberFormat) {
    console.log(`  trong đó ${weakNumberFormat}/${weak} câu khớp yếu là do SỐ VIẾT KHÁC DẠNG (chữ vs chữ số) giữa kịch bản và`
      + ' Whisper nghe được, không phải đọc sai — giọng đọc đúng, chỉ lệch định dạng khi so.'
      + ` Còn ${weak - weakNumberFormat} câu khớp yếu THẬT sau khi quy về cùng dạng số.`);
  }
  console.log('');
  for (const v of aligned) {
    const nf = v.weakNumberFormatCues.length ? ` (trong đó ${v.weakNumberFormatCues.length} do định dạng số: ${v.weakNumberFormatCues.join(', ')})` : '';
    console.log(`${v.id} · ${v.cues} câu · khớp yếu ${v.weak}${v.weakCues.length ? ` (${v.weakCues.join(', ')})` : ''}${nf}${v.noWords ? ` · ${v.noWords} câu không có mốc từ` : ''}${v.forced ? ' · nhập ép (--force)' : ''}`);
    console.log(`  dựng cảnh: ${v.rounds} vòng góp ý, ${v.timing} vòng nói về nhịp`);
    /*
     * Bảng theo TỪ chỉ in khi có `--terms`: nó trả lời một câu hỏi KHÁC với phần trên. Phần trên
     * hỏi "câu nào khớp kém"; phần này hỏi "TỪ nào backend đọc hỏng ở mọi chỗ". Cue 104 của lượt
     * d05-v06 đạt 92% — sạch theo phần trên, mà vẫn đang đọc sai "đòn bẩy".
     */
    if (argvAH.includes('--terms')) {
      const sys = v.terms.filter((t) => t.systemic);
      if (!sys.length) console.log('  theo TỪ: không cụm nào hụt ở ≥2 cue.');
      else {
        console.log(`  theo TỪ: ${sys.length} cụm HỤT Ở ≥2 CUE — lỗi hệ thống của từ, ĐỔI LỜI chứ đừng sinh lại:`);
        for (const t of sys.slice(0, 10)) {
          console.log(`    · "${t.term}" — Whisper không nghe ra ở ${t.missedIn.length}/${t.inCues.length} cue (${t.missedIn.slice(0, 8).join(', ')}${t.missedIn.length > 8 ? '…' : ''})`);
        }
        if (sys.length > 10) console.log(`    … còn ${sys.length - 10} cụm nữa (--json để xem hết)`);
      }
    }
  }
  console.log(`\nKết luận: ${verdict === 'migrate' ? 'NÊN CHUYỂN sang Whisper + CTC align' : verdict === 'ok' ? 'chưa cần đổi cách align' : `chưa đủ dữ liệu (cần ${MIN_VIDEOS} video, mới có ${aligned.length})`}`);
  for (const r of reasons) console.log(`  · ${r}`);
  console.log('\nNgưỡng và phương án thay thế: docs/decisions/voice-align.md');
}
