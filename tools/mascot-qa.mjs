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
  const jobs = [
    ['emotions', 5], ['actions', 5], ['actions', 16],
  ].map(([set, frame]) => ({ url: `${page}?set=${set}&frame=${frame}`, out: join(out, `${set}-f${frame}.png`), width: 1800, height: 2440 }));
  jobs.push({ url: `http://127.0.0.1:${port}/components/mascot/card.html`, out: join(out, 'card.png'), width: 700, height: 400 });
  jobs.push({ url: `http://127.0.0.1:${port}/ui_kits/lesson-video/demos/mascot-slide-qa.html`, out: join(out, 'slide-size.png'), width: 1200, height: 460 });
  const batch = join(out, 'jobs.json');
  writeFileSync(batch, JSON.stringify(jobs, null, 2));
  run('node', ['tools/shoot.mjs', '--batch', batch]);
  console.log(`LEXCE QA: ${out}`);
} finally { server.kill('SIGTERM'); }
