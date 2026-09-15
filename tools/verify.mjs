#!/usr/bin/env node
/**
 * Static checks for the design system (run after editing):
 *   node tools/verify.mjs
 *  · every @dsCard marker is on line 1 and well-formed (group, viewport WxH, name, subtitle)
 *  · 700-wide foundation/component cards are ≤ 400 px tall
 *  · every components/**\/Name.jsx has Name.d.ts + Name.prompt.md; one card.html per group
 *  · code uses only the 9 palette hex values; no Math.random / Date.now in scenes or components
 *  · scene captions are contiguous from 0 to the scene duration and ≤ 78 characters each
 *  · example videos (ui_kits/lesson-video/videos/<dir>/): required files present, caption pages
 *    ≤ 78 characters covering every cue exactly, and a smoke render of every 3rd frame (plus each cue's
 *    first and last frame) that must not throw or write NaN / undefined into an attribute.
 *    The smoke render needs esbuild + react-dom (same lookup as build.mjs); skipped if absent.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
for (const d of fs.readdirSync(path.join(DS, 'components'), { withFileTypes: true }).filter((x) => x.isDirectory())) {
  const n = fs.readdirSync(path.join(DS, 'components', d.name)).filter((x) => x.endsWith('.html')).length;
  if (n !== 1) (n === 0 ? warnings : problems).push(`components/${d.name} has ${n} card files (want 1)`);
}

// 3 · palette + determinism in code
const PALETTE = new Set(['#ffffff', '#f2f7fc', '#0b2a4d', '#4a4a4a', '#1d6199', '#134d8b', '#c72127', '#ffe0e1', '#e0edf8']);
// Palette = the 9 base colors + whatever lib/tokens.js declares (one place to review new colors).
for (const m of fs.readFileSync(path.join(DS, 'lib/tokens.js'), 'utf8').matchAll(/#[0-9a-fA-F]{6}\b/g)) PALETTE.add(m[0].toLowerCase());
const ARTWORK_COLOR_EXCEPTION = new Set([
  'components/mascot/revampArtwork.js',
  'components/mascot/revampOutline.js',
]);
for (const f of files.filter((x) => /\.(jsx|js)$/.test(x))) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of (ARTWORK_COLOR_EXCEPTION.has(rel(f)) ? [] : src.matchAll(/#[0-9a-fA-F]{6}\b/g))) {
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
const videoReports = [];
for (const dir of videoDirs) {
  const base = path.join(VIDEOS_DIR, dir);
  const where = `videos/${dir}`;
  for (const f of ['video.jsx', 'cues.js', 'card.html', 'player.html', 'STORYBOARD.md']) {
    if (!fs.existsSync(path.join(base, f))) problems.push(`${where} is missing ${f}`);
  }
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
    export { meta, CUES, cueCaptions };
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
  const { meta, CUES, cueCaptions, renderAt } = mod;
  const last = CUES[CUES.length - 1];
  if (meta.duration !== last.end) problems.push(`${where}: meta.duration ${meta.duration} ≠ last cue end ${last.end}`);
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
  // smoke render
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
    const bad = html.match(/="[^"]*\b(NaN|undefined|Infinity)\b[^"]*"/);
    if (bad && failures++ < 5) problems.push(`${where}: frame ${f} writes ${bad[1]} into an attribute: ${bad[0].slice(0, 80)}`);
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
