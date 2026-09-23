#!/usr/bin/env node
/**
 * `dead-frames` — KHUNG CHẾT, đo TRƯỚC khi render.
 *
 *   node tools/dead-frames.mjs --video <id> [--fps 2] [--min 2.0] [--json]
 *
 * Vì sao có tool này (22/09/2026). `qa.mjs` bắt được khung chết, nhưng nó đo trên MP4 — nghĩa là
 * phải render xong (11 phút mỗi lượt) mới biết có chỗ đứng hình. Bài học F1: một lỗi khung chết ở
 * 00:00–00:02 đã tốn thêm hai lượt render. Tool này dựng cùng cây React bằng SSR (không trình
 * duyệt, không ffmpeg), lấy mẫu THƯA theo `--fps`, băm markup từng mẫu rồi tìm những quãng mà
 * markup KHÔNG đổi một ký tự. Chạy hết một phim 12 phút mất vài chục giây thay vì 11 phút.
 *
 * Giới hạn phải nói rõ: markup giống nhau ⇒ khung chết CHẮC CHẮN; markup khác nhau thì CHƯA chắc
 * là có chuyển động NHÌN THẤY (một thuộc tính đổi ở chữ số thứ ba vẫn là "khác"). Tool này vì vậy
 * bắt được khung chết THẬT và không báo giả, nhưng có thể bỏ lọt khung "gần như chết".
 *
 * exit 0 không có quãng nào ≥ `--min` giây · 1 có · 2 sai cách gọi.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(REPO, 'vinuni-lesson-video-ds');
const fail = (m) => { console.error(`✗ ${m}`); process.exit(2); };

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) {
  console.log(`Tìm KHUNG CHẾT bằng SSR, KHÔNG cần render.

  node tools/dead-frames.mjs --video <id> [--fps 2] [--min 2.0] [--json]

  --fps  số mẫu mỗi giây (mặc định 2)
  --min  quãng đứng hình từ bao nhiêu GIÂY trở lên thì báo (mặc định 2,0)

exit 0 sạch · 1 có khung chết · 2 sai cách gọi`);
  process.exit(argv.length ? 0 : 2);
}
const flags = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) continue;
  const next = argv[i + 1];
  if (next && !next.startsWith('--')) { flags[argv[i].slice(2)] = next; i++; } else flags[argv[i].slice(2)] = true;
}
const videoId = flags.video;
if (!videoId || videoId === true) fail('usage: node tools/dead-frames.mjs --video <id>');
const SAMPLE_FPS = Number(flags.fps || 2);
const MIN_SEC = Number(flags.min || 2.0);
const FPS = 30;

const base = path.join(DS, 'ui_kits/lesson-video/videos', videoId);
if (!fs.existsSync(base)) fail(`không có thư mục cảnh ${path.relative(REPO, base)}`);
const NM = path.join(REPO, 'node_modules');
const require = createRequire(path.join(NM, 'noop.js'));
const esbuild = require('esbuild');

const entry = `
  import React from 'react';
  import { renderToStaticMarkup } from 'react-dom/server';
  import Video, { meta } from ${JSON.stringify(path.join(base, 'video.jsx'))};
  import { ConfigContext, FrameContext } from ${JSON.stringify(path.join(DS, 'lib/player.jsx'))};
  export { meta };
  export const renderAt = (f) => renderToStaticMarkup(
    React.createElement(ConfigContext.Provider, { value: { fps: 30, width: 1920, height: 1080, durationInFrames: meta.duration } },
      React.createElement(FrameContext.Provider, { value: f }, React.createElement(Video))));
`;
const built = await esbuild.build({
  stdin: { contents: entry, resolveDir: base, loader: 'jsx' },
  bundle: true, write: false, format: 'cjs', platform: 'node', jsx: 'automatic',
  nodePaths: [NM], loader: { '.js': 'jsx', '.jsx': 'jsx' },
  define: { 'process.env.NODE_ENV': '"production"' }, logLevel: 'silent',
});
const m = { exports: {} };
new Function('module', 'exports', 'require', built.outputFiles[0].text)(m, m.exports, require);
const { meta, renderAt } = m.exports;

/*
 * Bỏ PHỤ ĐỀ ra khỏi phép băm. Thanh phụ đề đổi chữ mỗi câu, nên nếu tính cả nó thì mọi quãng đứng
 * hình đều "có đổi" và tool này không bao giờ báo gì — đúng kiểu xanh giả đang phải diệt.
 */
const strip = (html) => html.replace(/<div[^>]*data-vk-caption[\s\S]*?<\/div>/g, '');
const step = Math.max(1, Math.round(FPS / SAMPLE_FPS));
const rows = [];
for (let f = 0; f < meta.duration; f += step) {
  let h;
  try { h = crypto.createHash('sha1').update(strip(renderAt(f))).digest('hex'); } catch (e) { h = `throw:${String(e.message).slice(0, 40)}`; }
  rows.push({ f, h });
}

const runs = [];
let start = 0;
for (let i = 1; i <= rows.length; i++) {
  if (i < rows.length && rows[i].h === rows[start].h) continue;
  const from = rows[start].f;
  const to = i < rows.length ? rows[i].f : meta.duration;
  const sec = (to - from) / FPS;
  if (i - start >= 2 && sec >= MIN_SEC) runs.push({ from, to, sec, hash: rows[start].h.slice(0, 8) });
  start = i;
}

const tc = (f) => `${String(Math.floor(f / FPS / 60)).padStart(2, '0')}:${(f / FPS % 60).toFixed(2).padStart(5, '0')}`;
if (flags.json) {
  console.log(JSON.stringify({ video: videoId, sampleFps: SAMPLE_FPS, minSec: MIN_SEC, samples: rows.length, dead: runs }, null, 2));
} else {
  console.log(`dead-frames · ${videoId} · ${rows.length} mẫu @ ${SAMPLE_FPS} fps · ngưỡng ${MIN_SEC}s`);
  for (const r of runs) console.log(`  ✗ KHUNG CHẾT ${tc(r.from)}–${tc(r.to)} (${r.sec.toFixed(1)}s) · markup không đổi (${r.hash})`);
  console.log(runs.length ? `\n✗ ${runs.length} quãng đứng hình` : '\n✓ không quãng nào đứng hình ≥ ngưỡng');
}
process.exit(runs.length ? 1 : 0);
