#!/usr/bin/env node
/**
 * Nhịp CẢNH của một video kiểu poster: giây authored của bản thiết kế so với giây GIỌNG đo được.
 *
 *   node tools/scene-pace.mjs --video <id>              in bảng, exit≠0 nếu nhịp hỏng
 *   node tools/scene-pace.mjs --video <id> --suggest    kèm bộ `dur` đề xuất cho `stage.jsx`
 *
 * Vì sao có công cụ này: `dur` của cả 21 cảnh video demo đã phải chỉnh **hai lần bằng tay** — lần
 * một vì gộp ba video của sếp, lần hai vì giọng thật đọc 5,0 âm tiết/giây thay vì 3,08 như kịch bản
 * ước. Mỗi vòng chỉnh tay là một lượt render 5 phút mới nhìn được kết quả. Phép tính thì thuần:
 * `ratio = giâyGiọng / giâyAuthored`, và `lib/poster/stage.jsx` đã có sẵn `planScenes()`. In nó ra.
 *
 * Đọc bảng:
 *   ratio ≈ 1   animation chạy đúng tốc độ bản thiết kế gốc — đích cần tới
 *   ratio < 1   cảnh bị NÉN: animation chạy nhanh hơn thiết kế (0,7 = nhanh gấp 1,4 lần)
 *   ratio > 1   cảnh bị GIÃN; quá `stretchCap` 1,35 thì không giãn mù nữa mà GIỮ frame cuối (HOLD)
 *
 * Exit code: 0 xanh · 1 nhịp hỏng (HOLD > 8% thời lượng, hoặc có cảnh ratio < 0,7) · 2 sai cách gọi.
 * Không phụ thuộc mạng. Cùng họ với `tools/voice-pace.mjs` — cái kia đo GIỌNG, cái này đo CẢNH.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(REPO, 'vinuni-lesson-video-ds');
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`Nhịp cảnh của video poster: authored vs giọng đo được.

  node tools/scene-pace.mjs --video <id> [--suggest] [--band 0.85,1.15] [--json]

  --video <id>   thư mục trong vinuni-lesson-video-ds/ui_kits/lesson-video/videos/ (bắt buộc)
  --suggest      in bộ \`dur\` đề xuất cho các cảnh ngoài dải, và cảnh cần HOLD
  --band a,b     dải ratio coi là đạt (mặc định 0.85,1.15)
  --json         in JSON thay vì bảng

exit 0 xanh · 1 nhịp hỏng · 2 sai cách gọi`);
  process.exit(0);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { flags[argv[i].slice(2)] = next; i++; } else flags[argv[i].slice(2)] = true;
}
const videoId = flags.video;
if (!videoId || videoId === true) fail('usage: node tools/scene-pace.mjs --video <id> [--suggest]');

const base = path.join(DS, 'ui_kits/lesson-video/videos', videoId);
if (!fs.existsSync(path.join(base, 'stage.jsx'))) {
  fail(`${videoId}: không có stage.jsx — công cụ này chỉ áp cho video kiểu poster (bảng CHAPTERS + dur authored)`);
}
const [lo, hi] = String(flags.band || '0.85,1.15').split(',').map(Number);

// Tải `CHAPTERS` + `TIMELINE` + `planScenes` qua esbuild, đúng cách `tools/verify.mjs` nạp scene.
const NODE_MODULES = [process.env.VK_NODE_MODULES, path.join(REPO, 'node_modules')]
  .filter(Boolean)
  .find((p) => fs.existsSync(path.join(p, 'esbuild')));
if (!NODE_MODULES) fail('không tìm thấy esbuild (chạy `npm install` trước)');
const require = createRequire(path.join(NODE_MODULES, 'noop.js'));
const esbuild = require('esbuild');

const entry = `
  export { CHAPTERS } from ${JSON.stringify(path.join(base, 'stage.jsx'))};
  export { TIMELINE, PLAY_DURATION } from ${JSON.stringify(path.join(base, 'timeline.js'))};
  export { planScenes, FPS, STRETCH_CAP } from ${JSON.stringify(path.join(DS, 'lib/poster/stage.jsx'))};
`;
let mod;
try {
  const out = await esbuild.build({
    stdin: { contents: entry, resolveDir: base, loader: 'js' },
    bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
    nodePaths: [NODE_MODULES], loader: { '.js': 'jsx', '.jsx': 'jsx' },
    define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
  });
  const m = { exports: {} };
  new Function('module', 'exports', 'require', out.outputFiles[0].text)(m, m.exports, require);
  mod = m.exports;
} catch (e) {
  fail(`${videoId}: không nạp được stage.jsx — ${String(e.message || e).split('\n')[0]}`);
}

const { CHAPTERS, TIMELINE, PLAY_DURATION, planScenes, FPS, STRETCH_CAP } = mod;
const plan = planScenes({ chapters: CHAPTERS, timeline: TIMELINE });

const holdTotal = plan.reduce((n, s) => n + s.holdSec, 0);
const videoSec = PLAY_DURATION / FPS;
const holdShare = holdTotal / videoSec;
const tooFast = plan.filter((s) => s.ratio < 0.7);
const outOfBand = plan.filter((s) => s.ratio < lo || s.ratio > hi);

if (flags.json) {
  console.log(JSON.stringify({ video: videoId, videoSec, holdTotal, holdShare, stretchCap: STRETCH_CAP, scenes: plan.map((s) => ({ id: s.id, chapter: s.chapter, cues: s.cues, authDur: s.authDur, voicedSec: s.voicedSec, ratio: s.ratio, mode: s.mode, holdSec: s.holdSec })) }, null, 2));
} else {
  const vn = (x, d = 2) => x.toFixed(d).replace('.', ',');
  console.log(`nhịp cảnh · ${videoId} · ${plan.length} cảnh · ${vn(videoSec, 1)}s · dải đạt ${vn(lo)}–${vn(hi)} · stretchCap ${vn(STRETCH_CAP)}`);
  console.log(`${'cảnh'.padEnd(12)} ${'chương'.padEnd(10)} ${'cue'.padStart(7)} ${'auth'.padStart(6)} ${'giọng'.padStart(6)} ${'tỉ lệ'.padStart(6)}  nhánh`);
  for (const s of plan) {
    const flag = s.ratio < lo ? ' ← nén' : s.ratio > hi ? ' ← giãn' : '';
    const branch = s.mode === 'hold' ? `HOLD ${vn(s.holdSec, 1)}s` : 'rescale';
    const cues = `${s.cues[0]}–${s.cues[s.cues.length - 1]}`;
    console.log(`${s.id.padEnd(12)} ${String(s.chapter).padEnd(10)} ${cues.padStart(7)} ${vn(s.authDur, 1).padStart(6)} ${vn(s.voicedSec, 1).padStart(6)} ${vn(s.ratio).padStart(6)}  ${branch}${flag}`);
  }
  console.log(`\ntổng HOLD ${vn(holdTotal, 1)}s = ${vn(holdShare * 100, 1)}% thời lượng · ngoài dải ${outOfBand.length}/${plan.length} cảnh`);
  if (flags.suggest) {
    if (!outOfBand.length) console.log('\n--suggest: không cảnh nào ngoài dải — giữ nguyên bảng `dur` trong stage.jsx.');
    else {
      console.log('\n--suggest · `dur` đề xuất (giây giọng ÷ 1,00 — animation chạy đúng tốc độ thiết kế):');
      for (const s of outOfBand) {
        const want = Math.round(s.voicedSec * 2) / 2;
        console.log(`  { id: '${s.id}', … dur: ${String(want).replace('.', ',')} }   // đang ${String(s.authDur).replace('.', ',')} · tỉ lệ ${vn(s.ratio)}${s.mode === 'hold' ? ` · đang HOLD ${vn(s.holdSec, 1)}s` : ''}`);
      }
      console.log('  Chỉnh `dur` KHÔNG dịch một mốc `A + x` nào bên trong cảnh — chỉ cửa sổ tổng của cảnh đổi.');
    }
  }
}

const problems = [];
if (holdShare > 0.08) problems.push(`tổng giây HOLD ${holdTotal.toFixed(1)}s = ${(holdShare * 100).toFixed(1)}% thời lượng (trần 8%)`);
for (const s of tooFast) problems.push(`cảnh "${s.id}" tỉ lệ ${s.ratio.toFixed(2)} < 0,70 — animation chạy nhanh hơn thiết kế ${(1 / s.ratio).toFixed(2)}×`);
if (problems.length) {
  console.error('');
  for (const p of problems) console.error(`✗ ${p}`);
  process.exit(1);
}
process.exit(0);
