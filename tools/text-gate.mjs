#!/usr/bin/env node
/**
 * Chạy RIÊNG các gate về CHỮ của `verify.mjs` cho một `cues.js` bất kỳ — kể cả bản nháp chưa nằm
 * trong thư mục video, chưa có voice.js, chưa dựng cảnh nào.
 *
 *   node tools/text-gate.mjs <cues.js|script.md>  # chấm một file
 *   node tools/text-gate.mjs --all                # chấm mọi video trong design system
 *   node tools/text-gate.mjs --human [file|--all] # bảng 5 chỉ số "tính người" (CẢNH BÁO, không chặn)
 *   node tools/text-gate.mjs --human --fixture    # đối chứng trên cặp script-v1.md ↔ script-v2.md
 *   node tools/text-gate.mjs --connector-report   # bảng connector: regex \b cũ vs biên Unicode
 *   node tools/text-gate.mjs --selftest           # chứng minh 6/12 connector cũ là chữ chết
 *
 * Retro 21/09/2026 E4: script lane khoá wording xong mới phát hiện 53 cue làm đỏ `maxShortRun` và
 * `connector`, phải gộp 6 tách 3 khi chữ đã khoá. Lệnh này để chạy TRƯỚC khi nộp script.
 *
 * Exit code ≠ 0 khi có lỗi, để cắm được vào script.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CONNECTOR,
  CONNECTOR_ASCII_BUG,
  HUMAN_THRESHOLDS,
  captionPageProblems,
  continuitySignals,
  cuesFromScriptMarkdown,
  humanSignals,
  longCueProblems,
  narrationWordCount,
  narrativeCues,
  structureProblems,
  structureSpec,
  textGateProblems,
} from './lib/text-gates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DS = path.resolve(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const VIDEOS = path.join(DS, 'ui_kits/lesson-video/videos');
const args = process.argv.slice(2);

/** `.md` = bảng kịch bản của script lane · `.js` = `cues.js` đã thành file. Cùng ra một mảng cue. */
const loadCues = async (file) => {
  const abs = path.resolve(file);
  if (abs.endsWith('.md')) {
    const cues = cuesFromScriptMarkdown(fs.readFileSync(abs, 'utf8'));
    if (!cues.length) throw new Error(`${file}: không tìm thấy bảng kịch bản §2 nào để bóc cue`);
    return cues;
  }
  const mod = await import(`${pathToFileURL(abs).href}?t=${Date.now()}`);
  const cues = mod.CUES || mod.RAW;
  if (!cues?.length) throw new Error(`${file} không export CUES`);
  return cues;
};
const videoDirs = () =>
  fs.existsSync(VIDEOS)
    ? fs.readdirSync(VIDEOS, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
    : [];

// ── --selftest ────────────────────────────────────────────────────────────────────────────────
if (args.includes('--selftest')) {
  const words = ['nhưng', 'vì', 'nên', 'vậy', 'thế', 'đó', 'giờ', 'tiếp', 'còn', 'thì', 'cuối cùng', 'bây giờ'];
  const dead = words.filter((w) => !CONNECTOR_ASCII_BUG.test(`A ${w} B.`));
  const stillDead = words.filter((w) => !CONNECTOR.test(`A ${w} B.`));
  // không được bắt nhầm khi từ nối nằm bên trong một từ khác
  const falsePositive = [['thìa', 'một cái thìa nhỏ'], ['đóng', 'đóng cửa lại'], ['tiếng', 'nghe tiếng ồn']]
    .filter(([, sentence]) => CONNECTOR.test(sentence));
  console.log(`regex \\b cũ  : ${words.length - dead.length}/${words.length} khớp · CHẾT: ${dead.join(' · ')}`);
  console.log(`regex Unicode: ${words.length - stillDead.length}/${words.length} khớp${stillDead.length ? ` · CHẾT: ${stillDead.join(' · ')}` : ''}`);
  console.log(`bắt nhầm trong từ ghép: ${falsePositive.length ? falsePositive.map((f) => f[0]).join(', ') : 'không'}`);
  const ok = dead.length === 6 && stillDead.length === 0 && falsePositive.length === 0;
  console.log(ok ? '\n✓ selftest đạt' : '\n✗ selftest KHÔNG đạt');
  process.exit(ok ? 0 : 1);
}

// ── --human ───────────────────────────────────────────────────────────────────────────────────
// Năm chỉ số "tính người" (audit script #2). CẢNH BÁO, không chặn: exit 0 kể cả khi đỏ hết — đây là
// chỉ báo cho người viết, không phải điều kiện phát hành. Chỉ `--fixture` mới có exit code có nghĩa,
// vì đó là self-test của chính công cụ.
if (args.includes('--human')) {
  const FIXTURES = [
    ['script-v1.md (bị chê thiếu tính người)', 'reports/audit-2026-09-21/script-v1.md'],
    ['script-v2.md (bản sửa)', 'reports/audit-2026-09-21/script-v2.md'],
  ];
  const head = () =>
    console.log(
      `  ${'nguồn'.padEnd(34)} ${'cue'.padStart(4)} ${'mồ côi'.padStart(7)} ${'đệm'.padStart(6)} ${'xưng'.padStart(6)} ${'p/ứng'.padStart(7)} ${'hỏi'.padStart(6)}`,
    );
  const row = (label, m) =>
    console.log(
      `  ${label.padEnd(34)} ${String(m.cues).padStart(4)} ${(m.orphanPct.toFixed(0) + '%').padStart(7)} ${m.fillerPer100.toFixed(2).padStart(6)} ${m.personPer100.toFixed(2).padStart(6)} ${(m.cuesPerReaction === Infinity ? '∞' : m.cuesPerReaction.toFixed(1)).padStart(7)} ${String(m.questions).padStart(6)}`,
    );
  const t = HUMAN_THRESHOLDS;
  console.log(
    `ngưỡng: mồ côi ≤${t.orphanPct}% · đệm ≥${t.fillerPer100}/100 từ · xưng ≥${t.personPer100}/100 từ · 1 phản ứng mỗi ≤${t.cuesPerReaction} cue · 1 câu hỏi mỗi ≤${t.cuesPerQuestion} cue\n`,
  );

  if (args.includes('--fixture')) {
    head();
    const got = [];
    for (const [label, f] of FIXTURES) got.push(humanSignals(await loadCues(path.join(ROOT, f))));
    row(FIXTURES[0][0], got[0]);
    row(FIXTURES[1][0], got[1]);
    /*
     * Bảng v1/v2 của audit CHỈ đo bốn chỉ số: mồ côi · đệm · xưng · câu hỏi. Nó không có cột "phản
     * ứng cá nhân", nên cặp v1/v2 không phải bằng chứng cho chỉ số thứ năm và không được dùng để
     * chỉnh ngưỡng của nó — làm thế là chỉnh regex cho vừa một con số mình tự đặt ra.
     * Chỉ số thứ năm có fixture riêng ở dưới: `n5-02`, video audit đo 0 câu phản ứng / 54 cue.
     */
    const MEASURED = ['orphanPct', 'fillerPer100', 'personPer100', 'questions'];
    const n502 = humanSignals(await loadCues(path.join(VIDEOS, 'n5-02-ai-feedback-loop/cues.js')));
    const checks = [
      ['mồ côi giảm', got[1].orphanPct < got[0].orphanPct],
      ['tiếng đệm tăng', got[1].fillerPer100 > got[0].fillerPer100],
      ['ngôi xưng tăng', got[1].personPer100 > got[0].personPer100],
      ['câu hỏi tăng', got[1].questions > got[0].questions],
      // Audit đặt tiêu chí: v1 phải đỏ ≥4/5 chỉ số, v2 phải xanh. Đếm SỐ chỉ số, không dùng
      // `.some()` — `.some()` vẫn xanh khi bốn trong năm phép đo hỏng, tức là không biết fail.
      [`v1 đỏ ≥4/5 chỉ số (đang ${got[0].warnings.length}/5)`, got[0].warnings.length >= 4],
      [`v2 xanh cả 4 chỉ số audit đã đo`, !MEASURED.some((k) => got[1].flagged[k])],
      // Giá trị audit đã in — chốt lại để đổi cách đếm là biết ngay, không trôi âm thầm.
      ['v1/v2 đệm = 0.49 → 1.13 đúng như audit', got[0].fillerPer100.toFixed(2) === '0.49' && got[1].fillerPer100.toFixed(2) === '1.13'],
      ['v1/v2 xưng = 0.97 → 1.85 đúng như audit', got[0].personPer100.toFixed(2) === '0.97' && got[1].personPer100.toFixed(2) === '1.85'],
      [`n5-02 đỏ đúng dòng "phản ứng cá nhân" (${n502.reactions}/${n502.cues} cue)`, n502.flagged.reactions],
    ];
    console.log('');
    for (const [name, ok] of checks) console.log(`  ${ok ? '✓' : '✗'} ${name}`);
    if (got[0].warnings.length) console.log(`\n  v1 đỏ: ${got[0].warnings.join(' · ')}`);
    if (got[1].warnings.length) console.log(`\n  v2 đỏ: ${got[1].warnings.join(' · ')}`);
    const ok = checks.every(([, v]) => v);
    console.log(ok ? '\n✓ đối chứng v1↔v2 đạt' : '\n✗ đối chứng v1↔v2 KHÔNG đạt');
    process.exit(ok ? 0 : 1);
  }

  const targets = args.includes('--all') || !args.some((a) => !a.startsWith('--'))
    ? videoDirs().map((d) => [`videos/${d}`, path.join(VIDEOS, d, 'cues.js')]).filter(([, f]) => fs.existsSync(f))
    : [[path.relative(ROOT, path.resolve(args.find((a) => !a.startsWith('--')))), args.find((a) => !a.startsWith('--'))]];
  head();
  const flagged = [];
  for (const [label, file] of targets) {
    const m = humanSignals(await loadCues(file));
    row(label, m);
    if (m.warnings.length) flagged.push([label, m.warnings]);
  }
  console.log('');
  for (const [label, ws] of flagged) for (const w of ws) console.log(`  ! ${label}: ${w}`);
  console.log(`\n${flagged.length}/${targets.length} nguồn có ít nhất một chỉ số dưới ngưỡng (cảnh báo, không chặn).`);
  process.exit(0);
}

// ── --connector-report ────────────────────────────────────────────────────────────────────────
if (args.includes('--connector-report')) {
  console.log('connector khớp được / tổng cue — regex \\b cũ vs biên Unicode\n');
  console.log(`  ${'video'.padEnd(30)} ${'cue'.padStart(4)} ${'cũ'.padStart(5)} ${'mới'.padStart(5)} ${'ngưỡng'.padStart(7)}  kết luận`);
  let changed = 0;
  let regressed = 0;
  for (const dir of videoDirs()) {
    const file = path.join(VIDEOS, dir, 'cues.js');
    if (!fs.existsSync(file)) continue;
    let cues;
    try { cues = await loadCues(file); } catch { continue; }
    const before = continuitySignals(cues, { connector: CONNECTOR_ASCII_BUG }).connected;
    const after = continuitySignals(cues, { connector: CONNECTOR }).connected;
    const need = Math.ceil(cues.length * 0.12);
    const passBefore = before >= need;
    const passAfter = after >= need;
    if (before !== after) changed += 1;
    if (passBefore && !passAfter) regressed += 1;
    const verdict = passBefore === passAfter ? (passAfter ? 'đạt → đạt' : 'trượt → trượt') : passAfter ? 'trượt → ĐẠT' : 'ĐẠT → TRƯỢT ⚠' ;
    console.log(`  ${dir.padEnd(30)} ${String(cues.length).padStart(4)} ${String(before).padStart(5)} ${String(after).padStart(5)} ${String(need).padStart(7)}  ${verdict}`);
  }
  console.log(`\n  ${changed} video đổi SỐ connector · ${regressed} video chuyển từ đạt sang trượt`);
  process.exit(regressed ? 1 : 0);
}

// ── chấm ──────────────────────────────────────────────────────────────────────────────────────
const { paginate } = await import(pathToFileURL(path.join(DS, 'lib/captions.js')).href);

/**
 * Tìm `REQUEST.md` của video mà `cues.js` này thuộc về, để bật ba check cấu trúc §3i. Bản nháp
 * không nằm trong thư mục video thì không có REQUEST → check tự về mức CẢNH BÁO.
 */
function requestOf(file) {
  const m = path.resolve(file).match(/videos\/([^/]+)\//);
  if (!m) return null;
  const req = path.join(ROOT, 'projects', m[1], 'REQUEST.md');
  return fs.existsSync(req) ? fs.readFileSync(req, 'utf8') : null;
}

async function grade(file, label) {
  const cues = await loadCues(file);
  // `longForm` theo chính độ dài đo/ước được, không theo `REQUEST.md` (file này chấm cả bản nháp
  // chưa có project nào). >3 phút ở nhịp 5,12 âm tiết/giây ≈ 920 âm tiết.
  const words = narrationWordCount(cues);
  const spec = structureSpec(requestOf(file));
  const structure = structureProblems(cues, label, spec);
  const problems = [
    ...textGateProblems(cues, label, { longForm: words >= 920 }),
    ...longCueProblems(cues, label),
    ...captionPageProblems(cues, paginate, label),
    ...structure.problems,
  ];
  const q = continuitySignals(cues);
  const h = humanSignals(cues);
  console.log(`${label}`);
  console.log(`  ${words} từ · ${cues.length} cue · nhịp câu ${[...q.buckets].join('/')} · connector ${q.connected}/${cues.length} (cần ${Math.ceil(cues.length * 0.12)}) · chuỗi câu ngắn dài nhất ${q.maxShortRun} (trần 3) · mở lặp "${q.repeatedOpening[0]}"×${q.repeatedOpening[1]} (trần 4)`);
  // §3b (`script-craft.md:67`) nói "ba câu LIÊN TIẾP cùng mở đầu" — cảnh báo, không chặn: 11 video
  // hiện có đều ≤3, đưa lên mức chặn là đổi luật phát hành, không phải việc của gate.
  if (q.maxOpeningRun >= 3) {
    console.log(`  ! ${q.maxOpeningRun} câu LIÊN TIẾP cùng mở bằng "${q.openingRunWord}" (§3b: ba câu liên tiếp là phải viết lại)`);
  }
  console.log(`  tính người: mồ côi ${h.orphanPct.toFixed(0)}% · đệm ${h.fillerPer100.toFixed(2)} · xưng ${h.personPer100.toFixed(2)} · phản ứng ${h.reactions} · hỏi ${h.questions}  (--human để xem ngưỡng)`);
  // Dòng THỨ HAI cho phần trần thuật: 26 cue quiz kéo chỉ số toàn bài xuống dù phần cũ không đổi
  // một chữ (đo 22/09/2026). Chỉ in khi bài thật sự CÓ phần quiz/lặng, để video cũ không thêm nhiễu.
  const nar = narrativeCues(cues);
  if (nar.length && nar.length !== cues.length) {
    const hn = humanSignals(nar);
    console.log(`  · riêng TRẦN THUẬT (${nar.length}/${cues.length} cue, bỏ quiz + cue lặng): mồ côi ${hn.orphanPct.toFixed(0)}% · đệm ${hn.fillerPer100.toFixed(2)} · xưng ${hn.personPer100.toFixed(2)} · phản ứng ${hn.reactions} · hỏi ${hn.questions}`);
  }
  if (problems.length) for (const p of problems) console.log(`  ✗ ${p}`);
  else console.log('  ✓ mọi gate chữ đều xanh');
  // Năm chỉ số "tính người" là CẢNH BÁO — in ra nhưng KHÔNG cộng vào exit code.
  for (const w of h.warnings) console.log(`  ! ${w}`);
  for (const w of structure.warnings) console.log(`  ! ${w}`);
  return problems.length;
}

let bad = 0;
if (args.includes('--all')) {
  for (const dir of videoDirs()) {
    const file = path.join(VIDEOS, dir, 'cues.js');
    if (fs.existsSync(file)) bad += await grade(file, `videos/${dir}`);
  }
} else {
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) {
    const usage = 'usage: node tools/text-gate.mjs <cues.js|script.md> | --all | --human [--all|--fixture] | --connector-report | --selftest';
    if (args.includes('--help') || args.includes('-h')) { console.log(usage); process.exit(0); }
    console.error(usage);
    process.exit(1);
  }
  bad += await grade(file, path.relative(ROOT, path.resolve(file)));
}
process.exit(bad ? 1 : 0);
