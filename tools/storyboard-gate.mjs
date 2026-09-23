#!/usr/bin/env node
/**
 * Gate cho `projects/<id>/storyboard.json` — khai báo có cấu trúc của phần HÌNH.
 *
 *   node tools/storyboard-gate.mjs --video <id>
 *
 * Vì sao: thông tin "cảnh này ẩn dụ gì · mốc nhấn neo vào cụm từ nào · chữ gì lên hình" ĐÃ tồn tại
 * nhưng ở dạng văn xuôi không kiểm được (`STORYBOARD.md` + 88 trường `visual:` trong `cues.js`).
 * Ba lớp lỗi dưới đây vì vậy không ai bắt, và cả ba đều đã cắn thật ít nhất một lần:
 *
 *   G1  chữ trên hình chép lại nguyên văn lời đọc — người xem đọc hai lần cùng một câu
 *
 * G1 có HAI loại phần tử được miễn THEO THIẾT KẾ, khai bằng `kind` ngay trong `onScreenText`:
 *   `plaque`  bia đá khắc bài học — chỗ lời đọc được khắc LẠI; lặp là chủ đích
 *   `endcard` câu chốt cuối phim, thiết kế để hiện đúng lúc được đọc
 * Ngoài hai loại đó, một chuỗi lẻ vẫn miễn được qua `echoOk: { "<chuỗi>": "<lý do>" }` — nhưng phải
 * có lý do. Mọi miễn trừ đều được IN RA mỗi lần chạy, không im lặng.
 *   G2  cảnh không có chuyển động mang nghĩa, hoặc mốc nhấn neo vào cụm từ KHÔNG có trong cue
 *   G3  `beatT('X', '…')` trong code mà `storyboard.json` không khai — hình và khai báo lệch nhau
 *
 * G2 làm đúng phép kiểm mà `beatT()` làm lúc render (`lib/poster/stage.jsx`), nhưng chạy TRƯỚC khi
 * viết một dòng JSX. G3 là chiều ngược lại: code không được có mốc nhấn nào nằm ngoài khai báo.
 *
 * Exit: 0 xanh · 1 có vi phạm · 2 sai cách gọi / thiếu file. Không phụ thuộc mạng, không dependency.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripComments } from './lib/source-scan.mjs';
import { licenseAllowed, readPolicy } from './lib/image-license.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(REPO, 'vinuni-lesson-video-ds');
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Kiểm storyboard.json của một video so với cues.js và code cảnh.

  node tools/storyboard-gate.mjs --video <id> [--scenes <glob,glob>] [--json]

  --scenes  chỉ soát cảnh khớp glob (vd \`c4-*,quiz-*\`) — lane chỉ thấy đỏ của phần mình

  G1 chữ trên hình không lặp lời đọc (nhãn ≤3 từ, kind plaque/endcard, hoặc echoOk có lý do)
  G2 mỗi cảnh ≥1 mốc nhấn, và mỗi \`anchor\` phải có trong \`text\` của cue khai kèm
  G3 mọi beatT('cảnh','cụm') trong chapter-*.jsx phải có mặt trong storyboard.json
  G4 mỗi \`sfx\`/\`ambience\` khai phải có id trong sfx.json, file có mặt, trần accent 4, mật độ
     foley trong ngân sách, và hai tiếng cùng lớp không chồng nhau <150 ms (trừ \`burst\`)
  G6 mỗi ảnh trong \`images.js\` phải: có file · license trong images.policy.json · kind "use" có credit và được cảnh dùng
     cho phép (NC/ND = đỏ) · có credit khi license đòi ghi công · 2,5–8 s mỗi lần hiện · không đè
     mốc accent ±0,5 s · slot có trong code · hasFace ở cảnh rủi ro = đỏ
  G8 CẢNH BÁO: chữ trên hình toàn tiếng Anh >2 từ — chữ để HIỂU phải là tiếng Việt khớp lời đọc.
     Tắt từng chuỗi bằng \`allowEnglish: [...]\` (cấp cảnh hoặc cấp file) hoặc \`kind: "mock"\`.
exit 0 xanh · 1 vi phạm · 2 sai cách gọi (gồm: thiếu file .wav / .mp4 — kèm lệnh tải)`);
  process.exit(0);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { flags[argv[i].slice(2)] = next; i++; } else flags[argv[i].slice(2)] = true;
}
const videoId = flags.video;
if (!videoId || videoId === true) fail('usage: node tools/storyboard-gate.mjs --video <id>');

const sbFile = path.join(REPO, 'projects', videoId, 'storyboard.json');
const base = path.join(DS, 'ui_kits/lesson-video/videos', videoId);
if (!fs.existsSync(sbFile)) fail(`không có ${path.relative(REPO, sbFile)} — lane kịch bản nộp file này ở Stage 1`);
if (!fs.existsSync(base)) fail(`không có thư mục cảnh ${path.relative(REPO, base)}`);

let sb;
try { sb = JSON.parse(fs.readFileSync(sbFile, 'utf8')); } catch (e) { fail(`storyboard.json hỏng: ${e.message}`); }
if (!Array.isArray(sb.scenes) || !sb.scenes.length) fail('storyboard.json: thiếu mảng `scenes`');

/*
 * ── KIỂM SCHEMA TRƯỚC KHI LẶP ────────────────────────────────────────────────────────────────
 * Các trường dạng danh sách phải luôn là mảng, kể cả khi chỉ có một mục, để gate không ném
 * stack trace giữa chừng. Lane đọc stack trace của một công cụ không phải của mình thì mất 10–30
 * phút để hiểu nó đang nói cái gì; một dòng tiếng Việt nói đúng cảnh nào, trường nào thì mất 10
 * giây. Kiểm ở đây, trước mọi vòng lặp.
 */
{
  const ARRAY_FIELDS = ['cues', 'beats', 'onScreenText'];
  const schema = [];
  for (const [i, sc] of sb.scenes.entries()) {
    const at = `scenes[${i}]${sc && sc.id ? ` (id "${sc.id}")` : ''}`;
    if (typeof sc !== 'object' || sc === null || Array.isArray(sc)) { schema.push(`${at}: phải là một object`); continue; }
    if (!sc.id) schema.push(`${at}: thiếu \`id\``);
    for (const k of ARRAY_FIELDS) {
      if (sc[k] !== undefined && !Array.isArray(sc[k])) {
        schema.push(`${at}: trường \`${k}\` cấp cảnh phải là MẢNG (đang là ${Array.isArray(sc[k]) ? 'mảng' : typeof sc[k]}) — kể cả khi chỉ có một mục: \`"${k}": [{ … }]\``);
      }
    }
    for (const [j, b] of (Array.isArray(sc.beats) ? sc.beats : []).entries()) {
      if (typeof b !== 'object' || b === null) schema.push(`${at}.beats[${j}]: phải là một object`);
    }
  }
  const dup = sb.scenes.map((sc) => sc && sc.id).filter(Boolean);
  for (const id of new Set(dup)) if (dup.filter((x) => x === id).length > 1) schema.push(`có ${dup.filter((x) => x === id).length} cảnh cùng \`id\` "${id}" — id phải là duy nhất`);
  if (schema.length) {
    console.error(`✗ storyboard.json sai SCHEMA (${schema.length} chỗ) — sửa xong rồi gate mới chạy được:`);
    for (const m of schema) console.error(`  · ${m}`);
    process.exit(2);
  }
}

