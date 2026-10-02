#!/usr/bin/env node
/**
 * Headless screenshots for QA, driven over the Chrome DevTools Protocol (one browser, many shots).
 *   node tools/shoot.mjs <url> <out.png> [width=1920] [height=1080]
 *   node tools/shoot.mjs --batch jobs.json          jobs: [{ url, out, width?, height? }]
 * Serve the design-system folder over HTTP first (fonts do not load from file:// URLs):
 *   python3 -m http.server 8765 --directory vinuni-lesson-video-ds
 * Each page is captured after <html data-vk-ready="1"> (fonts loaded, first commit painted).
 * Console errors and uncaught exceptions are printed; exit code is non-zero if anything failed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, waitReady } from './cdp.mjs';

async function shootAll(jobs) {
  const b = await launch();
  const s = await b.page();
  const { sessionId } = s;
  const problems = [];
  b.listeners.add((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') problems.push(`exception: ${msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text}`);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(msg.params.type)) {
      problems.push(`console.${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') problems.push(`log: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  });
  await s('Log.enable');
  let failed = 0;
  for (const job of jobs) {
    const width = job.width || 1920;
    const height = job.height || 1080;
    problems.length = 0;
    const t0 = Date.now();
    try {
      await s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
      await s('Page.navigate', { url: job.url });
      const ready = await waitReady(s, 'true', 200);

      // A lesson scene declares its own canvas (window.vkFormat). Without this a QA still of a vertical
      // video would come back as a 1920×1080 crop of a 1080×1920 scene — the exact failure #62 measured.
      // An explicit width/height in the job always wins, so component cards are unaffected.
      if (!job.width && !job.height) {
        const fmt = (await s('Runtime.evaluate', { expression: 'window.vkFormat || null', returnByValue: true })).result.value;
        if (fmt && (fmt.width !== width || fmt.height !== height)) {
          await s('Emulation.setDeviceMetricsOverride', { width: fmt.width, height: fmt.height, deviceScaleFactor: 1, mobile: false });
        }
      }

      await sleep(job.settle ?? 150);
      const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.mkdirSync(path.dirname(job.out), { recursive: true });
      fs.writeFileSync(job.out, Buffer.from(shot.data, 'base64'));
      console.log(`${ready ? 'ok  ' : 'NOT-READY'} ${path.basename(job.out)} (${Date.now() - t0} ms)`);
      if (!ready) failed++;
    } catch (e) {
      failed++;
      console.log(`FAIL ${job.out}: ${e.message}`);
    }
    for (const p of problems) console.log(`     ${p.slice(0, 500)}`);
    if (problems.some((p) => p.startsWith('exception'))) failed++;
  }
  await b.close();
  return failed;
}

const argv = process.argv.slice(2);
const jobs =
  argv[0] === '--batch'
    ? JSON.parse(fs.readFileSync(argv[1], 'utf8'))
    // Cỡ để trống = để trang tự khai khổ của nó (window.vkFormat); không điền sẵn 1920×1080 ở đây,
    // nếu không thì nhánh tự dò bên dưới không bao giờ chạy và ảnh QA khổ dọc bị cắt.
    : [{ url: argv[0], out: argv[1], width: argv[2] ? Number(argv[2]) : undefined, height: argv[3] ? Number(argv[3]) : undefined }];
const failed = await shootAll(jobs);
process.exit(failed ? 1 : 0);
