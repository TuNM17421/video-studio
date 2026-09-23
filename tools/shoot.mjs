#!/usr/bin/env node
/**
 * Headless screenshots for QA, driven over the Chrome DevTools Protocol (one browser, many shots).
 *   node tools/shoot.mjs <url> <out.png> [width=1920] [height=1080]
 *   node tools/shoot.mjs --batch jobs.json          jobs: [{ url, out, width?, height? }]
 * Serve the design-system folder over HTTP first (fonts do not load from file:// URLs):
 *   python3 -m http.server 8765 --directory vinuni-lesson-video-ds
 * Each page is captured after <html data-vk-ready="1"> (fonts loaded, first commit painted).
 * Console errors and uncaught exceptions are printed; exit code is non-zero if anything failed.
 *
 * ẢNH TRẮNG LÀ LỖI, KHÔNG PHẢI ẢNH (họ FM-31 — "không đo được" phải đỏ, không được im lặng xanh).
 * Trước đây lệnh này in `ok`, GHI ảnh, rồi mới in exception ở dòng sau. Một cảnh crash giữa chừng
 * (22/09: `fitSize` được gọi nhưng chưa có trong `hcai.jsx`) vẫn để lại một file PNG 8 KB trắng
 * trơn trông như ảnh thật, và mọi phép đo chạy sau đó đều "xanh" vì không có gì để đo. Từ nay:
 *   1. kiểm TRẠNG THÁI TRANG trước khi chụp — trang ném exception, hoặc `#root` không có phần tử
 *      nào, hoặc toàn khung một màu → KHÔNG chụp, KHÔNG ghi file, in `ĐỎ`, exit ≠ 0;
 *   2. xoá luôn file cũ cùng tên, để không ai nhầm ảnh của lần chạy trước là ảnh của lần này.
 */
import fs from 'node:fs';
import path from 'node:path';
import { launch, sleep, waitReady } from './cdp.mjs';

/**
 * "Khung này có gì không?" — đếm phần tử THẬT SỰ VẼ RA bên trong `#root` (hoặc `body` nếu video
 * không dùng `#root`). React crash giữa chừng thì `#root` còn nguyên nhưng RỖNG, và ảnh ra trắng.
 */
async function pageShape(s) {
  try {
    const r = await s('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const host = document.getElementById('root') || document.body;
        if (!host) return { root: 'body', nodes: 0 };
        const nodes = host.querySelectorAll('svg, canvas, img, video, path, rect, circle, text, div, span').length;
        return { root: host.id ? '#' + host.id : 'body', nodes };
      })()`,
    });
    if (r.exceptionDetails) return { error: r.exceptionDetails.text || 'exception' };
    return r.result.value;
  } catch (e) {
    return { error: e.message };
  }
}

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
      const ready = await waitReady(s, 'true', 100);
      await sleep(job.settle ?? 150);
      const blocked = [];
      if (!ready) blocked.push('trang không báo sẵn sàng (data-vk-ready)');
      const crashed = problems.filter((p) => p.startsWith('exception'));
      if (crashed.length) blocked.push(crashed[0].split('\n')[0]);
      const shape = await pageShape(s);
      if (shape.error) blocked.push(`không đọc được cây DOM: ${shape.error}`);
      else if (shape.nodes === 0) blocked.push(`khung rỗng — ${shape.root} không có phần tử nào vẽ ra`);
      if (blocked.length) {
        failed++;
        // Xoá ảnh cũ: file cũ còn đó thì lần đo sau vẫn "có ảnh để mở" và lỗi này lại chìm.
        fs.rmSync(job.out, { force: true });
        console.log(`ĐỎ  ${path.basename(job.out)} — KHÔNG chụp: ${blocked.join(' · ')}`);
      } else {
        const shot = await s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.mkdirSync(path.dirname(job.out), { recursive: true });
        fs.writeFileSync(job.out, Buffer.from(shot.data, 'base64'));
        console.log(`ok   ${path.basename(job.out)} (${Date.now() - t0} ms · ${shape.nodes} phần tử)`);
      }
    } catch (e) {
      failed++;
      fs.rmSync(job.out, { force: true });
      console.log(`FAIL ${job.out}: ${e.message}`);
    }
    for (const p of problems) console.log(`     ${p.slice(0, 500)}`);
  }
  await b.close();
  return failed;
}

const HELP = `shoot.mjs — chụp frame của design system qua Chrome DevTools Protocol.

  node tools/shoot.mjs <url> <out.png> [width=1920] [height=1080]
  node tools/shoot.mjs --batch <jobs.json>     jobs: [{ url, out, width?, height?, settle? }]
  node tools/shoot.mjs --help

Cần server tĩnh đang chạy (font không nạp được qua file://):
  npm run serve            # python3 -m http.server 8765 --directory vinuni-lesson-video-ds
URL một frame của video:
  http://127.0.0.1:8765/ui_kits/lesson-video/index.html?scene=<video-id>&frame=<n>

Exit 0 = MỌI job đều chụp được. Exit 1 = có job ĐỎ.
ĐỎ nghĩa là KHÔNG ghi file (và xoá file cũ cùng tên): trang ném exception, trang không báo
\`data-vk-ready\`, hoặc \`#root\` không vẽ ra phần tử nào. Ảnh trắng không phải ảnh.`;

const argv = process.argv.slice(2);
if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
  console.log(HELP);
  process.exit(argv.length ? 0 : 2);
}
const jobs =
  argv[0] === '--batch'
    ? JSON.parse(fs.readFileSync(argv[1], 'utf8'))
    : [{ url: argv[0], out: argv[1], width: Number(argv[2] || 1920), height: Number(argv[3] || 1080) }];
const failed = await shootAll(jobs);
process.exit(failed ? 1 : 0);