/*
 * `--scenes <glob>` — chỉ soát phần của mình. Hai lane dựng song song thì mỗi lane chỉ muốn thấy
 * đỏ của mình; ở lượt trước họ phải grep output để đoán đỏ nào của ai (F12). Glob đơn giản:
 * `c4-*,c5-*` hoặc `quiz-*`. Không truyền = mọi cảnh, y như trước.
 */
const sceneFilter = (() => {
  const raw = flags.scenes;
  if (!raw || raw === true) return null;
  const res = String(raw).split(',').map((g) => new RegExp(`^${g.trim().replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`));
  return (id) => res.some((re) => re.test(String(id)));
})();
if (sceneFilter) {
  const before = sb.scenes.length;
  sb = { ...sb, scenes: sb.scenes.filter((sc) => sceneFilter(sc.id)) };
  if (!sb.scenes.length) fail(`--scenes "${flags.scenes}" không khớp cảnh nào (có: ${JSON.parse(fs.readFileSync(sbFile, 'utf8')).scenes.map((x) => x.id).join(', ')})`);
  console.error(`ℹ --scenes "${flags.scenes}": soát ${sb.scenes.length}/${before} cảnh.`);
}

/**
 * Cue đọc thẳng từ `cues.js` bằng regex, KHÔNG bundle: gate này phải chạy được cả khi scene đang
 * hỏng build (đó chính là lúc cần nó nhất). `cues.js` là dữ liệu phẳng, một `n` một `text`.
 */
