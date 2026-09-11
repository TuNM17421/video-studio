/**
 * Minimal Chrome DevTools Protocol client over headless Chrome (shared by shoot.mjs and render.mjs).
 *   const b = await launch();  const s = await b.page(width, height);  await s('Page.navigate', { url });
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CHROME =
  process.env.CHROME ||
  '/home/tunm17421/Coding/Video-studio/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function launch() {
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
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const mid = ++id;
      pending.set(mid, { resolve, reject });
      ws.send(JSON.stringify({ id: mid, method, params, sessionId }));
    });
  /** New tab with a fixed viewport; returns s(method, params) bound to it, plus its sessionId. */
  const page = async (width = 1920, height = 1080) => {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (method, params) => send(method, params, sessionId);
    await s('Page.enable');
    await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    s.sessionId = sessionId;
    return s;
  };
  const close = async () => {
    try {
      await send('Browser.close');
    } catch {
      /* already closing */
    }
    ws.close();
    const exited = proc.exitCode !== null ? Promise.resolve() : new Promise((r) => proc.once('exit', r));
    proc.kill('SIGKILL');
    await Promise.race([exited, sleep(3000)]);
    // Chrome's helpers may still be flushing the profile; cleanup is best-effort.
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* leftover temp profile — harmless */
    }
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
