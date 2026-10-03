#!/usr/bin/env node
/**
 * Render mask trắng-đen của từng vùng rig ra PNG 1122×1402 (1:1 với viewBox của artwork), kèm
 * polys.json, để `trace.py` dò biên. Xem README.md cạnh file này.
 *   node tools/mascot-outline/render-masks.mjs [outDir]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const DS = path.join(ROOT, 'vinuni-lesson-video-ds');
const out = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'lexce-')));
fs.mkdirSync(out, { recursive: true });

const page = `<!doctype html><html><head><meta charset="utf-8">
<style>html,body{margin:0;width:1122px;height:1402px;background:#000}svg{display:block}</style></head><body>
<div id="root"></div><script type="module">
import { REVAMP_PATHS } from './components/mascot/revampArtwork.js';
import { buildRegions, RIG_POLYS, polyToPath } from './components/mascot/revampRig.js';
const R = buildRegions(REVAMP_PATHS);
const q = new URLSearchParams(location.search);
const name = q.get('region');
const clipped = q.get('clip') !== '0';
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
svg.setAttribute('viewBox', '0 0 1122 1402'); svg.setAttribute('width', 1122); svg.setAttribute('height', 1402);
const shapes = R[name].map(i => { const [d,,tr] = REVAMP_PATHS[i]; return '<path d="' + d + '" fill="#fff" transform="' + tr + '"/>'; }).join('');
svg.innerHTML = clipped
  ? '<defs><clipPath id="c" clipPathUnits="userSpaceOnUse"><path d="' + polyToPath(RIG_POLYS[name]) + '"/></clipPath></defs><g clip-path="url(#c)">' + shapes + '</g>'
  : '<g>' + shapes + '</g>';
document.getElementById('root').appendChild(svg);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.setAttribute('data-vk-ready','1')));
</script></body></html>`;
const tmpPage = path.join(DS, '_mascot-outline-mask.html');
fs.writeFileSync(tmpPage, page);
try {
  // Hai mask cho mỗi vùng: bản ĐÃ clip (hình thật vẽ ra) và bản CHƯA clip (artwork còn nguyên).
  // Chỗ nào bản chưa clip còn nét mà bản đã clip đã cụt, chỗ đó là MÉP CẮT của rig → không vẽ viền.
  for (const region of ['head', 'armL', 'armR']) {
    for (const [suffix, clip] of [['', '1'], ['-full', '0']]) {
      execFileSync('node', [path.join(ROOT, 'tools/shoot.mjs'),
        `http://127.0.0.1:8765/_mascot-outline-mask.html?region=${region}&clip=${clip}`,
        path.join(out, `msk-${region}${suffix}.png`), '1122', '1402'], { stdio: 'inherit' });
    }
  }
} finally {
  fs.unlinkSync(tmpPage);
}
const rig = await import(path.join(DS, 'components/mascot/revampRig.js'));
fs.writeFileSync(path.join(out, 'polys.json'), JSON.stringify(rig.RIG_POLYS));
fs.writeFileSync(path.join(out, 'seams.json'), JSON.stringify(rig.RIG_SEAMS));
console.log(`✓ ${out} · msk-head/armL/armR.png + polys.json`);
console.log(`  tiếp: python3 tools/mascot-outline/trace.py ${out}`);