const cueSrc = fs.readFileSync(path.join(base, 'cues.js'), 'utf8');
const CUES = new Map();
for (const block of cueSrc.split(/\n\s*\{\s*\n/)) {
  const n = block.match(/\bn:\s*(\d+)\s*,/);
  const t = block.match(/\btext:\s*(['"`])([\s\S]*?)\1\s*,/);
  if (n && t) CUES.set(Number(n[1]), t[2]);
}
if (!CUES.size) fail(`${videoId}/cues.js: không đọc được cue nào`);

/** Chuẩn hoá để so: lowercase, bỏ dấu câu, gộp khoảng trắng. Giữ nguyên dấu tiếng Việt. */
const norm = (s) => String(s).toLowerCase()
  .replace(/[.,;:!?"'“”‘’()\[\]{}…—–\-·✓✕×→←≈>&<]/g, ' ')
  .replace(/\s+/g, ' ').trim();
const words = (s) => (norm(s) ? norm(s).split(' ') : []);

/*
 * ── THAM CHIẾU CUE THEO ANCHOR, KHÔNG THEO SỐ ────────────────────────────────────────────────
 *
 * Số cue CHẠY mỗi lần kịch bản chèn/bỏ một câu. Vòng script v2 chèn 26 cue vào giữa phim, và mọi
 * `cues: [41, 42]` trong storyboard lập tức trỏ sai chỗ mà không gate nào bắt được — số vẫn tồn
 * tại, chỉ là của câu khác. Cụm từ thì không chạy: nó đi theo lời.
 *
 * Cách khai mới (tuỳ chọn — video cũ giữ `cues: [...]` vẫn chạy y như trước):
 *   scene.cueFrom  : cụm từ nằm trong cue ĐẦU TIÊN của cảnh. Cảnh kéo dài tới ngay trước
 *                    `cueFrom` của cảnh kế; cảnh cuối kéo tới hết phim.
 *   beat.cue       : bỏ được. Mốc nhấn tự tìm cue chứa `anchor` TRONG phạm vi cảnh; không có
 *                    hoặc có nhiều hơn một → đỏ, vì lúc đó cụm từ không định danh được chỗ nào.
 *
 * Chuỗi cue phải phủ kín và liền mạch (cảnh i+1 bắt đầu ngay sau cảnh i) — đúng hợp đồng sẵn có
 * của dòng poster; lệch là đỏ ngay tại đây chứ không im lặng.
 */
const CUE_NUMS = [...CUES.keys()].sort((a, b) => a - b);
const resolveProblems = [];
const resolveNotes = [];
{
  const usesAnchor = sb.scenes.some((sc) => typeof sc.cueFrom === 'string');
  if (usesAnchor) {
    const starts = [];
    let cursor = CUE_NUMS[0];
    for (const sc of sb.scenes) {
      if (typeof sc.cueFrom !== 'string' || !sc.cueFrom.trim()) {
        resolveProblems.push(`cảnh "${sc.id}": thiếu \`cueFrom\` (phim này khai cue theo cụm từ, không theo số)`);
        starts.push(null);
        continue;
      }
      const hit = CUE_NUMS.filter((n) => n >= cursor && CUES.get(n).includes(sc.cueFrom));
      if (!hit.length) {
        resolveProblems.push(`cảnh "${sc.id}": không cue nào từ số ${cursor} trở đi chứa cụm mở cảnh "${sc.cueFrom}"`);
        starts.push(null);
        continue;
      }
      starts.push(hit[0]);
      cursor = hit[0] + 1;
    }
    for (let i = 0; i < sb.scenes.length; i++) {
      const from = starts[i];
      if (from == null) continue;
      const nextStart = starts.slice(i + 1).find((v) => v != null);
      const to = nextStart == null ? CUE_NUMS[CUE_NUMS.length - 1] : nextStart - 1;
      if (to < from) { resolveProblems.push(`cảnh "${sb.scenes[i].id}": cụm mở cảnh rơi SAU cảnh kế — thứ tự cảnh và thứ tự lời không khớp`); continue; }
      sb.scenes[i].cues = CUE_NUMS.filter((n) => n >= from && n <= to);
    }
    // Mốc nhấn không khai `cue`: tìm trong phạm vi cảnh.
    for (const sc of sb.scenes) {
      for (const b of sc.beats || []) {
        if (b.cue != null || !b.anchor) continue;
        const hit = (sc.cues || []).filter((n) => CUES.get(n).includes(String(b.anchor)));
        if (!hit.length) {
          resolveProblems.push(`cảnh "${sc.id}": không cue nào của cảnh chứa mốc nhấn "${b.anchor}"`);
          continue;
        }
        /*
         * Cụm từ lặp trong nhiều cue của CÙNG một cảnh: lấy cue ĐẦU TIÊN — đúng y như `beatTOf()`
         * làm lúc render (`TIMELINE.find(...)`). Gate phải nói thật hành vi của runtime, không đặt
         * ra một hợp đồng chặt hơn rồi đỏ ở chỗ phim vẫn chạy đúng. Nhưng vẫn phải NÓI RA, vì đó là
         * chỗ mốc nhấn dễ trượt sang câu khác khi lời đổi.
         */
        b.cue = hit[0];
        if (hit.length > 1) resolveNotes.push(`cảnh "${sc.id}": mốc nhấn "${b.anchor}" có trong ${hit.length} cue (${hit.join(', ')}) — lấy cue ${hit[0]}, đúng như beatT() lúc render`);
      }
    }
  }
}

/**
 * Ước lượng mốc trong một cue bằng tỉ lệ ÂM TIẾT đứng trước cụm từ, chia cho nhịp đọc đo được của
 * backend. Gate chạy TRƯỚC khi có giọng nên không gọi được `spokenAt()`; sai vài chục ms, thừa
 * chính xác cho các ngưỡng 150 ms / 500 ms ở đây. `sfx-mix` chặn lại bằng frame THẬT khi đã có giọng.
 */
const SYL_PER_SEC = 5.08;
const spokenMs = (cue, anchor) => {
  const text = CUES.get(Number(cue));
  if (text == null) return 0;
  const i = text.indexOf(String(anchor));
  if (i < 0) return 0;
  return Math.round((words(text.slice(0, i)).length / SYL_PER_SEC) * 1000);
};
/** Mốc ƯỚC LƯỢNG trên trục TOÀN PHIM: tổng thời lượng ước lượng của các cue đứng trước + mốc trong cue. */
const cueStartMs = (() => {
  const starts = new Map();
  let cursor = 0;
  for (const n of [...CUES.keys()].sort((a, b) => a - b)) {
    starts.set(n, cursor);
    cursor += (words(CUES.get(n)).length / SYL_PER_SEC) * 1000 + 1400; // 1,4 s nghỉ — pauseSeconds của harness
  }
  return { starts, total: cursor };
})();
const globalMs = (cue, anchor, offsetMs = 0) => (cueStartMs.starts.get(Number(cue)) ?? 0) + spokenMs(cue, anchor) + (Number(offsetMs) || 0);

/** Hai loại phần tử được miễn G1 theo thiết kế — xem đầu file. */
const KINDS = {
  plaque: 'bia đá khắc bài học — lặp lời là chủ đích',
  endcard: 'câu chốt cuối phim, hiện đúng lúc được đọc',
  /*
   * `quiz`: ba lựa chọn của một câu trắc nghiệm PHẢI chép lời đọc. Người xem nghe "Một: …, Hai: …"
   * rồi có 3 giây LẶNG để chọn — không đọc lại được trên hình thì khe lặng đó vô nghĩa. Đây là
   * ngoại lệ duy nhất mà "chữ trên hình lặp lời" là YÊU CẦU chứ không phải lỗi.
   */
  quiz: 'lựa chọn trắc nghiệm — người xem phải đọc lại được trong khe lặng',
};

/*
 * ── G7 · TRẮC NGHIỆM ─────────────────────────────────────────────────────────────────────────
 *
 * Ba câu trắc nghiệm ở cuối là luật mới của series (`script-craft.md` §3i.3). Ba chỗ hỏng mà
 * không gate nào bắt: số cảnh quiz không khớp `REQUEST.md`, một cảnh có hai (hoặc không) đáp án,
 * và cue LẶNG không được đánh dấu (`render.mjs` chỉ CẢNH BÁO, rồi nhạc quiz đè lên tiếng nói).
 */
const englishText = [];
const quizProblems = [];
{
  const quizScenes = sb.scenes.filter((sc) => /^quiz-/.test(sc.id) || sc.chapter === 'quiz');
  let want = null;
  try {
    const req = fs.readFileSync(path.join(REPO, 'projects', videoId, 'REQUEST.md'), 'utf8');
    const m = req.match(/^\s*[-*]\s*\*\*quiz\*\*\s*:\s*`?(\d+)`?/m);
    if (m) want = Number(m[1]);
  } catch { /* không có REQUEST.md → chỉ kiểm phần nội tại */ }
  if (want != null && quizScenes.length !== want) {
    quizProblems.push(`G7: REQUEST.md khai \`quiz: ${want}\` nhưng storyboard có ${quizScenes.length} cảnh quiz`);
  }
  const silentCues = new Set();
  for (const [n, t] of CUES) if (/^\s*$/.test(t)) silentCues.add(n);
  const silentFlag = new Set();
  for (const block of cueSrc.split(/\n\s*\{\s*\n/)) {
    const n = block.match(/\bn:\s*(\d+)\s*,/);
    if (n && /\bquiz\s*:\s*true\b/.test(block) && /\bsilent\s*:/.test(block)) silentFlag.add(Number(n[1]));
  }
  for (const sc of quizScenes) {
    const ans = (sc.onScreenText || []).filter((t) => /^(Đáp án|đáp án)/.test(typeof t === 'string' ? t : t.text));
    if (sc.quiz && !Number.isInteger(sc.quiz.answer)) quizProblems.push(`G7 cảnh "${sc.id}": \`quiz.answer\` phải là SỐ của lựa chọn đúng`);
    if (!sc.quiz) quizProblems.push(`G7 cảnh "${sc.id}": thiếu khối \`quiz\` (đáp án là số mấy)`);
    if (ans.length > 1) quizProblems.push(`G7 cảnh "${sc.id}": có ${ans.length} dòng "Đáp án" — mỗi câu đúng MỘT`);
    const mine = (sc.cues || []).filter((n) => silentFlag.has(n));
    if (mine.length !== 1) quizProblems.push(`G7 cảnh "${sc.id}": phải có ĐÚNG MỘT cue lặng mang \`silent\` + \`quiz: true\` (đang có ${mine.length})`);
  }
  for (const n of silentFlag) {
    const owner = sb.scenes.find((sc) => (sc.cues || []).includes(n));
    if (owner && !/^quiz-/.test(owner.id) && owner.chapter !== 'quiz') {
      quizProblems.push(`G7: cue ${n} đánh \`quiz: true\` nhưng thuộc cảnh "${owner.id}" không phải cảnh quiz`);
    }
  }
}

/*
 * `--cues` in ra bảng cảnh → số cue mà gate GIẢI RA từ cụm từ. Dùng để chứng minh "chỉ đổi cách
 * tham chiếu, không đổi phim": so bảng này trước/sau khi bỏ `cues: [...]` phải trùng khít.
 */
if (flags.cues) {
  const map = {};
  for (const sc of sb.scenes) map[sc.id] = sc.cues || null;
  console.log(JSON.stringify(map));
  process.exit(resolveProblems.length ? 1 : 0);
}

const problems = [...resolveProblems, ...quizProblems];
const exempt = [];
const seenAnchors = new Set();

for (const sc of sb.scenes) {
  const where = `cảnh "${sc.id}"`;
  if (!Array.isArray(sc.cues) || !sc.cues.length) { problems.push(`${where}: thiếu danh sách \`cues\``); continue; }
  if (!sc.metaphor || /^TODO/i.test(sc.metaphor)) problems.push(`${where}: \`metaphor\` còn trống — mỗi cảnh phải khai đúng một ẩn dụ`);

  // ── G1 · chữ trên hình không lặp lời đọc ────────────────────────────────────────────────────
  const said = norm(sc.cues.map((n) => CUES.get(n) || '').join(' '));
  for (const raw of sc.onScreenText || []) {
    // Phần tử là chuỗi trần, hoặc `{ text, kind }` khi nó thuộc một loại được miễn theo thiết kế.
    const txt = typeof raw === 'string' ? raw : raw.text;
    const kind = typeof raw === 'string' ? null : raw.kind;
    if (kind && !KINDS[kind]) { problems.push(`${where}: chữ trên hình "${txt}" khai \`kind: "${kind}"\` không hợp lệ (chỉ ${Object.keys(KINDS).join(' · ')})`); continue; }
    const w = words(txt);
    if (w.length <= 3) continue; // nhãn ngắn của một vật thể — được phép trùng
    if (!said.includes(norm(txt))) continue;
    // Miễn trừ phải KHAI RA kèm lý do trong chính storyboard.json và được in ở cuối. Có đúng hai
    // loại chính đáng: trích dẫn có nguồn, và thẻ tiêu đề đặt tên cho một giai đoạn. Miễn trừ không
    // lý do vẫn đỏ.
    if (kind) { exempt.push(`${where}: "${txt}" — ${kind}: ${KINDS[kind]}`); continue; }
    const why = (sc.echoOk || {})[txt];
    if (why) { exempt.push(`${where}: "${txt}" — ${why}`); continue; }
    problems.push(`G1 ${where}: chữ trên hình "${txt}" chép nguyên văn lời đọc (${w.length} từ) — hình phải NÓI THÊM, không đọc lại phụ đề`);
  }

  /*
   * ── G8 · CHỮ TRÊN HÌNH BẰNG TIẾNG ANH (CẢNH BÁO) ───────────────────────────────────────────
   * Retro d05-v06 F11: **39 chuỗi** phải Việt hoá ở lượt tích hợp, vì lane script chép thẳng nhãn
   * tiếng Anh từ slide trong khi lời đọc là tiếng Việt. Người xem đọc một đằng, nghe một nẻo.
   *
   * Luật (`styles/poster.md` §7): chữ để HIỂU = tiếng Việt khớp lời đọc; thuật ngữ tiếng Anh
   * chỉ là CHÚ THÍCH PHỤ; tên app/sản phẩm trong mock thì giữ nguyên.
   *
   * Mức CẢNH BÁO, không chặn: danh sách thuật ngữ cho phép là quyết định của owner, không phải của
   * máy. Khai `allowEnglish: ["Prompt", "Copilot"]` ở cấp cảnh hoặc cấp file để tắt từng chuỗi.
   */
  {
    const allow = new Set([...(sb.allowEnglish || []), ...(sc.allowEnglish || [])].map((x) => norm(String(x))));
    for (const raw of sc.onScreenText || []) {
      const txt = typeof raw === 'string' ? raw : raw.text;
      const kind = typeof raw === 'string' ? null : raw.kind;
      if (kind === 'mock') continue; // nhãn trong ảnh mock giao diện — giữ nguyên tên thật
      const t = String(txt ?? '').trim();
      // Toàn ASCII = không có một dấu tiếng Việt nào. Chuỗi tiếng Việt không dấu vẫn lọt, nên mới
      // để ở mức cảnh báo; >2 từ mới xét, vì nhãn một-hai từ thường đúng là thuật ngữ.
      if (!t || /[^\x00-\x7F]/.test(t)) continue;
      // Chuỗi toàn SỐ/ký hiệu ("0.71 / 0.84") không phải tiếng Anh — cần ít nhất hai từ chữ cái.
      if ((t.match(/[A-Za-z]{3,}/g) || []).length < 2) continue;
      if (words(t).length <= 2) continue;
      if (allow.has(norm(t))) continue;
      englishText.push(`${where}: chữ trên hình "${t}" toàn tiếng Anh (${words(t).length} từ) — chữ để HIỂU phải là tiếng Việt khớp lời đọc; thuật ngữ chỉ làm chú thích phụ. Giữ nguyên thì khai \`allowEnglish\` hoặc \`kind: "mock"\`.`);
    }
  }

  // ── G2 · mỗi cảnh ≥1 mốc nhấn, anchor phải có trong cue khai kèm ─────────────────────────────
  const beats = sc.beats || [];
  if (!beats.length) { problems.push(`G2 ${where}: không khai mốc nhấn nào — cảnh không có chuyển động mang nghĩa`); continue; }
  for (const b of beats) {
    const a = String(b.anchor ?? '');
    if (!a.trim()) { problems.push(`G2 ${where}: có mốc nhấn \`anchor\` rỗng`); continue; }
    if (/^\d+$/.test(a.trim())) { problems.push(`G2 ${where}: mốc nhấn neo vào SỐ ("${a}") — phải neo vào cụm từ, số câu chạy mỗi lần đổi ranh giới cue`); continue; }
    if (!b.does || /^TODO/i.test(b.does)) problems.push(`G2 ${where}: mốc nhấn "${a}" chưa khai \`does\` (chuyển động gì xảy ra)`);
    if (b.cue == null) { problems.push(`G2 ${where}: mốc nhấn "${a}" chưa khai \`cue\``); continue; }
    const text = CUES.get(Number(b.cue));
    if (text == null) { problems.push(`G2 ${where}: mốc nhấn "${a}" khai cue ${b.cue} — không có cue đó`); continue; }
    if (!sc.cues.includes(Number(b.cue))) problems.push(`G2 ${where}: mốc nhấn "${a}" khai cue ${b.cue} nhưng cue đó không thuộc cảnh này`);
    if (!text.includes(a)) problems.push(`G2 ${where}: cue ${b.cue} KHÔNG chứa cụm "${a}" — đây đúng lỗi mà beatT() ném ra giữa render`);
    if (b.inCode) seenAnchors.add(`${sc.id}\u0000${a}`);
  }
}

// ── G4 · âm thanh khai trong storyboard phải dựng được và giữ đúng luật nhịp ───────────────────
/**
 * G4 chạy TRƯỚC khi ai trộn một giây audio nào: `sfx-mix` cũng chặn trần accent và mật độ foley,
 * nhưng nó cần `voice.cues.json` (tức là phải có giọng rồi). Gate này chỉ cần `storyboard.json` +
 * `sfx.json`, nên nó bắt được lỗi ngay lúc viết thiết kế âm thanh.
 *
 * Thiếu FILE .wav là exit 2 kèm lệnh tải, không phải exit 1: đó không phải lỗi thiết kế, đó là máy
 * này chưa dựng lại `assets/sfx/` (thư mục đó không vào git).
 *
 * Video không khai `sfx` nào thì G4 không có gì để nói — video cũ vì vậy không bị đổi từ đạt sang
 * trượt vì check mới.
 */
const SFX_FILE = path.join(REPO, 'sfx.json');
const sfxDecls = [];
for (const sc of sb.scenes) {
  for (const b of sc.beats || []) {
    if (!b.sfx) continue;
    const d = typeof b.sfx === 'string' ? { id: b.sfx } : b.sfx;
    sfxDecls.push({ ...d, scene: sc.id, anchor: b.anchor, cue: b.cue, where: `cảnh "${sc.id}" · mốc "${b.anchor}"` });
  }
  if (sc.ambience) {
    const d = typeof sc.ambience === 'string' ? { id: sc.ambience } : sc.ambience;
    sfxDecls.push({ ...d, scene: sc.id, ambience: true, where: `cảnh "${sc.id}" · ambience` });
  }
}
const missingFiles = [];
if (sfxDecls.length) {
  if (!fs.existsSync(SFX_FILE)) fail('có khai `sfx` trong storyboard.json nhưng không thấy sfx.json ở gốc repo');
  const cat = JSON.parse(fs.readFileSync(SFX_FILE, 'utf8'));
  const byId = new Map((cat.sfx || []).map((s) => [s.id, s]));
  const LAYERS = cat._layers || {};
  const counts = {};
  for (const d of sfxDecls) {
    const e = byId.get(d.id);
    if (!e) { problems.push(`G4 ${d.where}: sfx.json không có id "${d.id}"`); continue; }
    const wav = path.join(REPO, 'assets/sfx', e.file);
    if (!fs.existsSync(wav)) missingFiles.push(d.id);
    const layer = e.layer || '?';
    if (!LAYERS[layer]) problems.push(`G4 ${d.where}: tiếng "${d.id}" khai lớp "${layer}" không có trong sfx.json._layers`);
    if (d.ambience && layer !== 'ambience') problems.push(`G4 ${d.where}: "${d.id}" thuộc lớp ${layer}, không dùng làm bed của cảnh được`);
    if (!d.ambience && layer === 'ambience') problems.push(`G4 ${d.where}: "${d.id}" là bed (lớp ambience) — khai ở \`ambience\` của cảnh, không khai theo beat`);
    counts[layer] = (counts[layer] || 0) + 1;
    // Beat của tiếng phải TỒN TẠI và anchor phải nằm trong cue — cùng phép kiểm G2, nhưng G2 chỉ
    // soát các beat có sẵn; một beat chỉ-để-đặt-tiếng (`sfxOnly`) vẫn phải qua đây.
    if (!d.ambience) {
      const text = CUES.get(Number(d.cue));
      if (text == null) problems.push(`G4 ${d.where}: khai cue ${d.cue} — không có cue đó`);
      else if (!text.includes(String(d.anchor))) problems.push(`G4 ${d.where}: cue ${d.cue} không chứa cụm "${d.anchor}"`);
    }
  }
  const cap = LAYERS.accent?.max ?? 4;
  if (counts.accent > cap) problems.push(`G4: ${counts.accent} tiếng lớp accent — trần là ${cap}. Đổi bớt sang foley hoặc bỏ.`);
  // Mật độ foley: gate không biết thời lượng thật (chưa chắc có giọng), nên dùng số cue làm thước —
  // một cue ≈ 3 giây theo phân bố thật của harness. Đây là ƯỚC LƯỢNG chặn hộ; con số chính xác do
  // `sfx-mix` chặn lại lần nữa khi đã có `voice.cues.json`.
  const perMin = LAYERS.foley?.maxPerMinute ?? Infinity;
  const estMinutes = (CUES.size * 3) / 60;
  const foleyDecls = counts.foley || 0;
  if (estMinutes > 0 && foleyDecls / estMinutes > perMin) {
    problems.push(`G4: ${foleyDecls} sự kiện foley trên ~${estMinutes.toFixed(1)} phút (${(foleyDecls / estMinutes).toFixed(1)}/phút) — ngân sách ${perMin}/phút`);
  }
  // Hai tiếng CÙNG LỚP dí nhau <150 ms trong cùng một cảnh thì tai nghe thành một tiếng méo, không
  // thành hai sự kiện. Chuỗi `burst` là cố ý nên được miễn.
  const byScene = {};
  for (const d of sfxDecls) {
    if (d.ambience || d.burst) continue;
    const e = byId.get(d.id);
    if (!e) continue;
    (byScene[`${d.scene}\u0000${e.layer}\u0000${d.cue}`] ||= []).push(d);
  }
  // Mốc trong cue ước lượng bằng `spokenMs()` (khai ở đầu file) vì chưa chắc đã có giọng.
  for (const [k, list] of Object.entries(byScene)) {
    if (list.length < 2) continue;
    const offs = list.map((d) => spokenMs(d.cue, d.anchor) + (Number(d.offsetMs) || 0)).sort((a, b) => a - b);
    for (let i = 1; i < offs.length; i++) {
      if (offs[i] - offs[i - 1] < 150) {
        const [scene, layer] = k.split('\u0000');
        problems.push(`G4 cảnh "${scene}": hai tiếng lớp ${layer} cùng cue cách nhau ~${offs[i] - offs[i - 1]} ms (<150 ms) — khai \`burst\` nếu là chuỗi có chủ đích, không thì giãn bằng \`offsetMs\``);
      }
    }
  }
}

// ── G6 · ảnh tư liệu (images.js): license, ghi công, file có thật ─────────────────────────────
/**
 * Ảnh tư liệu đi theo đường của remote: `tools/image-search|check|apply.mjs` ghi
 * `<thư mục video>/images.js` (`IMAGES` theo slot), cảnh vẽ bằng `<PhotoCard>`. G6 không còn đọc
 * `storyboard.json.illustration` / `illustration/sources.json` nữa.
 *
 * Ảnh Openverse/Commons mang license RIÊNG và phần lớn đòi ghi công. G6 soát license nằm trong
 * `images.policy.json`, credit có thật, và file ảnh có trên máy.
 * `kind: "reference"` là ảnh CHỈ để xem rồi vẽ lại — không được đưa vào `<PhotoCard>`.
 */
const IMAGES_FILE = path.join(base, 'images.js');
const missingImages = [];
let imageSlots = 0;
if (fs.existsSync(IMAGES_FILE)) {
  const raw = fs.readFileSync(IMAGES_FILE, 'utf8');
  const m = raw.match(/export const IMAGES = ([\s\S]*?);\s*$/);
  let IMAGES = null;
  if (!m) problems.push('G6 images.js: không đọc được `export const IMAGES = {...}` — chạy lại `node tools/image-apply.mjs <thư mục video>`');
  else {
    try { IMAGES = JSON.parse(m[1]); } catch (e) { problems.push(`G6 images.js hỏng: ${e.message}`); }
  }
  if (IMAGES) {
    const policy = readPolicy();
    const sceneSrcAll = fs.readdirSync(base).filter((x) => x.endsWith('.jsx'))
      .map((f) => stripComments(fs.readFileSync(path.join(base, f), 'utf8'))).join('\n');
    for (const [slot, im] of Object.entries(IMAGES)) {
      imageSlots += 1;
      const where = `G6 ảnh "${slot}"`;
      if (!im.src) { problems.push(`${where}: thiếu \`src\``); continue; }
      if (!fs.existsSync(path.join(DS, String(im.src).split(/[?#]/)[0]))) missingImages.push(im.src);
      const lic = licenseAllowed(String(im.license || 'unknown'), policy);
      if (!lic.ok) problems.push(`${where}: ${lic.reason} — xem images.policy.json`);
      if (im.kind === 'use') {
        if (!String(im.credit || '').trim()) problems.push(`${where}: kind "use" nhưng không có \`credit\` — ảnh của người khác phải ghi nguồn ngay trên hình`);
        if (!new RegExp(`IMAGES(?:\\.${slot}\\b|\\[['"]${slot}['"]\\])`).test(sceneSrcAll)) {
          problems.push(`${where}: kind "use" nhưng không cảnh nào dùng IMAGES.${slot} — bỏ khỏi decisions.json hoặc vẽ nó ra`);
        }
      } else if (im.kind === 'reference') {
        if (new RegExp(`<PhotoCard[^>]*IMAGES(?:\\.${slot}\\b|\\[['"]${slot}['"]\\])`, 's').test(sceneSrcAll)) {
          problems.push(`${where}: kind "reference" chỉ để xem rồi VẼ LẠI — không được đưa vào <PhotoCard>`);
        }
      }
    }
  }
}

// ── G3 · code không được có mốc nhấn nằm ngoài khai báo ────────────────────────────────────────
for (const f of fs.readdirSync(base).filter((x) => x.endsWith('.jsx'))) {
  // Quét trên bản ĐÃ BỎ COMMENT: một ví dụ `beatT('<cảnh>','<cụm từ>')` viết trong chú thích không
  // phải lời gọi thật. Báo giả này đã gặp hai lần (retro F6, rồi lại lần nữa khi soạn template).
  const src = stripComments(fs.readFileSync(path.join(base, f), 'utf8'));
  for (const m of src.matchAll(/beatT\(\s*'([^']+)'\s*,\s*'([^']+)'/g)) {
    // `--scenes` cũng áp cho G3: lời gọi của cảnh KHÁC không phải việc của lane đang chạy.
    if (sceneFilter && !sceneFilter(m[1])) continue;
    if (!seenAnchors.has(`${m[1]}\u0000${m[2]}`)) {
      problems.push(`G3 ${f}: beatT('${m[1]}', '${m[2]}') không có trong storyboard.json (cảnh "${m[1]}", \`inCode: true\`)`);
    }
  }
}

if (flags.json) console.log(JSON.stringify({ video: videoId, scenes: sb.scenes.length, sfx: sfxDecls.length, problems, exempt, missingFiles, missingImages }, null, 2));
else {
  const beats = sb.scenes.reduce((n, s) => n + (s.beats || []).length, 0);
  const texts = sb.scenes.reduce((n, s) => n + (s.onScreenText || []).length, 0);
  console.log(`storyboard-gate · ${videoId} · ${sb.scenes.length} cảnh · ${beats} mốc nhấn · ${texts} chuỗi chữ trên hình · ${CUES.size} cue · ${sfxDecls.length} khai báo âm thanh${imageSlots ? ` · ${imageSlots} ảnh tư liệu` : ''}`);
  for (const e of exempt) console.log(`  miễn trừ · ${e}`);
  // G8 là CẢNH BÁO — in trước phần đỏ để không lẫn vào danh sách phải sửa.
  for (const e of englishText) console.log(`  ! G8 ${e}`);
  if (englishText.length) console.log(`  (G8: ${englishText.length} chuỗi — luật ngôn ngữ chữ trên hình ở styles/poster.md §7)`);
  for (const p of problems) console.error(`✗ ${p}`);
  if (!problems.length) console.log(`G1 chữ trên hình · G2 mốc nhấn · G3 beatT ↔ khai báo${sfxDecls.length ? ' · G4 âm thanh' : ''}${imageSlots ? ' · G6 ảnh tư liệu' : ''}${sb.scenes.some((sc) => /^quiz-/.test(sc.id) || sc.chapter === 'quiz') ? ' · G7 trắc nghiệm' : ''} — xanh`);
}
// Thiếu file .wav không phải lỗi thiết kế mà là máy này chưa dựng lại assets/sfx/ — exit 2 kèm lệnh.
if (missingFiles.length) {
  console.error(`✗ thiếu file âm thanh cho: ${[...new Set(missingFiles)].join(', ')}`);
  console.error(`  dựng lại: node tools/sfx-fetch.mjs --only ${[...new Set(missingFiles)].join(',')}`);
  process.exit(2);
}
// Cùng lý do: ảnh minh hoạ không vào git, thiếu file là máy này chưa chọn/tải, không phải lỗi thiết kế.
if (missingImages.length) {
  console.error(`✗ thiếu file ảnh tư liệu: ${[...new Set(missingImages)].join(', ')}`);
  console.error(`  tải lại: node tools/image-apply.mjs ${path.relative(REPO, base)}`);
  process.exit(2);
}
if (resolveNotes.length) {
  console.log(`\n⚠ ${resolveNotes.length} mốc nhấn có cụm từ lặp trong cảnh (lấy cue đầu, như beatT):`);
  for (const n of resolveNotes) console.log(`  ${n}`);
}
process.exit(problems.length ? 1 : 0);
