#!/usr/bin/env node
/**
 * Chấm rủi ro từng cue TRƯỚC khi đẩy Kaggle — bắt cue nhiều khả năng TTS đọc lệch, để probe riêng
 * (~3 phút, xem voice-kaggle.md) thay vì đợi nghe hết cả batch ~50 cue (~14 phút) rồi mới biết sai.
 * Không gọi Kaggle, không sinh giọng — chỉ đọc `cues.js` và các sổ phát âm đã có trên đĩa.
 *
 *   node tools/voice-risk.mjs <video dir hoặc cues.js> [--pronounce <project pronounce.json>]
 *     [--write-batch [--out <dir>]] [--json]
 *   node tools/voice-risk.mjs <video dir> --self-check   # so cờ với align-report.json thật (video đó)
 *   node tools/voice-risk.mjs --self-check                # so cờ trên MỌI video đã có align-report.json
 *
 * Bốn dấu hiệu rủi ro, mỗi cái đo được KHÔNG cần nghe audio:
 *   1. số ≥2 chữ số viết bằng chữ ("một chín bảy ba", "hai mươi bảy nghìn") — xem tools/lib/voice-numbers.mjs.
 *   2. token tiếng Anh không có trong `pronounce-verified.json` ∪ `pronounce.json` của project — lọc
 *      qua một stoplist từ Việt không dấu hay bị nhận nhầm (đo từ 4 video thật, xem comment STOPLIST).
 *   3. chuỗi liệt kê ≥3 phần tử cách nhau bằng dấu phẩy trong một câu.
 *   4. cue rất ngắn (≤5 âm tiết) mở đầu cả bài hoặc mở đầu một section.
 *
 * Mặc định CHỈ IN — không ghi file nào. `--write-batch` mới ghi `<out>/risk-batch.jsonl` (mặc định
 * `out` = `projects/<id>/voice-script`) để push riêng batch rủi ro trước cả video; không truyền thì
 * chạy xong không để lại dấu vết trên đĩa (an toàn để thăm dò/so sánh ngưỡng nhiều lần).
 *
 * `--self-check` đọc `voice/out/<id>/align-report.json` của CHÍNH video (phải đã nhập giọng một lần)
 * và in precision/recall: trong các cue công cụ này gắn cờ, bao nhiêu cue THẬT SỰ khớp yếu
 * (matchRatio < 0.65 — cùng ngưỡng WEAK_MATCH của tools/align-health.mjs)? Không truyền video dir thì
 * tự dò MỌI video có `voice/out/<id>/align-report.json` (khớp `cues.js` qua tên thư mục cùng id trong
 * `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/`) và in bảng tổng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { fileURLToPath } from 'node:url';
import { findNumberWords } from './lib/voice-numbers.mjs';
import { collectTerms } from './lib/voice-terms.mjs';
import { BACKENDS, backendFromRequest, DEFAULT_BACKEND, resolveBackend } from './lib/voice-backends.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const usage = `Usage: node tools/voice-risk.mjs <video dir hoặc cues.js> [--pronounce <file>] [--terms] [--write-batch [--out <dir>]] [--json] [--self-check]
       --terms  bảng THUẬT NGỮ LẶP (cụm 2–3 âm tiết ở ≥2 cue) — nghe kiểm ngay lượt probe đầu
       node tools/voice-risk.mjs --self-check   # tự chấm mọi video đã có align-report.json`;
const fail = (m) => { console.error(`✗ ${m}\n${usage}`); process.exit(1); };
const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(usage); process.exit(0); }
const VALUE_FLAGS = new Set(['pronounce', 'out', 'backend']);
const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { positional.push(argv[i]); continue; }
  const name = argv[i].slice(2);
  flags[name] = VALUE_FLAGS.has(name) ? argv[++i] : true;
}
const [input] = positional;
if (!input && !flags['self-check']) fail('thiếu <video dir hoặc cues.js>');

// ── sổ phát âm: global (file của lane này) ∪ project (nếu có / --pronounce chỉ định) ───────────────
const readJson = (file) => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; } };
const globalVerified = readJson(path.join(ROOT, 'pronounce-verified.json'));

// ── STOPLIST — từ Việt viết không dấu, không phải tiếng Anh. Đo bằng cách quét thật `cues.js` của
// demo-ai-history-three-turns, n5-01, n5-03, n5-05 (4 video có align-report) và loại tay các từ Việt
// hợp lệ khỏi 176 token toàn-chữ-Latin tìm được. MỞ RỘNG khi gặp false positive mới ở video khác.
const STOPLIST = new Set([
  'ai', 'ra', 'khi', 'cho', 'hai', 'ba', 'hay', 'trong', 'theo', 'tin', 'sai', 'xong', 'sau', 'nhanh',
  'tay', 'nghe', 'nhau', 'quay', 'giao', 'quy', 'ngay', 'tra', 'ghi', 'chung', 'ro', 'anh', 'nay', 'con',
  'sang', 'qua', 'xem', 'quan', 'trang', 'vi', 'sao', 'dung', 'chi', 'gian', 'thay', 'nhu', 'xa', 'so',
  'khung', 'ta', 'tai', 'bao', 'song', 'do', 'thang', 'quen', 'dang', 'khai', 'xin', 'thu', 'khoa', 'uy',
  'vua', 'suy', 'chim', 'lan', 'tung', 'cao', 'thao', 'mang', 'ca', 'ngang', 'go', 'phim', 'xe', 'mua',
  'quanh', 'ty', 'vai', 'minh', 'non', 'coi', 'che', 'im', 'kinh', 'doanh', 'nha',
]);

const syllables = (s) => (String(s || '').match(/\S+/g) || []).length;

/** ≥3 phần tử cách nhau bằng dấu phẩy trong MỘT câu (không tính khoảng dừng cuối). */
function enumeration(text) {
  const parts = text.split(',').map((p) => p.trim()).filter(Boolean);
  return parts.length >= 3 ? parts.length : 0;
}

