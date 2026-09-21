#!/usr/bin/env node
/**
 * Run a deterministic command (build/verify/render/shoot) with the same ledger logging Video Studio's
 * own server code writes for a member working through the web — so someone driving a coding-agent CLI
 * directly (no Studio) still gets that stage's time and outcome in `projects/<id>/.studio/runs.jsonl`.
 *
 * Unlike `video-workflow.mjs run start/finish`, this never leaves a run stuck "running": start and
 * finish happen around the same spawned process, from the same script invocation, so a crash of the
 * wrapped command still reaches `finishRun` (the exit code decides done/error) — nothing to forget.
 *
 *   node tools/run-logged.mjs <stage> --video <id> [--actor cli] -- <command> [args...]
 *   node tools/run-logged.mjs build   --video n5-03 -- npm run build
 *   node tools/run-logged.mjs verify  --video n5-03 -- npm run verify
 *   node tools/run-logged.mjs render  --video n5-03 -- node tools/render.mjs --scene n5-03 --audio voice/out/n5-03/voice.wav --out projects/n5-03/render/n5-03.mp4
 *
 * Exit code is exactly the wrapped command's — safe to chain with `&&` as a drop-in replacement.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishRun, startRun } from './workflow-ledger.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fail = (message) => { console.error(`✗ ${message}`); process.exit(2); };

const argv = process.argv.slice(2);
const sep = argv.indexOf('--');
if (sep === -1) fail('usage: node tools/run-logged.mjs <stage> --video <id> [--actor cli] -- <command> [args...]');
const head = argv.slice(0, sep);
const cmd = argv.slice(sep + 1);
if (!cmd.length) fail('thiếu lệnh cần chạy sau `--`');

const stage = head[0];
if (!stage || stage.startsWith('--')) fail('thiếu <stage> (vd. build, verify, render, shoot)');
const flag = (name, fallback) => {
  const i = head.indexOf(`--${name}`);
  return i >= 0 ? head[i + 1] : fallback;
};
const videoId = flag('video');
if (!videoId) fail('thiếu --video <id>');

const machine = (process.env.STUDIO_MACHINE_LABEL || os.hostname() || 'unknown').trim();
const run = startRun(REPO, videoId, {
  stage,
  actor: flag('actor', 'cli'),
  mode: 'deterministic',
  label: cmd.join(' '),
  machine,
});

// On Windows `npm` is a .cmd shim, only runnable through a shell — same rule Studio's own runner (jobs.ts) uses.
const needsShell = process.platform === 'win32' && cmd[0] === 'npm';
const child = spawn(cmd[0], cmd.slice(1), { cwd: REPO, stdio: 'inherit', shell: needsShell });
child.on('error', (error) => {
  finishRun(REPO, videoId, run.runId, { status: 'error', error: error.message });
  fail(`không chạy được lệnh: ${error.message}`);
});
child.on('close', (code) => {
  finishRun(REPO, videoId, run.runId, { status: code === 0 ? 'done' : 'error', error: code === 0 ? null : `exit ${code}` });
  process.exit(code ?? 1);
});
