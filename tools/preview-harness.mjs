#!/usr/bin/env node
/**
 * Private preview harness for authoring new components in parallel (does NOT touch dist/ or ds-bundle/).
 *
 *   node tools/preview-harness.mjs <preview.tsx> <out.png> [--with <file.jsx> ...] [--width 900]
 *
 * Bundles the preview with 'vinuni-lesson-video-ds' aliased to the DS source (index.js) PLUS any
 * --with modules (new component files not yet exported from components/index.js), renders every
 * PascalCase export as a labeled cell in headless chromium, and writes one full-page PNG.
 * Page errors are printed and make the exit code 1 (a render-time throw would otherwise be a blank cell).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DS = path.join(ROOT, 'vinuni-lesson-video-ds');
const NM = path.join(ROOT, 'node_modules');
const require = createRequire(path.join(NM, 'noop.js'));
const esbuild = require('esbuild');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const [previewArg, outArg] = args;
if (!previewArg || !outArg) {
  console.error('usage: node tools/preview-harness.mjs <preview.tsx> <out.png> [--with file.jsx ...] [--width 900]');
  process.exit(2);
}
const withFiles = [];
let width = 900;
for (let i = 2; i < args.length; i++) {
  if (args[i] === '--with') withFiles.push(path.resolve(args[++i]));
  else if (args[i] === '--width') width = Number(args[++i]);
}
const preview = path.resolve(previewArg);
const out = path.resolve(outArg);
const work = fs.mkdtempSync(path.join(path.dirname(out), '.harness-'));
const entry = path.join(work, 'ds-entry.js');
fs.writeFileSync(
  entry,
  [`export * from ${JSON.stringify(path.join(DS, 'index.js'))};`, ...withFiles.map((f) => `export * from ${JSON.stringify(f)};`)].join('\n'),
);

const wrapper = path.join(work, 'wrapper.jsx');
fs.writeFileSync(
  wrapper,
  `import * as P from ${JSON.stringify(preview)};
import React from 'react';
import { createRoot } from 'react-dom/client';
window.__P = P;
window.__mount = (el, Cmp) => createRoot(el).render(React.createElement(Cmp));
`,
);
const result = await esbuild.build({
  entryPoints: [wrapper],
  bundle: true,
  write: false,
  format: 'iife',
  jsx: 'automatic',
  loader: { '.js': 'jsx', '.jsx': 'jsx', '.tsx': 'tsx' },
  alias: { 'vinuni-lesson-video-ds': entry },
  nodePaths: [NM],
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'error',
});
const js = result.outputFiles[0].text;
const css = ['tokens/colors_and_type.css', 'components/vk.css']
  .map((f) => fs.readFileSync(path.join(DS, f), 'utf8'))
  .join('\n')
  .replaceAll('../fonts/', `file://${path.join(DS, 'fonts')}/`);
const mount = `
  const names = Object.keys(__P).filter((k) => /^[A-Z]/.test(k) && typeof __P[k] === 'function');
  const g = document.getElementById('g');
  for (const n of names) {
    const s = document.createElement('section'); s.className = 'cell';
    s.innerHTML = '<h4>' + n + '</h4><div id="c-' + n + '"></div>'; g.appendChild(s);
    __mount(document.getElementById('c-' + n), __P[n]);
  }
  window.__names = names;`;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}
body{margin:0;padding:20px;background:#fff;font-family:var(--font-sans)}
.cell{border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin-bottom:16px;overflow:hidden}
.cell>h4{margin:0 0 8px;font:600 12px system-ui;color:#6b7280;text-transform:uppercase;letter-spacing:.04em}
</style></head><body><div id="g"></div><script>${js}</script><script>${mount}</script></body></html>`;
const htmlPath = path.join(work, 'index.html');
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 800 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`file://${htmlPath}`);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);
await page.screenshot({ path: out, fullPage: true });
const names = await page.evaluate(() => window.__names || []);
await browser.close();
fs.rmSync(work, { recursive: true, force: true });
console.log(`harness: ${names.length} cell(s) [${names.join(', ')}] → ${path.relative(process.cwd(), out)}`);
if (errors.length) {
  console.error('page errors:\n  ' + errors.join('\n  '));
  process.exit(1);
}
