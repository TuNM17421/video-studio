#!/usr/bin/env node
/**
 * Soát giao diện trang Đóng gói kịch bản bằng Playwright — chạy khi Studio đang mở (`npm run studio`).
 *
 *   node studio/scripts/research-ui-check.mjs [--rid <lượt ở cổng 3 hoặc đã xong>] [--base http://127.0.0.1:3100]
 *
 * Không chứa dữ liệu research nào: đọc một lượt có thật trên máy (chỉ GET), cắt nó ra thành các trạng thái (chưa chọn
 * lượt, đang tra nguồn, cổng 1, cổng 2, cổng 3, xong, lỗi, dừng, lượt mẫu), rồi cho trang xem từng bản đó. Mọi yêu cầu không
 * phải GET đều bị chặn — script không bao giờ duyệt, chạy hay tốn lượt agent nào.
 *
 * Ghi báo cáo JSON và ảnh chụp vào thư mục tạm của máy; mã thoát khác 0 khi có kiểm tra trượt.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = await import(new URL(`file:///${path.join(ROOT, 'node_modules', 'playwright', 'index.mjs').replace(/\\/g, '/')}`).href);
const { CHROME } = await import(new URL(`file:///${path.join(ROOT, 'tools', 'cdp.mjs').replace(/\\/g, '/')}`).href);

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(name);
  return i === -1 ? fallback : args[i + 1];
};
const BASE = flag('--base', 'http://127.0.0.1:3100');
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'research-ui-'));

const index = await (await fetch(`${BASE}/api/research`)).json();
const rid = flag('--rid', index.runs.find((r) => r.stage === 'gate3' || r.stage === 'done')?.id);
if (!rid) {
  console.log('✗ Không có lượt nào ở cổng 3 hoặc đã xong — chạy một lượt tới cổng 3 trước, hoặc truyền --rid.');
  process.exit(2);
}
const base = await (await fetch(`${BASE}/api/research/${encodeURIComponent(rid)}`)).json();

/** Một trạng thái cắt ra từ lượt thật. */
function mk(stage, status, patch = {}) {
  const { state = {}, ...rest } = patch;
  return { ...base, job: null, ...rest, state: { ...base.state, stage, status, error: null, ...state } };
}
const before = { script: null, scriptCheck: null, edit: null };
const started = Date.now() - 65_000;
const firstTwo = base.claims.slice(0, 2).map((c) => c.id);
const STATES = {
  gate3: mk('gate3', 'waiting'),
  done: mk('done', 'done', { state: { gates: { ...base.state.gates, gate3: { at: base.state.createdAt } } } }),
  research: mk('research', 'running', {
    ...before,
    job: { key: `research:${rid}`, kind: 'research', status: 'running', startedAt: started },
    evidence: {},
    findings: {},
    state: { gates: { gate1: base.state.gates.gate1 }, runs: [...base.state.runs.filter((r) => r.step === 'extract'), { n: 99, step: 'research', claims: firstTwo, agent: base.state.agent, startedAt: new Date(started).toISOString() }] },
  }),
  // Cổng 2: bỏ quyết định đã có để những điều chưa đủ căn cứ (không đủ nguồn, cảnh báo nặng) lại chờ.
  gate2: mk('gate2', 'waiting', { ...before, state: { gates: { gate1: base.state.gates.gate1 } } }),
  gate1: mk('gate1', 'waiting', { ...before, evidence: {}, findings: {}, state: { gates: {}, runs: base.state.runs.filter((r) => r.step === 'extract') } }),
  failed: mk('research', 'failed', { ...before, state: { error: 'Claude Code chưa đăng nhập — chạy `claude` một lần trong terminal để đăng nhập.' } }),
  stopped: mk('write', 'failed', { ...before, state: { error: 'Đã dừng.' } }),
  sample: mk('done', 'done', { state: { sample: true } }),
};

const report = [];
const fail = (state, width, message) => report.push({ state, width, ok: false, message });
const browser = await chromium.launch({ executablePath: CHROME });

