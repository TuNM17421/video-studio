#!/usr/bin/env node
/**
 * Static checks for the design system (run after editing):
 *   node tools/verify.mjs                     # toàn bộ design system + 11 video
 *  · every @dsCard marker is on line 1 and well-formed (group, viewport WxH, name, subtitle)
 *  · 700-wide foundation/component cards are ≤ 400 px tall
 *  · every components/**\/Name.jsx has Name.d.ts + Name.prompt.md; one card.html per group
 *  · code uses only the 9 palette hex values; no Math.random / Date.now in scenes or components
 *  · scene captions are contiguous from 0 to the scene duration and ≤ 78 characters each
 *  · example videos (ui_kits/lesson-video/videos/<dir>/): required files present, caption pages
 *    ≤ 78 characters covering every cue exactly, `quiz: true` only on silent cues, and a smoke render of
 *    every 3rd frame (plus each cue's first and last frame) that must not throw or write NaN / undefined
 *    into an attribute. A folder with cues.js but no video.jsx is a video before its scenes step: a
 *    warning, not a problem.
 *  · pictures in videos (PhotoCard): `src` is a design-system file given from its root (never http), every
 *    PhotoCard has a `credit`, and the slots it uses exist in the video's images.js as kind `use`.
 *    The smoke render needs esbuild + react-dom (same lookup as build.mjs); skipped if absent.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectQuestions, QUIZ_TAG } from './lib/qa-manifest.mjs';
// Gate về CHỮ tách ra `tools/lib/text-gates.mjs` để script lane chạy được trên nháp (retro E4).
import { MIN_FONT_PX, estimateTextWidth, overflowsBox, ssrTextBoxes } from './lib/ssr-boxes.mjs';
import { stripComments } from './lib/source-scan.mjs';
import { longCueProblems, normText, textGateProblems } from './lib/text-gates.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

// The design system may add colors (declared in its lib/tokens.js) and component groups that have no
// preview card yet (reported as warnings). VK_DS points the check at another folder.
const DS = path.resolve(ROOT, process.env.VK_DS || 'vinuni-lesson-video-ds');
const warnings = [];
const SKIP = new Set(['node_modules', 'dist', 'fonts']);
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? (SKIP.has(d.name) ? [] : walk(path.join(dir, d.name))) : [path.join(dir, d.name)],
  );
const files = walk(DS);
const rel = (f) => path.relative(DS, f);
const problems = [];

// 0 · the built bundle
// dist/ is not in git (it is built from the local videos/, which are not in git either), so a checkout
// that has never been built has no bundle — and every card.html and the lesson-video kit then load
// nothing and paint a blank page whose only clue is `VK is not defined` in the browser console. Say so
// here instead, where someone is already looking.
const BUNDLE = path.join(DS, 'dist/vk.js');
if (!fs.existsSync(BUNDLE) || fs.statSync(BUNDLE).size === 0) {
  problems.push(`${path.relative(ROOT, BUNDLE)} chưa được dựng — chạy \`npm run build\` (card và kit sẽ trắng trang nếu thiếu)`);
}

// 1 · cards
const cardRe = /^<!-- @dsCard group="([^"]+)" viewport="(\d+)x(\d+)" name="([^"]+)" subtitle="([^"]*)" -->$/;
const cards = [];
for (const f of files.filter((x) => x.endsWith('.html'))) {
  const text = fs.readFileSync(f, 'utf8');
  const first = text.split('\n')[0].trimEnd(); // CRLF checkouts leave \r, which the $-anchored regex rejects
  if (!text.includes('@dsCard')) continue;
  const m = first.match(cardRe);
  if (!m) {
    problems.push(`card marker missing/malformed on line 1: ${rel(f)}`);
    continue;
  }
  const [, group, w, h] = m;
  cards.push({ file: rel(f), group, w: Number(w), h: Number(h) });
  if (Number(w) === 700 && Number(h) > 400) problems.push(`card taller than 400 px: ${rel(f)}`);
}

// 2 · component docs + one card per group
for (const f of files.filter((x) => x.endsWith('.jsx') && rel(x).startsWith('components/'))) {
  const base = f.replace(/\.jsx$/, '');
  for (const ext of ['.d.ts', '.prompt.md']) if (!fs.existsSync(base + ext)) problems.push(`missing ${ext} for ${rel(f)}`);
}
for (const d of fs.readdirSync(path.join(DS, 'components'), { withFileTypes: true }).filter((x) => x.isDirectory() && !x.name.startsWith('.'))) {
  const n = fs.readdirSync(path.join(DS, 'components', d.name)).filter((x) => x.endsWith('.html')).length;
  if (n !== 1) (n === 0 ? warnings : problems).push(`components/${d.name} has ${n} card files (want 1)`);
}

// 2b · a card may only call names the bundle actually exports.
// `VK.KhongCoThat` is not an error in a browser — React renders nothing for an undefined component
// and the card just misses a piece, silently. Mascot's card read an undeclared `poses` for a whole
// session that way. Load the built bundle here and compare, where the miss is loud.
if (fs.existsSync(BUNDLE) && fs.statSync(BUNDLE).size > 0) {
  let exported = null;
  try {
    const stubDoc = { createElement: () => ({ style: {} }), head: { appendChild() {} } };
    const VK = new Function('window', 'document', 'navigator', 'self', `${fs.readFileSync(BUNDLE, 'utf8')}; return VK;`)(
      {}, stubDoc, { userAgent: 'node' }, {},
    );
    exported = new Set(Object.keys(VK));
  } catch (e) {
    problems.push(`không nạp được dist/vk.js để đối chiếu tên trong card: ${e.message}`);
  }
  if (exported) {
    for (const c of cards) {
      const text = fs.readFileSync(path.join(DS, c.file), 'utf8');
      // Two spellings in use, and a check that knows only the first reads evidence/card.html as empty:
      //   h(VK.Evidence, …)                          → member access
      //   const { Evidence } = window.VK             → destructuring
      const used = new Set([...text.matchAll(/\bVK\.([A-Za-z_][A-Za-z0-9_]*)/g)].map((m) => m[1]));
      for (const d of text.matchAll(/\{([^{}]*)\}\s*=\s*(?:window\.)?VK\b/g)) {
        for (const part of d[1].split(',')) {
          const name = part.split(':').pop().trim();
          if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) used.add(name);
        }
      }
      const missing = [...used].filter((n) => !exported.has(n));
      if (missing.length) problems.push(`${c.file} gọi tên không có trong VK: ${missing.join(', ')}`);
    }
  }
}

// 3 · palette + determinism in code
const PALETTE = new Set(['#ffffff', '#f2f7fc', '#0b2a4d', '#4a4a4a', '#1d6199', '#134d8b', '#c72127', '#ffe0e1', '#e0edf8']);
// Palette = the 9 base colors + whatever lib/tokens.js declares (one place to review new colors).
for (const m of fs.readFileSync(path.join(DS, 'lib/tokens.js'), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) PALETTE.add(m[0].toLowerCase());
// Approved traced illustration carries its source image's nuanced colors; UI and expression code still uses tokens.
// revampOutline.js is generated FROM that artwork (traced silhouettes + its own outline color), so it is the
// same class of file, not hand-written UI code. Keep the list to files that are generated from the artwork.
const ARTWORK_COLOR_EXCEPTION = new Set([
  'components/mascot/revampArtwork.js',
  'components/mascot/revampOutline.js',
]);
for (const f of files.filter((x) => /\.(jsx|js)$/.test(x))) {
  const raw = fs.readFileSync(f, 'utf8');
  /*
   * Quét trên bản ĐÃ BỎ COMMENT (F6). `off-palette` thì CỐ Ý giữ nguyên bản thô: một hex nằm trong
   * comment vẫn là hex bị rải, và luật "thêm màu = khai vào tokens.js" áp cả cho ví dụ trong chú
   * thích. Còn `Math.random`/`Date.now` trong comment là CHỮ, không phải lời gọi — nó không làm
   * render mất tính tất định, nên báo nó là báo giả.
   */
  const src = stripComments(raw);
  for (const m of (ARTWORK_COLOR_EXCEPTION.has(rel(f)) ? [] : raw.matchAll(/#[0-9a-fA-F]{6}\b/g))) {
    if (!PALETTE.has(m[0].toLowerCase())) problems.push(`off-palette ${m[0]} in ${rel(f)}`);
  }
  const r = rel(f);
  if ((r.startsWith('components/') || r.startsWith('ui_kits/')) && /Math\.random|Date\.now\(/.test(src)) {
    problems.push(`non-deterministic call in ${r}`);
  }
}

// 4 · captions per scene
const scenes = [];
for (const f of files.filter((x) => rel(x).startsWith('ui_kits/lesson-video/scenes/') && x.endsWith('.jsx'))) {
  const src = fs.readFileSync(f, 'utf8');
  const id = (src.match(/id:\s*['"]([^'"]+)['"]/) || [])[1];
  const duration = Number((src.match(/duration:\s*(\d+)/) || [])[1]);
  const caps = [...src.matchAll(/\{\s*start:\s*(\d+),\s*end:\s*(\d+),\s*text:\s*(['"])((?:\\.|(?!\3).)*)\3/g)].map((m) => ({
    start: Number(m[1]),
    end: Number(m[2]),
    text: m[4],
  }));
  scenes.push({ id, duration, captions: caps.length, file: rel(f) });
  let prev = 0;
  for (const c of caps) {
    if ([...c.text].length > 78) problems.push(`caption ${[...c.text].length} chars in ${rel(f)}: ${c.text}`);
    if (c.start !== prev) problems.push(`caption gap/overlap at frame ${c.start} in ${rel(f)}`);
    prev = c.end;
  }
  if (caps.length && prev !== duration) problems.push(`captions end at ${prev} but duration is ${duration} in ${rel(f)}`);
}

// 5 · example videos
const VIDEOS_DIR = path.join(DS, 'ui_kits/lesson-video/videos');
const videoDirs = fs.existsSync(VIDEOS_DIR)
  ? fs.readdirSync(VIDEOS_DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()
  : [];
const NODE_MODULES = [
  process.env.VK_NODE_MODULES,
  path.join(ROOT, 'node_modules'),
]
  .filter(Boolean)
  .find((p) => fs.existsSync(path.join(p, 'esbuild')) && fs.existsSync(path.join(p, 'react-dom')));
/**
 * Hai lỗi bố cục dưới đây từng phải xem lại bản render mới phát hiện, và lần nào cũng mất một lượt
 * render 5 phút. Chúng kiểm được bằng máy trên chính chuỗi HTML mà smoke render đã dựng, nên đưa
 * vào đây: rẻ, và chặn trước khi kịp đi vào video.
 */


/**
 * Mọi đoạn chữ trong một frame, kèm toạ độ và cỡ.
 *
 * Chữ nhiều dòng (Card, SvgText nhiều dòng) render thành <tspan> LỒNG trong <text>, mỗi tspan một
 * dòng với `x` riêng và `dy` cộng dồn. Bản đầu của hàm này khớp `<text[^>]*>([^<]*)</text>` nên gặp
 * tspan là trượt — tức là bỏ sót gần hết chữ trong video, và hai check dựa trên nó im lặng báo
 * "không sao". Phải bóc từng tspan ra thành một node riêng.
 */
function textNodes(html) {
  const out = [];
  for (const m of html.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)) {
    const attrs = m[1];
    const body = m[2];
    const x = Number((attrs.match(/\bx="(-?[\d.]+)"/) || [])[1]);
    const y = Number((attrs.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const anchor = (attrs.match(/text-anchor="(\w+)"/) || [])[1] || 'start';
    const size = Number((attrs.match(/font-size="([\d.]+)"/) || [])[1]) || 24;
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    const spans = [...body.matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
    if (spans.length) {
      let dy = 0;
      for (const sp of spans) {
        dy += Number((sp[1].match(/\bdy="(-?[\d.]+)"/) || [])[1]) || 0;
        const sx = Number((sp[1].match(/\bx="(-?[\d.]+)"/) || [])[1]);
        const text = sp[2].replace(/&[a-z]+;/g, ' ').trim();
        if (text) out.push({ x: Number.isFinite(sx) ? sx : x, y: y + dy, anchor, size, text });
      }
      continue;
    }
    const text = body.replace(/&[a-z]+;/g, ' ').trim();
    if (text) out.push({ x, y, anchor, size, text });
  }
  return out;
}

/**
 * Chữ rơi vào vùng một component đã khai `data-vk-occupies="x,y,rộng,cao"` (hiện chỉ Mascot khai).
 * Ước lượng bề ngang chữ bằng 0,52 × cỡ chữ mỗi ký tự — không cần chính xác, chỉ cần đủ để thấy
 * chữ và nhân vật giẫm lên nhau.
 */
function overlaps(html) {
  const zones = [...html.matchAll(/data-vk-occupies="(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)"/g)]
    .map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4] }));
  if (!zones.length) return [];

  const hits = [];
  const clash = (box, what) => {
    for (const z of zones) {
      if (box.x1 > z.x && box.x0 < z.x + z.w && box.y1 > z.y && box.y0 < z.y + z.h) { hits.push(what); return; }
    }
  };

  for (const t of textNodes(html)) {
    // Bề ngang ước lượng 0,52 × cỡ chữ mỗi ký tự. Không cần chính xác, chỉ cần đủ để thấy giẫm nhau.
    const w = t.text.length * t.size * 0.52;
    const x0 = t.anchor === 'middle' ? t.x - w / 2 : t.anchor === 'end' ? t.x - w : t.x;
    clash({ x0, x1: x0 + w, y0: t.y - t.size, y1: t.y + t.size * 0.3 }, `text "${t.text.slice(0, 40)}" sits under the mascot`);
  }

  /*
   * Hộp cũng phải kiểm, không chỉ chữ: một Card chạy dài tới dưới chân mascot thì chữ trong nó vẫn
   * nằm giữa hộp và lọt qua vòng trên, nhưng người xem thấy rõ cái hộp chui xuống dưới con chim.
   * Chỉ xét hộp đang hiện (opacity khác 0) — cue nào chưa tới lượt thì nó vô hình, không phải lỗi.
   */
  /*
   * Hai nguồn báo giả đã gặp thật (retro d05-v06 F5), cả hai đều là `<rect>` KHÔNG vẽ ra pixel nào:
   *  1. `<rect>` nằm trong `<clipPath>`/`<mask>`/`<defs>` — nó là HÌNH CẮT, không phải nội dung.
   *     Thuộc tính `clip-path=` trên chính rect đã bị lọc; thứ lọt lưới là rect NẰM TRONG một
   *     `<clipPath>`, vì lúc đó không attribute nào trên nó nói lên điều ấy.
   *  2. `<rect>` nằm TRONG chính nhóm đã khai `data-vk-occupies` — đó là thân con mascot, nó
   *     "đè lên mascot" theo đúng thiết kế. Bản cũ báo mascot giẫm lên chính nó.
   */
  const masked = new Set();
  for (const m of html.matchAll(/<(clipPath|mask|defs)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    for (const r of m[2].matchAll(/<rect\b[^>]*>/g)) masked.add(r[0]);
  }
  for (const m of html.matchAll(/<g\b[^>]*data-vk-occupies="[^"]*"[^>]*>([\s\S]*?)<\/g>/g)) {
    for (const r of m[1].matchAll(/<rect\b[^>]*>/g)) masked.add(r[0]);
  }
  for (const m of html.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    if (masked.has(m[0])) continue;
    if (/\bmask=|clip-path=/.test(a)) continue;
    const opacity = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (opacity !== undefined && Number(opacity) < 0.05) continue;
    const x = Number((a.match(/\bx="(-?[\d.]+)"/) || [])[1]);
    const y = Number((a.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const w = Number((a.match(/\bwidth="([\d.]+)"/) || [])[1]);
    const h = Number((a.match(/\bheight="([\d.]+)"/) || [])[1]);
    if (![x, y, w, h].every(Number.isFinite)) continue;
    if (w >= 1900 || h >= 1000) continue; // nền cả khung, không phải một thẻ nội dung
    clash({ x0: x, x1: x + w, y0: y, y1: y + h }, `a ${Math.round(w)}×${Math.round(h)} box at ${Math.round(x)},${Math.round(y)} runs under the mascot`);
  }

  return [...new Set(hits)];
}

/**
 * Chữ rộng hơn cái hộp chứa nó.
 *
 * Lỗi này xuất hiện lại mỗi khi ai đó sửa lời trong một thẻ mà quên hộp rộng bao nhiêu, và trên bản
 * render nó đọc ra là chữ chạy tràn qua mép hộp sang nền trắng. Rẻ để kiểm: mỗi <text> căn giữa đều
 * nằm trong đúng một <rect>, so bề ngang ước lượng với bề ngang hộp trừ padding.
 */
function textOverflow(html) {
  const rects = [];
  for (const m of html.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    if (/\bmask=|clip-path=/.test(a)) continue;
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    const x = Number((a.match(/\bx="(-?[\d.]+)"/) || [])[1]);
    const y = Number((a.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const w = Number((a.match(/\bwidth="([\d.]+)"/) || [])[1]);
    const h = Number((a.match(/\bheight="([\d.]+)"/) || [])[1]);
    if (![x, y, w, h].every(Number.isFinite) || w >= 1900) continue;
    // Hộp nhỏ (icon, chấm, badge) không phải thứ chứa chữ — chữ chỉ tình cờ nằm đè lên nó.
    if (w < 90 || h < 40) continue;
    rects.push({ x, y, w, h });
  }
  const out = [];
  for (const t of textNodes(html)) {
    if (t.anchor !== 'middle') continue;
    // Hệ số ước lượng + cushion: `lib/ssr-boxes.mjs` (đo thật bằng getComputedTextLength, 22/09).
    // Hộp nhỏ nhất bao quanh tâm chữ — thẻ lồng trong thẻ thì cái trong mới là cái chứa chữ.
    let box = null;
    for (const r of rects) {
      if (t.x > r.x && t.x < r.x + r.w && t.y > r.y && t.y < r.y + r.h) {
        if (!box || r.w * r.h < box.w * box.h) box = r;
      }
    }
    if (box && overflowsBox(t.text, t.size, box.w)) {
      out.push(`chữ "${t.text.slice(0, 34)}" rộng hơn hộp ${Math.round(box.w)} px (ước ${Math.round(estimateTextWidth(t.text, t.size))} px — đo thật bằng \`qa-layout\`)`);
    }
  }
  return out;
}

/**
 * Vùng nội dung (y 250–960) trống bao nhiêu phần trăm.
 *
 * Slide để trống hơn nửa khung trong vài giây trông như đang thiếu mất một mảng, và thường là dấu
 * hiệu bố cục đã chừa chỗ cho phần nội dung chỉ hiện ở câu SAU. Đây là cảnh báo chứ không phải lỗi:
 * một câu chốt cố ý để trống là hợp lệ, nên máy chỉ nêu ra để người dựng nhìn lại.
 *
 * Cách đo thô nhưng đủ dùng: cộng diện tích các hộp và chữ đang hiện, không trừ phần chồng nhau.
 */
const CONTENT_TOP = 250;
const CONTENT_BOTTOM = 960;
const CONTENT_AREA = 1920 * (CONTENT_BOTTOM - CONTENT_TOP);

function filledHalves(html) {
  const half = [0, 0]; // [trái, phải]
  const add = (x0, x1, h) => {
    for (const [i, [lo, hi]] of [[0, 960], [960, 1920]].entries()) {
      const a = Math.max(x0, lo);
      const b = Math.min(x1, hi);
      if (b > a) half[i] += (b - a) * h;
    }
  };
  for (const m of html.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    if (/\bmask=|clip-path=/.test(a)) continue;
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    const x = Number((a.match(/\bx="(-?[\d.]+)"/) || [])[1]);
    const y = Number((a.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const w = Number((a.match(/\bwidth="([\d.]+)"/) || [])[1]);
    const h = Number((a.match(/\bheight="([\d.]+)"/) || [])[1]);
    if (![x, y, w, h].every(Number.isFinite) || w >= 1900) continue;
    const top = Math.max(y, CONTENT_TOP);
    const bottom = Math.min(y + h, CONTENT_BOTTOM);
    if (bottom > top) add(x, x + w, bottom - top);
  }
  /*
   * `<path>` và `<circle>` cũng là vật thể trên khung. Bản cũ chỉ đếm `<rect>`, nên một cảnh dòng
   * poster — nơi `data-vk-occupies` ÉP dùng `<path>` cho hình nhân vật — bị tính diện tích 0 và
   * gate báo oan "nửa kia bỏ không". Hai gate đá nhau, mất 10–30 phút mỗi lần (retro d05-v06 F5).
   * Diện tích lấy theo HỘP BAO của các toạ độ trong `d` — xấp xỉ thừa, nhưng gate này chỉ so
   * LỆCH giữa hai nửa nên xấp xỉ thừa đúng hướng an toàn: nó làm gate im, không làm gate báo bừa.
   */
  for (const m of html.matchAll(/<path\b([^>]*)>/g)) {
    const a = m[1];
    if (/\bmask=|clip-path=/.test(a)) continue;
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    const d = (a.match(/\bd="([^"]+)"/) || [])[1];
    if (!d) continue;
    const nums = d.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 4) continue;
    const xs = []; const ys = [];
    for (let i = 0; i + 1 < nums.length; i += 2) { xs.push(Number(nums[i])); ys.push(Number(nums[i + 1])); }
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    if (![x0, x1, y0, y1].every(Number.isFinite) || x1 - x0 >= 1900) continue;
    const top = Math.max(y0, CONTENT_TOP);
    const bottom = Math.min(y1, CONTENT_BOTTOM);
    if (bottom > top) add(x0, x1, bottom - top);
  }
  for (const tag of ['circle', 'ellipse']) {
    for (const m of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
      const a = m[1];
      const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
      if (op !== undefined && Number(op) < 0.05) continue;
      const cx = Number((a.match(/\bcx="(-?[\d.]+)"/) || [])[1]);
      const cy = Number((a.match(/\bcy="(-?[\d.]+)"/) || [])[1]);
      const r = Number((a.match(/\br="([\d.]+)"/) || [])[1] ?? (a.match(/\brx="([\d.]+)"/) || [])[1]);
      if (![cx, cy, r].every(Number.isFinite) || r <= 0) continue;
      const top = Math.max(cy - r, CONTENT_TOP);
      const bottom = Math.min(cy + r, CONTENT_BOTTOM);
      if (bottom > top) add(cx - r, cx + r, bottom - top);
    }
  }
  for (const t of textNodes(html)) {
    if (t.y < CONTENT_TOP || t.y > CONTENT_BOTTOM) continue;
    const w = t.text.length * t.size * 0.52;
    const x0 = t.anchor === 'middle' ? t.x - w / 2 : t.anchor === 'end' ? t.x - w : t.x;
    add(x0, x0 + w, t.size * 1.3);
  }
  /*
   * Cảnh dòng poster dựng bằng `<div>` + inline style (demo: 0 `<text>`, 158 div `position:absolute`)
   * — không có một `<rect>`/`<text>` nào để đếm. Lấy hộp từ SSR markup, cùng nguồn `qa-layout` dùng.
   */
  for (const b of ssrTextBoxes(html)) {
    if (!b.positioned) continue; // không khai toạ độ thì không định vị được vào nửa nào
    const top = Math.max(b.y, CONTENT_TOP);
    const bottom = Math.min(b.y + b.h, CONTENT_BOTTOM);
    if (bottom > top) add(b.x, b.x + b.w, bottom - top);
  }
  // Mascot cũng là vật thể trên khung: nửa nào có nhân vật đứng thì nửa đó không "trống".
  for (const m of html.matchAll(/data-vk-occupies="(-?[\d.]+),(-?[\d.]+),([\d.]+),([\d.]+)"/g)) {
    const x = +m[1]; const y = +m[2]; const w = +m[3]; const h = +m[4];
    const top = Math.max(y, CONTENT_TOP);
    const bottom = Math.min(y + h, CONTENT_BOTTOM);
    if (bottom > top) add(x, x + w, bottom - top);
  }
  const perHalf = CONTENT_AREA / 2;
  return [Math.min(1, half[0] / perHalf), Math.min(1, half[1] / perHalf)];
}

/**
 * Đếm xem vùng nội dung (y 250–960) có ĐANG VẼ GÌ không, không quan tâm diện tích.
 *
 * Ca thật đã lọt qua verify (n5-02, 16/09/2026): 4 câu cuối thiếu hẳn file scene, `content(n,f)`
 * trả `null`, hai nửa khung đều 0% — nhưng `filledHalves` chỉ so LỆCH giữa hai nửa (một bên gần 0%,
 * bên kia trên 22%), nên "cả hai bên đều 0%" không rơi vào điều kiện lệch nào và không bị báo.
 * `filledHalves` cũng chỉ tính `<rect>` + chữ + mascot — một cảnh dựng toàn `<circle>`/`<path>`/
 * `<image>` (sơ đồ tròn, Evidence) bị tính diện tích bằng 0 dù đang vẽ thật, nên không thể "sửa"
 * filledHalves thành bắt-cả-hai-bên-0% mà không báo giả tràn lan. Đếm SỰ TỒN TẠI (không đo diện
 * tích) của mọi loại phần tử vẽ — rect có diện tích, chữ, circle, path có `d` thật, image — đúng
 * loại nội dung một cảnh trống thật sự không có, còn cảnh dựng bằng circle/path/image vẫn được tính.
 */
function contentElementCount(html) {
  let n = 0;
  for (const t of textNodes(html)) if (t.y >= CONTENT_TOP && t.y <= CONTENT_BOTTOM) n++;
  for (const m of html.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    if (/\bmask=|clip-path=/.test(a)) continue;
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    const y = Number((a.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const w = Number((a.match(/\bwidth="([\d.]+)"/) || [])[1]);
    const h = Number((a.match(/\bheight="([\d.]+)"/) || [])[1]);
    if (![y, w, h].every(Number.isFinite) || w >= 1900 || w < 4 || h < 4) continue; // bỏ nền cả khung
    if (y >= CONTENT_TOP - h && y <= CONTENT_BOTTOM) n++;
  }
  for (const tag of ['circle', 'ellipse', 'image']) {
    for (const m of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
      const a = m[1];
      const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
      if (op !== undefined && Number(op) < 0.05) continue;
      const y = Number((a.match(/\bcy="(-?[\d.]+)"/) || a.match(/\by="(-?[\d.]+)"/) || [])[1]);
      if (Number.isFinite(y) && (y < CONTENT_TOP - 200 || y > CONTENT_BOTTOM + 200)) continue;
      n++;
    }
  }
  for (const m of html.matchAll(/<path\b([^>]*)>/g)) {
    const a = m[1];
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    if ((a.match(/\bd="([^"]*)"/) || [])[1]?.length > 6) n++;
  }
  // `overlay` là HTML thật vẽ TRÊN <svg> (Recap, question card, hook overlay — xem
  // `SceneFrame.jsx`), không phải phần tử SVG nào cả — không đếm được bằng bốn vòng lặp trên. Một
  // <div> có chữ bên trong (không phải div rỗng chỉ để định vị/style) là dấu hiệu overlay đang vẽ
  // nội dung thật. Không lọc theo toạ độ (overlay dùng `top`/`left` khác hệ toạ độ SVG y/x).
  for (const m of html.matchAll(/<div\b[^>]*>([^<]+)<\/div>/g)) {
    if (m[1].trim()) n++;
  }
  return n;
}

/**
 * Tiêu đề cue đã hiện ở đầu slide rồi lại được viết lại nguyên văn trong phần nội dung. Người xem
 * đọc hai lần cùng một câu, và chỗ đó lẽ ra dành cho một ý mới.
 */
function duplicateTitle(html) {
  const title = (html.match(/class="vk-title"[^>]*>([^<]+)</) || [])[1];
  if (!title) return null;
  const want = normText(title);
  if (want.length < 8) return null;
  for (const t of textNodes(html)) if (normText(t.text) === want) return title.trim();
  return null;
}

/**
 * "Dấu vân tay" hình khối của một khung hình — dùng để phát hiện FM-20 (một sơ đồ đứng yên quá lâu,
 * không có minh hoạ bổ trợ). Chỉ lấy `rect`/`circle`/`ellipse`/`image` có kích thước đáng kể trong
 * vùng nội dung, làm tròn toạ độ để dung sai animation nhỏ (spring/interpolate lệch vài px giữa hai
 * lần render không phải là "đổi nội dung"). CỐ Ý bỏ qua `<text>` (caption/narration đổi mỗi cue dù
 * diagram có đứng yên hay không — so bằng text sẽ không bao giờ khớp, vô dụng) và `<path>` (mascot
 * là 417 path tĩnh dùng chung mọi cue — đưa vào sẽ làm mọi fingerprint giống hệt nhau vì path của
 * mascot áp đảo số lượng, che mất khác biệt thật của diagram).
 */
function visualFingerprint(html) {
  const boxes = [];
  for (const m of html.matchAll(/<rect\b([^>]*)>/g)) {
    const a = m[1];
    if (/\bmask=|clip-path=/.test(a)) continue;
    const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
    if (op !== undefined && Number(op) < 0.05) continue;
    const x = Number((a.match(/\bx="(-?[\d.]+)"/) || [])[1]);
    const y = Number((a.match(/\by="(-?[\d.]+)"/) || [])[1]);
    const w = Number((a.match(/\bwidth="([\d.]+)"/) || [])[1]);
    const h = Number((a.match(/\bheight="([\d.]+)"/) || [])[1]);
    if (![x, y, w, h].every(Number.isFinite) || w >= 1900 || w < 20 || h < 20) continue;
    if (y + h >= CONTENT_TOP && y <= CONTENT_BOTTOM) boxes.push(`r${Math.round(x / 10)},${Math.round(y / 10)},${Math.round(w / 10)},${Math.round(h / 10)}`);
  }
  for (const tag of ['circle', 'ellipse', 'image']) {
    for (const m of html.matchAll(new RegExp(`<${tag}\\b([^>]*)>`, 'g'))) {
      const a = m[1];
      const op = (a.match(/\bopacity="([\d.]+)"/) || [])[1];
      if (op !== undefined && Number(op) < 0.05) continue;
      const cx = Number((a.match(/\bcx="(-?[\d.]+)"/) || a.match(/\bx="(-?[\d.]+)"/) || [])[1]);
      const cy = Number((a.match(/\bcy="(-?[\d.]+)"/) || a.match(/\by="(-?[\d.]+)"/) || [])[1]);
      const r = Number((a.match(/\br="([\d.]+)"/) || a.match(/\bwidth="([\d.]+)"/) || [])[1]);
      if (!Number.isFinite(r) || r < 10) continue;
      if (Number.isFinite(cy) && (cy < CONTENT_TOP - 200 || cy > CONTENT_BOTTOM + 200)) continue;
      boxes.push(`${tag[0]}${Math.round((cx || 0) / 10)},${Math.round((cy || 0) / 10)},${Math.round(r / 10)}`);
    }
  }
  return boxes.sort().join('|');
}

/**
 * `marks` của `Evidence` là toạ độ TỈ LỆ 0-1 so với chính ảnh crop (xem `Evidence.jsx`), vẽ bên
 * trong một `<g transform="... rotate(...) ...">` để tạo hiệu ứng giấy nghiêng — verify không resolve
 * được transform lồng nhau (giới hạn đã ghi ở FM-18), nên không kiểm được "khung đỏ có đè lên chữ
 * khác không" từ SVG render. Nhưng bounds 0-1 là quy ước cố định, kiểm được thẳng trên SOURCE trước
 * khi render — bắt được lớp lỗi rẻ nhất: gõ nhầm số (x=1.5, w âm, x+w tràn ra ngoài ảnh). Không bắt
 * được lớp lỗi ngữ nghĩa "khoanh đúng-số-nhưng-sai-chỗ" (như ca thật FM-21, cue 8/22 n5-06) — lớp đó
 * bắt buộc phải nhìn ảnh thật, không có cách nào tự động hoá đáng tin.
 */
function evidenceMarkBounds(src) {
  const out = [];
  for (const m of src.matchAll(/marks=\{\[([\s\S]*?)\]\}/g)) {
    for (const mk of m[1].matchAll(/\{\s*x:\s*(-?[\d.]+),\s*y:\s*(-?[\d.]+),\s*w:\s*(-?[\d.]+),\s*h:\s*(-?[\d.]+)\s*\}/g)) {
      const [x, y, w, h] = mk.slice(1, 5).map(Number);
      if (x < -0.01 || y < -0.01 || w <= 0 || h <= 0 || x + w > 1.02 || y + h > 1.02) {
        out.push(`marks {x:${x}, y:${y}, w:${w}, h:${h}} ra ngoài khung ảnh (0-1) hoặc kích thước vô lý`);
      }
    }
  }
  return out;
}

/**
 * Không có độ dài mặc định — REQUEST.md là authority duy nhất cho thời lượng. Chỉ video có ghi rõ
 * một khoảng phút cụ thể mới bị gate theo đúng khoảng đó; phần lớn video không ghi gì và không bị
 * gate, để nội dung tự quyết định độ dài.
 */
function requestedMinuteRange(dir) {
  const file = path.join(ROOT, 'projects', dir, 'REQUEST.md');
  if (!fs.existsSync(file)) return null;
  const text = fs.readFileSync(file, 'utf8');
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*[–—-]\s*(\d+(?:[.,]\d+)?)\s*phút/iu);
  if (!m) return null;
  return [Number(m[1].replace(',', '.')), Number(m[2].replace(',', '.'))];
}

/**
 * Trục `motion` của một video (`poster` | `slide`), đọc từ `REQUEST.md`. Dùng để TẮT những gate
 * chỉ đúng với bố cục dòng slide. Video cũ không khai gì → suy từ `stage.jsx` (chỉ dòng poster mới
 * gọi `createPosterStage`), rồi mặc định `slide` như trước.
 */
function motionOf(dir) {
  const req = path.join(ROOT, 'projects', dir, 'REQUEST.md');
  if (fs.existsSync(req)) {
    const m = fs.readFileSync(req, 'utf8').match(/^\s*[-*]\s*\*\*(?:motion|line)\*\*\s*:\s*`?(poster|slide)`?/im);
    if (m) return m[1].toLowerCase();
  }
  const stage = path.join(VIDEOS_DIR, dir, 'stage.jsx');
  if (fs.existsSync(stage) && /createPosterStage/.test(fs.readFileSync(stage, 'utf8'))) return 'poster';
  return 'slide';
}

const videoReports = [];

// Pictures (PhotoCard) in one video folder. Static, regex-based like the rest of this file: a PhotoCard
// must show a local file with its credit, and only what the editor approved in images.js.
// `src` is a path from the design-system root (lib/assets.js dsUrl), never a URL.
const localFile = (src) => !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(src) && fs.existsSync(path.join(DS, src.split(/[?#]/)[0]));
function checkPictures(base, where) {
  const imagesFile = path.join(base, 'images.js');
  const slots = new Map();
  if (fs.existsSync(imagesFile)) {
    const src = fs.readFileSync(imagesFile, 'utf8');
    for (const m of src.matchAll(/(?:^|[\s{,])['"]?(s\d+)['"]?\s*:\s*\{([^{}]*)\}/g)) {
      const body = m[2];
      const file = (body.match(/\bsrc['"]?\s*:\s*['"]([^'"]+)['"]/) || [])[1];
      const kind = (body.match(/\bkind['"]?\s*:\s*['"]([^'"]+)['"]/) || [])[1];
      slots.set(m[1], { file, kind });
      if (!file) problems.push(`${where}/images.js: ${m[1]} has no src`);
      else if (!localFile(file)) problems.push(`${where}/images.js: ${m[1]} src ${file} is not a design-system file (path from vinuni-lesson-video-ds/)`);
    }
  }
  const sources = fs.readdirSync(base).filter((f) => /\.jsx?$/.test(f) && f !== 'images.js');
  for (const f of sources) {
    const code = fs.readFileSync(path.join(base, f), 'utf8');
    for (const m of code.matchAll(/<PhotoCard\b([\s\S]*?)\/>/g)) {
      const props = m[1];
      const line = code.slice(0, m.index).split('\n').length;
      const at = `${where}/${f}:${line}`;
      if (!/\bcredit=/.test(props)) problems.push(`${at}: PhotoCard without credit`);
      const literal = (props.match(/\bsrc=(?:\{\s*)?['"`]([^'"`]+)['"`]/) || [])[1];
      if (literal && !localFile(literal)) problems.push(`${at}: PhotoCard src ${literal} must be a design-system file, as a path from vinuni-lesson-video-ds/ (no URLs)`);
      if (!fs.existsSync(imagesFile)) {
        warnings.push(`${at}: PhotoCard in a video without images.js — only pictures the editor approved belong here`);
        continue;
      }
      for (const slot of new Set([...props.matchAll(/IMAGES(?:\.(s\d+)|\[['"](s\d+)['"]\])/g)].map((x) => x[1] || x[2]))) {
        const def = slots.get(slot);
        if (!def) warnings.push(`${at}: PhotoCard uses ${slot}, which images.js does not list`);
        else if (def.kind && def.kind !== 'use') warnings.push(`${at}: PhotoCard shows ${slot}, a "${def.kind}" picture — redraw it instead of showing it`);
      }
    }
  }

}
for (const dir of videoDirs) {
  const MOTION = motionOf(dir); // `poster` | `slide` — quyết định gate nào áp (xem motionOf)
  const base = path.join(VIDEOS_DIR, dir);
  const where = `videos/${dir}`;
  // A video still before its scenes step (Studio has written cues.js / voice.js, nobody has built a scene yet)
  // is work in progress, not a broken example: reporting it as a problem failed the scenes gate of every
  // *other* video on the machine while one waited at the voice step.
  if (!fs.existsSync(path.join(base, 'video.jsx')) && fs.existsSync(path.join(base, 'cues.js'))) {
    warnings.push(`${where}: chưa dựng cảnh (có cues.js, chưa có video.jsx) — bỏ qua`);
    videoReports.push(`  ${dir}: chưa dựng cảnh — bỏ qua`);
    continue;
  }
  for (const f of ['video.jsx', 'cues.js', 'card.html', 'player.html', 'STORYBOARD.md']) {
    if (!fs.existsSync(path.join(base, f))) problems.push(`${where} is missing ${f}`);
  }
  for (const f of fs.readdirSync(base).filter((x) => x.endsWith('.jsx'))) {
    for (const m of evidenceMarkBounds(fs.readFileSync(path.join(base, f), 'utf8'))) problems.push(`${where}/${f}: ${m}`);
  }
  checkPictures(base, where);
  if (!NODE_MODULES) {
    videoReports.push(`  ${dir}: smoke render skipped (esbuild + react-dom not found)`);
    continue;
  }
  const require = createRequire(path.join(NODE_MODULES, 'noop.js'));
  const esbuild = require('esbuild');
  const entry = `
    import React from 'react';
    import { renderToStaticMarkup } from 'react-dom/server';
    import Video, { meta } from ${JSON.stringify(path.join(base, 'video.jsx'))};
    import { CUES as AUTHORED } from ${JSON.stringify(path.join(base, 'cues.js'))};
    ${
      fs.existsSync(path.join(base, 'timeline.js'))
        ? `import { TIMELINE } from ${JSON.stringify(path.join(base, 'timeline.js'))}; const CUES = TIMELINE;`
        : 'const CUES = AUTHORED;'
    }
    import { cueCaptions } from ${JSON.stringify(path.join(DS, 'lib/captions.js'))};
    import { ConfigContext, FrameContext } from ${JSON.stringify(path.join(DS, 'lib/player.jsx'))};
    export { meta, CUES, AUTHORED, cueCaptions };
    export const renderAt = (frame) =>
      renderToStaticMarkup(
        React.createElement(ConfigContext.Provider, { value: { fps: 30, width: 1920, height: 1080, durationInFrames: meta.duration } },
          React.createElement(FrameContext.Provider, { value: frame }, React.createElement(Video))));
  `;
  let mod;
  try {
    const out = await esbuild.build({
      stdin: { contents: entry, resolveDir: base, loader: 'jsx' },
      bundle: true,
      write: false,
      format: 'cjs',
      platform: 'node',
      jsx: 'automatic',
      nodePaths: [NODE_MODULES],
      loader: { '.js': 'jsx', '.jsx': 'jsx' },
      define: { 'process.env.NODE_ENV': '"production"' },
      logLevel: 'silent',
    });
    mod = { exports: {} };
    new Function('module', 'exports', 'require', out.outputFiles[0].text)(mod, mod.exports, require);
    mod = mod.exports;
  } catch (e) {
    problems.push(`${where} does not build or load: ${String(e.message || e).split('\n')[0]}`);
    continue;
  }
  const { meta, CUES, AUTHORED, cueCaptions, renderAt } = mod;
  const last = CUES[CUES.length - 1];
  if (meta.duration !== last.end) problems.push(`${where}: meta.duration ${meta.duration} ≠ last cue end ${last.end}`);
  const requestedRange = requestedMinuteRange(dir);
  if (requestedRange) {
    const [minMinutes, maxMinutes] = requestedRange;
    const seconds = meta.duration / 30;
    if (seconds < minMinutes * 60 || seconds > maxMinutes * 60) {
      problems.push(`${where}: duration ${seconds.toFixed(1)}s nằm ngoài REQUEST ${minMinutes}–${maxMinutes} phút`);
    }
  }
  /*
   * Gate chữ chạy cho MỌI video, không chỉ video có `REQUEST.md` ghi khoảng phút ≥3.
   *
   * Video vốn đã bị gate từ trước (REQUEST ghi ≥3 phút) thì chặn. Mọi video khác chỉ CẢNH BÁO:
   * chúng đã render xong rồi, không được chuyển từ đạt sang trượt vì một check mới.
   */
  {
    const graded = requestedRange && requestedRange[0] >= 3;
    const longForm = graded || meta.duration / 30 >= 180;
    for (const m of textGateProblems(CUES, where, { longForm })) (graded ? problems : warnings).push(m);
    // Check mới: video đã render không được chuyển sang trượt chỉ vì cue dài.
    for (const m of longCueProblems(CUES, where)) warnings.push(m);
  }
  // captions
  const caps = cueCaptions(CUES.map((c) => ({ start: c.start, end: c.end, text: c.text, pause: c.pause })));
  let prev = 0;
  for (const c of caps) {
    if ([...c.text].length > 78) problems.push(`${where}: caption ${[...c.text].length} chars: ${c.text}`);
    if (c.start !== prev) problems.push(`${where}: caption gap/overlap at frame ${c.start}`);
    prev = c.end;
  }
  if (prev !== meta.duration) problems.push(`${where}: captions end at ${prev}, video at ${meta.duration}`);
  for (const cue of CUES) {
    const said = caps.filter((c) => c.start >= cue.start && c.end <= cue.end).map((c) => c.text).join(' ');
    if (said !== cue.text.trim().replace(/\s+/g, ' ')) problems.push(`${where}: câu ${cue.n} captions do not match its narration`);
  }
  // quiz flag — read from cues.js, not the timeline: `quiz` / `silent` are authored fields that retiming
  // drops. The quiz bed replaces the background music over every flagged cue, so a flag on a spoken câu
  // means the bed plays over the voice; catch it here, where the scene is still being authored.
  for (const cue of AUTHORED) {
    if (cue.quiz && !cue.silent && String(cue.text || '').trim()) {
      problems.push(`${where}: câu ${cue.n} có lời đọc nhưng đánh dấu quiz: true — cờ này chỉ dành cho khoảng chờ im lặng (xem CLAUDE.md "Nhạc nền và nhạc quiz")`);
    }
  }
  // Platform QA nhận một bộ quiz bằng ba cue liền nhau: câu có tag CÂU HỎI → cue lặng → đáp án.
  // Đây là contract từ qa-manifest trên main; chỉ cảnh báo ở verify vì video cũ không bị hồi tố.
  const quizSets = detectQuestions(AUTHORED.map((c) => ({
    n: c.n,
    text: String(c.text || '').trim(),
    tag: c.tag || null,
    silent: Number(c.silent) || 0,
  })));
  const answered = new Set(quizSets.map((q) => q.q_cue_n));
  for (const cue of AUTHORED) {
    if (cue.tag !== QUIZ_TAG || !String(cue.text || '').trim() || answered.has(cue.n)) continue;
    warnings.push(`${where}: câu ${cue.n} gắn tag "${QUIZ_TAG}" nhưng không thành bộ quiz (cần câu hỏi → câu im lặng → câu đáp án liền nhau) — platform QA sẽ bỏ qua`);
  }
  for (const q of quizSets) {
    if (/^(hết giờ|hết thời gian|xong)[.!…]?$/i.test(q.model_answer.trim())) {
      warnings.push(`${where}: bộ quiz ở câu ${q.q_cue_n} có đáp án mẫu là "${q.model_answer}" — câu ngay sau khoảng chờ phải chữa bài`);
    }
  }
  // smoke render
  const dupSeen = new Set();
  const overlapSeen = new Set();
  const ssrSeen = new Map();
  const emptyCues = [];
  const fingerprints = new Map();
  const frames = new Set();
  for (let f = 0; f < meta.duration; f += 3) frames.add(f);
  for (const cue of CUES) [cue.start, cue.start + 1, cue.end - 1].forEach((f) => frames.add(f));
  let failures = 0;
  const t0 = Date.now();
  for (const f of [...frames].sort((a, b) => a - b)) {
    let html;
    try {
      html = renderAt(f);
    } catch (e) {
      if (failures++ < 5) problems.push(`${where}: frame ${f} throws: ${String(e.message || e).split('\n')[0]}`);
      continue;
    }
    /*
     * KHUNG RỖNG là LỖI, không phải "không có gì để báo" (họ FM-31). Check `khung trống hoàn toàn`
     * ở dưới chỉ chạy tại frame CUỐI mỗi cue; một cảnh chết ở giữa cue thì lọt. Đo ngay ở đây, trên
     * MỌI frame mẫu, gom theo cue để không in 300 dòng cho một chỗ hỏng.
     */
    if (contentElementCount(html) === 0) {
      const key = `câu ${CUES.find((c) => f >= c.start && f < c.end)?.n ?? '?'}: KHUNG RỖNG — cảnh không vẽ ra phần tử nào`;
      if (!overlapSeen.has(key)) { overlapSeen.add(key); problems.push(`${where}: ${key} (frame ${f})`); }
    }
    const bad = html.match(/="[^"]*\b(NaN|undefined|Infinity)\b[^"]*"/);
    if (bad && failures++ < 5) problems.push(`${where}: frame ${f} writes ${bad[1]} into an attribute: ${bad[0].slice(0, 80)}`);
    // Gom theo CÂU, không theo frame: một bố cục sai kéo dài cả cue nên báo từng frame thì 5 dòng
    // đầu đã lấp hết chỗ và mọi cue sai khác bị giấu.
    const cueOf = CUES.find((c) => f >= c.start && f < c.end);
    for (const m of [...overlaps(html), ...textOverflow(html)]) {
      const key = `câu ${cueOf?.n ?? '?'}: ${m}`;
      if (!overlapSeen.has(key)) { overlapSeen.add(key); problems.push(`${where}: ${key}`); }
    }
    /*
     * Bố cục của cảnh dựng bằng <div> + inline style. Mọi gate ở trên chỉ đọc SVG, nên với video
     * kiểu poster (demo: 0 <text> / 659 div có chữ) chúng không nhìn thấy gì — xem `lib/ssr-boxes.mjs`.
     * Gom theo VIDEO chứ không theo cue: cùng một nhãn nhỏ hiện suốt 6 cue là MỘT chỗ phải sửa,
     * không phải 6 dòng cảnh báo.
     */
    for (const b of ssrTextBoxes(html)) if (b.size < MIN_FONT_PX) ssrSeen.set(b.text, b.size);
    const dup = duplicateTitle(html);
    if (dup && !dupSeen.has(dup)) { dupSeen.add(dup); problems.push(`${where}: frame ${f} repeats the cue title inside the slide: "${dup}"`); }
    // Đo ở CUỐI câu, lúc mọi thứ định hiện đã hiện xong — đo giữa câu thì câu nào cũng "trống".
    if (cueOf && f === cueOf.end - 1) {
      const [left, right] = filledHalves(html);
      // Bệnh không phải "ít nội dung" — một câu chốt một dòng chữ giữa khung là hợp lệ. Bệnh là
      // LỆCH: một nửa khung có nội dung, nửa kia bỏ không, thường vì bố cục chừa chỗ cho phần chỉ
      // hiện ở câu SAU. Ngưỡng đọc là: một bên dưới 6%, bên kia trên 22%.
      /*
       * TẮT cho `motion: poster`. "Một nửa khung bỏ không" là bệnh của bố cục dòng SLIDE (lưới hai
       * cột, chừa chỗ cho phần hiện ở câu sau). Dòng poster dựng full-frame và CỐ Ý để một bên
       * trống — carrier đi từ mép này sang mép kia. Ở lượt dựng d05-v06 gate này đá nhau với
       * `data-vk-occupies` (ép dùng `<path>`, mà filledHalves chỉ đếm `<rect>`) và báo oan; mỗi ca
       * tốn 10–30 phút của một lane (F5). Đếm được nhiều loại phần tử hơn vẫn KHÔNG cứu được
       * chuyện này, vì cái sai nằm ở LUẬT chứ không ở phép đo.
       */
      const lean = MOTION === 'poster' ? null
        : left < 0.06 && right > 0.22 ? 'trái' : right < 0.06 && left > 0.22 ? 'phải' : null;
      if (lean) emptyCues.push(`câu ${cueOf.n} (nửa ${lean} bỏ không)`);
      // Cả hai bên đều gần 0% thì filledHalves không "lệch" bên nào nên im lặng — đây mới đúng là
      // trắng thật (thường do thiếu scene/`content(n,f)` trả null). Đếm sự tồn tại thay vì diện
      // tích để không báo giả với cảnh dựng bằng circle/path/image (xem contentElementCount).
      if (left < 0.02 && right < 0.02 && contentElementCount(html) <= 1) {
        problems.push(`${where}: câu ${cueOf.n} khung trống hoàn toàn ở frame ${f} — có thể thiếu scene hoặc content(n,f) trả về null`);
      }
      fingerprints.set(cueOf.n, visualFingerprint(html));
    }
  }
  if (ssrSeen.size) {
    // Mức CẢNH BÁO cho mọi video: check này vừa thêm và
    // ba video kiểu poster chưa ai rà lại bằng ngưỡng của nó. Nâng lên mức chặn là quyết định riêng.
    const list = [...ssrSeen.entries()].sort((a, b) => a[1] - b[1]).map(([t, s]) => `"${t.slice(0, 30)}" ${s}px`);
    warnings.push(`${where}: ${ssrSeen.size} chỗ chữ nhỏ hơn ${MIN_FONT_PX}px (cảnh div/inline-style) — ${list.slice(0, 6).join(', ')}${list.length > 6 ? '…' : ''}`);
  }
  if (emptyCues.length) warnings.push(`${where}: bố cục lệch hẳn một bên ở ${emptyCues.length} câu — ${emptyCues.slice(0, 8).join(', ')}${emptyCues.length > 8 ? '…' : ''}`);
  // FM-20: một sơ đồ/khung hình không đổi (không thêm chi tiết mới) quá 6 cue liên tiếp là dấu hiệu
  // thiếu minh hoạ bổ trợ. Bỏ qua fingerprint rỗng (cue không có shape đáng kể — ví dụ slide toàn
  // chữ — so hai cue "rỗng" với nhau sẽ khớp giả, không phải cùng một diagram đứng yên).
  {
    const staticRuns = [];
    let runStart = null, runLen = 0, prevFp = null;
    for (const cue of CUES) {
      const fp = fingerprints.get(cue.n);
      if (fp && fp === prevFp) { runLen++; if (runStart === null) runStart = cue.n - 1; }
      else { if (runLen >= 6) staticRuns.push(`câu ${runStart}-${cue.n - 1}`); runStart = null; runLen = 1; }
      prevFp = fp || null;
    }
    if (runLen >= 6) staticRuns.push(`câu ${runStart}-${CUES[CUES.length - 1].n}`);
    if (staticRuns.length) warnings.push(`${where}: cùng một bố cục hình khối đứng yên ≥6 cue liên tiếp (FM-20) — ${staticRuns.join(', ')}`);
  }
  videoReports.push(
    `  ${dir.padEnd(28)} ${String(meta.duration).padStart(5)} f · ${CUES.length} cues · ${caps.length} caption pages · ${frames.size} frames rendered in ${Date.now() - t0} ms`,
  );
}

// report
const byGroup = {};
for (const c of cards) byGroup[c.group] = (byGroup[c.group] || 0) + 1;
console.log(`cards: ${cards.length}  ${Object.entries(byGroup).map(([g, n]) => `${g} ${n}`).join(' · ')}`);
console.log(`components: ${files.filter((x) => x.endsWith('.jsx') && rel(x).startsWith('components/')).length} files · scenes: ${scenes.length}`);
for (const s of scenes.sort((a, b) => a.file.localeCompare(b.file))) console.log(`  ${s.id.padEnd(20)} ${String(s.duration).padStart(4)} f · ${s.captions} captions`);
console.log(`videos: ${videoDirs.length}`);
for (const line of videoReports) console.log(line);
console.log(`design system: ${path.relative(ROOT, DS)}`);
for (const w of warnings) console.log(`  ! ${w}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  - ${p}`);
  process.exit(1);
}
console.log('\nall checks passed');
