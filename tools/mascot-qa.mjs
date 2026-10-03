#!/usr/bin/env node
/** Build, verify, and capture reproducible LEXCE contact sheets in one command. */
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'reports', 'mascot-qa');
const port = 18765;
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed (${result.status})`);
};
run('node', ['tools/build.mjs']);
if (!process.argv.includes('--quick')) run('node', ['tools/verify.mjs']);
mkdirSync(out, { recursive: true });
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', 'vinuni-lesson-video-ds'], { cwd: root, stdio: 'ignore' });
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    try { const response = await fetch(`http://127.0.0.1:${port}/ui_kits/lesson-video/demos/mascot-qa.html`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!ready) throw new Error('Local preview server did not start');
  const page = `http://127.0.0.1:${port}/ui_kits/lesson-video/demos/mascot-qa.html`;
  // Page height is dynamic (rows = ceil(count/3) * 560 + margins) — keep in sync with
  // mascot-qa.html's own W/H formula, or the batch screenshot clips the last row.
  const rowsFor = (count) => 130 + Math.ceil(count / 3) * 560 + 40;
  const EMOTION_COUNT = 11; // VK.LEXCE_EMOTIONS length
  const ACTION_COUNT = 25; // action `names` array length in mascot-qa.html
  const jobs = [
    ['emotions', 5, EMOTION_COUNT], ['actions', 5, ACTION_COUNT], ['actions', 16, ACTION_COUNT],
  ].map(([set, frame, count]) => ({ url: `${page}?set=${set}&frame=${frame}`, out: join(out, `${set}-f${frame}.png`), width: 1800, height: rowsFor(count) }));
  jobs.push({ url: `http://127.0.0.1:${port}/ui_kits/lesson-video/demos/mascot-lexce-card.html`, out: join(out, 'card.png'), width: 700, height: 400 });
  // slide-size.html: 17 samples, 4 cols -> 5 rows -> H = 61 + 5*373 + 40 = 1966 (keep in sync with the page's own formula).
  jobs.push({ url: `http://127.0.0.1:${port}/ui_kits/lesson-video/demos/mascot-slide-qa.html`, out: join(out, 'slide-size.png'), width: 1200, height: 1966 });
  const batch = join(out, 'jobs.json');
  writeFileSync(batch, JSON.stringify(jobs, null, 2));
  run('node', ['tools/shoot.mjs', '--batch', batch]);
  console.log(`LEXCE QA: ${out}`);
} finally { server.kill('SIGTERM'); }