/**
 * Ngưỡng đã CHỈNH bằng ground-truth (không đoán): quét thật 4 cues.js có align-report (demo-ai-history,
 * n5-01, n5-03, n5-05 — 222 câu, 10 câu khớp yếu matchRatio<0.65). "Có ≥1 token tiếng Anh chưa xác nhận"
 * một mình gắn cờ 92% cue của n5-01 (video PM đặc từ chuyên ngành) — vô dụng. Tỉ lệ token-lạ/tổng-từ
 * của CÂU mới tách được cue thật rủi ro: một từ lạ giữa một câu dài ít rủi ro hơn một từ lạ trong câu
 * ngắn (matchRatio là tỉ lệ, một từ sai kéo tỉ lệ xuống nhiều hơn khi câu ngắn). EN_RATIO=0.11 là điểm
 * gãy: xuống 0.10 thì gắn cờ vọt lên ~46% cho +0 recall; lên 0.12 thì rơi mất 2 cue khớp yếu thật.
 * Kết quả trên 222 câu: gắn cờ 25,7% · recall 80% (8/10) · bỏ sót 2 cue có đúng một từ vay mượn duy
 * nhất chôn giữa câu rất dài (n5-03 #46 "team", n5-01 #29 "module") — chấp nhận, không có cách rẻ nào
 * bắt được ca này mà không kéo tỉ lệ gắn cờ vượt ~25%.
 */
const EN_RATIO = 0.11;
const WEAK_MATCH = 0.65; // cùng ngưỡng WEAK_MATCH của tools/align-health.mjs