async function open(state, width, height, theme) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  await ctx.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
      for (const id of ['welcome', 'research', 'practice']) localStorage.setItem(`video-studio.tour.${id}`, '99');
    } catch {}
  }, theme);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.route('**/*', (route) => {
    const req = route.request();
    if (req.method() !== 'GET') return route.abort();
    const url = new URL(req.url());
    if (state !== 'none' && url.pathname === `/api/research/${rid}`) return route.fulfill({ json: STATES[state] });
    if (url.pathname === `/api/research/${rid}/events`) return route.fulfill({ status: 200, headers: { 'content-type': 'text/event-stream' }, body: '' });
    return route.continue();
  });
  await page.goto(state === 'none' ? `${BASE}/research` : `${BASE}/research?id=${encodeURIComponent(rid)}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.vs-rs-strip', { timeout: 30_000 });
  await page.waitForTimeout(1500);
  return { page, ctx, errors };
}

async function check(state, width, height, theme) {
  const { page, ctx, errors } = await open(state, width, height, theme);
  const m = await page.evaluate(() => {
    const visible = (el) => el.offsetParent && !el.closest('.ant-drawer, .ant-popover, .ant-modal, [hidden]');
    const primaries = [...document.querySelectorAll('.ant-btn-primary')].filter((b) => visible(b) && !b.disabled).map((b) => b.textContent.trim());
    const strip = document.querySelector('.vs-rs-strip');
    const fonts = [...(strip?.querySelectorAll('*') ?? [])].filter((e) => e.childNodes.length && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()))
      .map((e) => parseFloat(getComputedStyle(e).fontSize));
    // Chỉ phần khung — nội dung bài giảng có thể nói về token hay cache (bài về LLM thì chắc chắn có).
    const firstScreen = [...document.querySelectorAll('.vs-rs-head, .vs-rs-strip, .vs-rs-work-head, .vs-rs-decide')].map((e) => e.innerText).join(' ');
    return {
      primaries,
      tabs: document.querySelectorAll('.ant-tabs').length,
      nodes: document.querySelectorAll('.vs-rs-node, .vs-rs-gate').length,
      strip: strip ? strip.getBoundingClientRect().height : 0,
      minFont: fonts.length ? Math.min(...fonts) : 0,
      head: document.querySelector('.vs-rs-head')?.getBoundingClientRect().height ?? 0,
      old: ['.eyebrow', '.vs-scout-beta', '.vs-rs-lede', '.vs-rs-track'].filter((s) => document.querySelector(s)),
      words: ['token', 'cache', 'node tools', 'research/'].filter((w) => firstScreen.includes(w)),
      overflow: document.documentElement.scrollWidth > innerWidth,
      firstSent: document.querySelector('.vs-rs-sent')?.getBoundingClientRect().top ?? null,
      live: document.querySelector('[aria-live]')?.textContent ?? null,
      white: [...document.querySelectorAll('[class*="vs-rs-"]')].filter((e) => getComputedStyle(e).backgroundColor === 'rgb(255, 255, 255)').length,
    };
  });
  const running = state === 'research';
  const expected = running || state === 'sample' ? 0 : 1;
  if (m.primaries.length !== expected) fail(state, width, `có ${m.primaries.length} nút chính (${m.primaries.join(' | ')}), cần ${expected}`);
  if (m.tabs) fail(state, width, 'còn .ant-tabs');
  if (m.nodes !== 7) fail(state, width, `dải sơ đồ có ${m.nodes} ô, cần 7`);
  if (width >= 852 && Math.abs(m.strip - 112) > 2) fail(state, width, `dải sơ đồ cao ${m.strip}px`);
  if (m.minFont && m.minFont < 12) fail(state, width, `chữ nhỏ nhất trong dải sơ đồ ${m.minFont}px`);
  if (width >= 1024 && m.head > 57) fail(state, width, `đầu trang cao ${m.head}px`);
  if (m.old.length) fail(state, width, `còn lớp cũ ${m.old.join(', ')}`);
  if (m.words.length) fail(state, width, `màn đầu có chữ kỹ thuật: ${m.words.join(', ')}`);
  if (m.overflow) fail(state, width, 'trang cuộn ngang');
  if (state === 'gate3' && width === 1600 && (m.firstSent ?? 999) > 300) fail(state, width, `câu đầu ở y=${m.firstSent}`);
  if (theme === 'dark' && m.white) fail(state, width, `${m.white} phần tử vs-rs- nền trắng ở chế độ tối`);
  if (running) {
    await page.waitForTimeout(2500);
    const again = await page.evaluate(() => document.querySelector('[aria-live]')?.textContent ?? null);
    if (again !== m.live) fail(state, width, 'aria-live đổi theo đồng hồ');
  }
  if (errors.length) fail(state, width, `lỗi trang: ${errors[0].slice(0, 200)}`);
  await page.screenshot({ path: path.join(OUT, `${state}-${width}-${theme}.png`) });
  report.push({ state, width, theme, ok: true, ...m });
  await ctx.close();
}

for (const [w, h] of [[1600, 1000], [1366, 768], [390, 844]]) {
  for (const state of ['none', ...Object.keys(STATES)]) await check(state, w, h, 'light');
}
for (const state of ['gate3', 'research']) await check(state, 1600, 1000, 'dark');
await browser.close();

const failures = report.filter((r) => r.ok === false);
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(failures.length
  ? `✗ ${failures.length} kiểm tra trượt:\n${failures.map((f) => `  ${f.state} @${f.width}: ${f.message}`).join('\n')}`
  : `✓ ${report.length} lượt xem đạt`);
console.log(`Ảnh và báo cáo: ${OUT}`);
process.exit(failures.length ? 1 : 0);
