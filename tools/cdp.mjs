/**
 * Minimal Chrome DevTools Protocol client over headless Chrome (shared by shoot.mjs and render.mjs).
 *   const b = await launch();  const s = await b.page(width, height);  await s('Page.navigate', { url });
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

// $CHROME, else the Chromium that `npm run setup` downloads for playwright, else a system Chrome/Chromium.
function findChrome() {
  if (process.env.CHROME) return process.env.CHROME;
  try {
    const { chromium } = createRequire(import.meta.url)('playwright');
    const bin = chromium.executablePath();
    if (bin && fs.existsSync(bin)) return bin;
  } catch {}
  const system = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ];
  const found = system.find((p) => fs.existsSync(p));
  if (found) return found;
  throw new Error('No Chrome found — run `npm run setup` at the repo root, or set CHROME=/path/to/chrome');
}
export const CHROME = findChrome();

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * A headless Chrome plus a CDP connection to it.
 *
 * `timeout` caps every command: Chrome normally answers a screenshot in milliseconds, but a renderer
 * that dies quietly never answers at all, and an un-capped promise turns that into a hang with no error
 * (tools/render.mjs waited forever on one such tab). A capped one rejects, and the caller can retry
 * somewhere else. Pass 0 to wait indefinitely.
 */
export async function launch({ timeout = 30000 } = {}) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vk-shoot-'));
  const proc = spawn(CHROME, [
    '--headless',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--mute-audio',
    // several capture tabs run at once: never throttle the ones in the background
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ]);
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = '';
    const t = setTimeout(() => reject(new Error('Chrome did not expose DevTools in 20 s')), 20000);
    proc.stderr.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(t);
        resolve(m[1]);
      }
    });
    proc.on('exit', (code) => reject(new Error(`Chrome exited early (${code})`)));
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}, sessionId, timeoutMs = timeout) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      const timer =
        timeoutMs > 0
          ? setTimeout(() => {
              if (pending.delete(mid)) reject(new Error(`${method} không trả lời trong ${(timeoutMs / 1000).toFixed(0)} s`));
            }, timeoutMs)
          : null;
      pending.set(mid, {
        resolve: (v) => {
          clearTimeout(timer);
          resolve(v);
        },
        reject: (e) => {
          clearTimeout(timer);
          reject(e);
        },
      });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });
  /**
   * New tab with a fixed viewport; returns s(method, params, { timeout }) bound to it, plus its
   * sessionId and targetId (the caller needs targetId to close a tab that stopped answering).
   */
  const page = async (width = 1920, height = 1080) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params, opts) => send(method, params, sessionId, opts?.timeout);
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    s.sessionId = sessionId;
    s.targetId = targetId;
    return s;
  };
  /**
   * Kill Chrome and drop its profile, synchronously so it is safe from an 'exit' handler.
   *
   * Without this, a tool that is interrupted (Ctrl-C, the studio cancelling a job, a crash) leaves a
   * headless Chrome behind holding a gigabyte and a temp profile in /tmp — and the next render then
   * competes with the ghost of the last one.
   */
  const reap = () => {
    try {
      proc.kill('SIGKILL');
    } catch {
      /* already gone */
    }
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* leftover temp profile — harmless */
    }
  };
  const onExit = () => reap();
  const onSignal = (signal) => {
    reap();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };
  process.on('exit', onExit);
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
  process.on('SIGHUP', onSignal);

  const close = async () => {
    process.off('exit', onExit);
    process.off('SIGINT', onSignal);
    process.off('SIGTERM', onSignal);
    process.off('SIGHUP', onSignal);
    try {
      await send('Browser.close', {}, undefined, 5000);
    } catch {
      /* already closing, or wedged — SIGKILL below settles it either way */
    }
    ws.close();
    const exited = proc.exitCode !== null ? Promise.resolve() : new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await Promise.race([exited, sleep(3000)]);
    // Chrome's helpers may still be flushing the profile; cleanup is best-effort.
    reap();
  };
  return { send, page, listeners, close };
}

/** Wait until the design-system page has fonts loaded and its first frame painted. */
export async function waitReady(s, extra = 'true', tries = 150) {
  for (let i = 0; i < tries; i++) {
    const r = await s('Runtime.evaluate', {
      expression: `document.readyState === "complete" && document.documentElement.dataset.vkReady === "1" && (${extra})`,
      returnByValue: true,
    });
    if (r.result.value === true) return true;
    await sleep(100);
  }
  return false;
}