/** Token tiếng Anh CHƯA có trong sổ phát âm (`known`) — trả về danh sách token gốc (giữ hoa/thường). */
function englishTokens(text, known) {
  const found = [];
  for (const m of String(text).matchAll(/[\p{L}\p{N}'-]+/gu)) {
    const w = m[0];
    if (!/^[A-Za-z][A-Za-z'-]*$/.test(w)) continue; // có ký tự có dấu → không phải nghi vấn
    const lower = w.toLowerCase();
    if (STOPLIST.has(lower)) continue;
    if (known.has(lower)) continue;
    found.push(w);
  }
  return [...new Set(found)];
}

/** Phân tích rủi ro cho MỘT video. `cuesFile` = đường dẫn cues.js. */
async function analyzeVideo(cuesFile, pronounceOverride, backend = BACKENDS[DEFAULT_BACKEND]) {
  const id = path.basename(path.dirname(cuesFile));
  const mod = await import(`${pathToFileURL(cuesFile).href}?t=${Date.now()}`);
  const CUES = mod.CUES || [];
  if (!CUES.length) throw new Error(`${cuesFile} không export CUES`);

  const projectPronounceFile = pronounceOverride
    ? path.resolve(pronounceOverride)
    : path.join(ROOT, 'projects', id, 'pronounce.json');
  const projectPronounce = fs.existsSync(projectPronounceFile) ? readJson(projectPronounceFile) : {};
  const known = new Set();
  for (const key of [...Object.keys(globalVerified), ...Object.keys(projectPronounce)]) {
    for (const w of key.toLowerCase().split(/\s+/)) known.add(w);
  }

  const spoken = CUES.filter((c) => !c.silent);
  const risky = [];
  let prevSection = null;
  for (const c of spoken) {
    const words = syllables(c.text);
    const numberRuns = findNumberWords(c.text).filter((r) => r.digits.length >= 2);
    const enTokens = englishTokens(c.text, known);
    const enRatio = words ? enTokens.length / words : 0;
    const listCount = enumeration(c.text);
    const isSectionStart = c.section != null && c.section !== prevSection;
    const shortOpener = (c.n === spoken[0].n || isSectionStart) && words <= 5;
    prevSection = c.section ?? prevSection;

    /*
     * Gate phụ thuộc BACKEND. Hai dấu hiệu chính của OmniVoice — số viết bằng chữ và token tiếng
     * Anh lạ — là điểm yếu CỦA RIÊNG NÓ, không phải luật chung của TTS. Đo 21/09/2026 trên ZeroTTS
     * `baotrang`: Z1 (số viết chữ) khớp Whisper 89,0% ≈ Z2 (chữ số) 89,4%, và `ChatGPT` đọc đúng.
     * Gắn cờ hai thứ đó cho ZeroTTS là báo oan, và báo oan thì lần sau không ai đọc bảng nữa.
     *
     * Còn lại gì? CHƯA CÓ GROUND TRUTH cho ZeroTTS — không video nào của nó có `align-report.json`,
     * nên không hiệu chỉnh được ngưỡng như đã làm với OmniVoice. Vì vậy chế độ này cố ý gắn cờ RẤT
     * THƯA, chỉ hai dấu hiệu không phụ thuộc model và hiếm: liệt kê ≥5 phần tử trong một câu, và
     * cue mở đầu ≤5 âm tiết. Thử ngưỡng lỏng hơn (liệt kê ≥3) trên chính 403 câu của OmniVoice:
     * gắn cờ vọt lên 32,5% mà recall chỉ 20% — nhiễu nhiều hơn tín hiệu. Khi có video ZeroTTS đầu
     * tiên đã nhập giọng, chạy `--self-check --backend zerotts:<giọng>` rồi chỉnh lại ở đây.
     */
    const UNCALIBRATED_LIST = 5;
    const flagged = backend.readsDigits && backend.readsEnglish
      ? (listCount >= UNCALIBRATED_LIST || shortOpener)
      : (numberRuns.length > 0 || enRatio >= EN_RATIO);
    if (!flagged) continue;

    const reasons = [];
    if (!backend.readsDigits && numberRuns.length) reasons.push(`số viết chữ: ${numberRuns.map((r) => `"${r.source.trim()}" (~${r.digits})`).join(', ')}`);
    if (!backend.readsEnglish && enTokens.length) reasons.push(`tiếng Anh chưa xác nhận (${(enRatio * 100).toFixed(0)}% câu): ${enTokens.join(', ')}`);
    if (listCount) reasons.push(`chuỗi liệt kê ${listCount} phần tử`);
    if (shortOpener) reasons.push(`cue mở đầu quá ngắn (${words} âm tiết)`);
    risky.push({ n: c.n, text: c.text, reasons });
  }
  return { id, spoken, risky };
}

/** So cờ đã gắn với align-report.json thật của CÙNG video — precision/recall. */
function selfCheck(id, spoken, risky) {
  const reportFile = path.join(ROOT, 'voice/out', id, 'align-report.json');
  if (!fs.existsSync(reportFile)) return null;
  const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
  const weakNs = new Set(report.rows.filter((r) => r.matchRatio != null && r.matchRatio < WEAK_MATCH).map((r) => r.n));
  const flaggedNs = new Set(risky.map((r) => r.n));
  let tp = 0;
  for (const n of flaggedNs) if (weakNs.has(n)) tp++;
  const precision = flaggedNs.size ? tp / flaggedNs.size : null;
  const recall = weakNs.size ? tp / weakNs.size : null;
  const share = spoken.length ? flaggedNs.size / spoken.length : 0;
  return {
    id, spoken: spoken.length, flagged: flaggedNs.size, weak: weakNs.size, truePositive: tp,
    precision, recall, flaggedShare: share, missedWeak: [...weakNs].filter((n) => !flaggedNs.has(n)),
  };
}

const VIDEOS_DIR = path.join(ROOT, 'vinuni-lesson-video-ds/ui_kits/lesson-video/videos');
/** Tìm cues.js của một id trong cây thư mục video của design system. */
function findCuesFile(id) {
  const f = path.join(VIDEOS_DIR, id, 'cues.js');
  return fs.existsSync(f) ? f : null;
}

// ── --self-check KHÔNG kèm video: tự dò mọi video có voice/out/<id>/align-report.json ──────────────
if (flags['self-check'] && !input) {
  const outRoot = path.join(ROOT, 'voice/out');
  const ids = fs.existsSync(outRoot)
    ? fs.readdirSync(outRoot).filter((id) => fs.existsSync(path.join(outRoot, id, 'align-report.json')))
    : [];
  if (!ids.length) fail('không tìm thấy video nào có voice/out/<id>/align-report.json');
  /*
   * Bộ ground-truth này TOÀN BỘ do OmniVoice sinh ra, nên mặc định phải chấm bằng luật OmniVoice —
   * nếu không, con số hiệu chỉnh (gắn cờ 101/403 · recall 8/10) sẽ âm thầm đổi khi thêm backend.
   * `--backend` chỉ để XEM luật của backend khác sẽ gắn cờ thế nào trên cùng bộ câu đó.
   */
  let gBackend;
  try { gBackend = resolveBackend(flags.backend, { fallback: DEFAULT_BACKEND }); } catch (e) { fail(e.message); }
  const rows = [];
  for (const id of ids.sort()) {
    const cuesFile = findCuesFile(id);
    if (!cuesFile) { console.error(`  ⚠ bỏ qua ${id}: không thấy cues.js trong ${path.relative(ROOT, VIDEOS_DIR)}`); continue; }
    const { spoken, risky } = await analyzeVideo(cuesFile, undefined, gBackend.backend);
    const check = selfCheck(id, spoken, risky);
    if (check) rows.push(check);
  }
  const totals = rows.reduce((s, r) => ({
    spoken: s.spoken + r.spoken, flagged: s.flagged + r.flagged, weak: s.weak + r.weak, tp: s.tp + r.truePositive,
  }), { spoken: 0, flagged: 0, weak: 0, tp: 0 });
  if (flags.json) {
    console.log(JSON.stringify({ rows, totals, flaggedShare: totals.spoken ? totals.flagged / totals.spoken : 0, recall: totals.weak ? totals.tp / totals.weak : null }, null, 2));
  } else {
    console.log(`self-check tổng (ngưỡng khớp yếu ${WEAK_MATCH}) — ${rows.length} video có align-report.json · luật backend "${gBackend.spec}"\n`);
    for (const r of rows) {
      console.log(`  ${r.id.padEnd(32)} gắn cờ ${String(r.flagged).padStart(3)}/${String(r.spoken).padStart(3)} · khớp yếu ${r.weak} · TP ${r.truePositive}`);
    }
    const share = totals.spoken ? totals.flagged / totals.spoken : 0;
    const recall = totals.weak ? totals.tp / totals.weak : null;
    console.log(`\nTỔNG: gắn cờ ${totals.flagged}/${totals.spoken} (${(share * 100).toFixed(1)}%) · khớp yếu ${totals.weak} · recall ${recall == null ? '—' : (recall * 100).toFixed(1) + '%'} (${totals.tp}/${totals.weak})`);
  }
  process.exit(0);
}

// ── một video cụ thể ─────────────────────────────────────────────────────────────────────────────
const cuesFile = input.endsWith('.js') ? path.resolve(input) : path.resolve(input, 'cues.js');
if (!fs.existsSync(cuesFile)) fail(`${cuesFile} không tồn tại`);
// Backend của CHÍNH video này: --backend → dòng `voice:` trong REQUEST.md → mặc định.
const vid = path.basename(path.dirname(cuesFile));
const reqFile = path.join(ROOT, 'projects', vid, 'REQUEST.md');
const reqSpec = fs.existsSync(reqFile) ? backendFromRequest(fs.readFileSync(reqFile, 'utf8')) : null;
let picked;
try { picked = resolveBackend(flags.backend || reqSpec, { fallback: DEFAULT_BACKEND }); } catch (e) { fail(e.message); }
let analysis;
try { analysis = await analyzeVideo(cuesFile, flags.pronounce, picked.backend); } catch (e) { fail(e.message); }
const { id, spoken, risky } = analysis;

if (flags['self-check']) {
  const out = selfCheck(id, spoken, risky);
  if (!out) fail(`không thấy voice/out/${id}/align-report.json — video này chưa nhập giọng, không tự chấm được`);
  if (flags.json) console.log(JSON.stringify(out, null, 2));
  else {
    console.log(`${id} · self-check (ngưỡng khớp yếu ${WEAK_MATCH})`);
    console.log(`  gắn cờ ${out.flagged}/${out.spoken} cue (${(out.flaggedShare * 100).toFixed(1)}%) · thật sự khớp yếu ${out.weak}`);
    console.log(`  precision ${out.precision == null ? '—' : (out.precision * 100).toFixed(1) + '%'} · recall ${out.recall == null ? '—' : (out.recall * 100).toFixed(1) + '%'}`);
    if (out.missedWeak.length) console.log(`  bỏ sót (khớp yếu nhưng không gắn cờ): câu ${out.missedWeak.join(', ')}`);
  }
  process.exit(0);
}

// ── in danh sách rủi ro; `--write-batch` mới ghi risk-batch.jsonl (mặc định KHÔNG ghi gì) ──────────
if (flags['write-batch'] && risky.length) {
  const outDir = path.resolve(flags.out ?? path.join('projects', id, 'voice-script'));
  fs.mkdirSync(outDir, { recursive: true });
  const jsonl = risky.map((r) => JSON.stringify({ id: String(r.n).padStart(2, '0'), text: r.text, language_id: 'vi' })).join('\n');
  fs.writeFileSync(path.join(outDir, 'risk-batch.jsonl'), `${jsonl}\n`);
}

if (flags.json) {
  console.log(JSON.stringify({ id, spoken: spoken.length, risky: risky.length, cues: risky, wroteBatch: Boolean(flags['write-batch'] && risky.length) }, null, 2));
} else {
  console.log(`${id} · ${spoken.length} câu có lời · ${risky.length} câu rủi ro (${((risky.length / spoken.length) * 100).toFixed(1)}%)`);
  for (const r of risky) {
    console.log(`  câu ${r.n}: ${r.reasons.join(' · ')}`);
    console.log(`    "${r.text}"`);
  }
  if (flags['write-batch'] && risky.length) {
    const outDir = path.resolve(flags.out ?? path.join('projects', id, 'voice-script'));
    console.log(`\n✓ đã ghi ${path.relative(process.cwd(), path.join(outDir, 'risk-batch.jsonl'))} — push riêng batch này trước khi đẩy cả video.`);
  } else if (risky.length) {
    console.log('\n(chỉ in — dùng --write-batch để ghi risk-batch.jsonl)');
  } else {
    console.log('  không có cue nào bị gắn cờ.');
  }

  /*
   * `--terms`: THUẬT NGỮ LẶP — cụm 2–3 âm tiết xuất hiện ở ≥2 cue. Đây là tập mà một backend đọc
   * hỏng sẽ hỏng Ở MỌI CHỖ, nên nó phải được nghe kiểm NGAY Ở LƯỢT PROBE ĐẦU, trước khi sinh cả
   * video. Lượt d05-v06: "đòn bẩy" chỉ lộ sau 2 lượt Kaggle vì không ai nhìn theo trục này (F4).
   * Sau khi có giọng, `align-health --terms` chấm đúng tập này bằng cái Whisper nghe được.
   */
  if (flags.terms) {
    const risk = new Set(risky.map((r) => r.n));
    const terms = collectTerms(spoken, { minCues: 2 }).filter((t) => t.cues.length >= 2);
    console.log(`\nTHUẬT NGỮ LẶP — ${terms.length} cụm xuất hiện ở ≥2 cue. Nghe kiểm chúng ở lượt probe đầu:`);
    for (const t of terms.slice(0, 15)) {
      const risky2 = t.cues.filter((n) => risk.has(n));
      console.log(`  "${t.term}" — ${t.cues.length} cue (${t.cues.slice(0, 8).join(', ')}${t.cues.length > 8 ? '…' : ''})${risky2.length ? ` · ${risky2.length} trong đó đã bị gắn cờ` : ''}`);
    }
    if (terms.length > 15) console.log(`  … còn ${terms.length - 15} cụm (--json để xem hết)`);
    console.log('  → một cụm đọc hỏng ở ≥2 cue là lỗi HỆ THỐNG: đổi lời, đừng sinh lại (align-health --terms xác nhận sau).');
  }
}
