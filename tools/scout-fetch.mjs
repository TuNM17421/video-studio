#!/usr/bin/env node
/**
 * Tải lại trang gốc của từng nguồn trong một lượt "đóng gói kịch bản" — không qua agent.
 *
 *   node tools/scout-fetch.mjs scout/<slug> [--force] [--json]
 *
 * Đọc `nguon.json`, tải từng `url`, bóc chữ và ghi vào `sources/goc/<id>.txt`; kết quả từng trang (mã HTTP,
 * loại nội dung, lỗi) vào `sources/goc/index.json`. `tools/scout-verify.mjs` đọc thư mục này để soát trích
 * đoạn với trang thật thay vì với bản agent tự ghi (WebFetch trả về bản đã qua tay một model).
 *
 * Trang đã tải thì bỏ qua, trừ khi `--force`: chạy lại verify không tải lại mạng. Không đọc khoá nào, không
 * gửi gì ngoài một GET tới đúng URL agent đã khai.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pageText } from './lib/page-text.mjs';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
const force = args.includes('--force');
const json = args.includes('--json');

const TIMEOUT_MS = 20000;
const MAX_BYTES = 8 * 1024 * 1024;
const PARALLEL = 4;
/** Dưới ngưỡng này thì trang gần như rỗng — thường là trang dựng bằng JavaScript, chữ thật chưa có trong HTML. */
const MIN_TEXT = 400;

function die(message) {
  if (json) console.log(JSON.stringify({ ok: false, error: message }));
  else console.error(`✗ ${message}`);
  process.exit(1);
}

if (!dir) die('Thiếu thư mục. Ví dụ: node tools/scout-fetch.mjs scout/token-la-gi');
let dossier;
try {
  dossier = JSON.parse(fs.readFileSync(path.join(dir, 'nguon.json'), 'utf8'));
} catch (error) {
  die(`Không đọc được ${path.join(dir, 'nguon.json')}: ${error.message}`);
}

const outDir = path.join(dir, 'sources', 'goc');
fs.mkdirSync(outDir, { recursive: true });
const indexFile = path.join(outDir, 'index.json');
let index = {};
try { index = JSON.parse(fs.readFileSync(indexFile, 'utf8')); } catch {}

/** id nguồn đi vào tên file — chỉ nhận chữ, số, gạch; id lạ thì không ghi ra ngoài thư mục được. */
const safeId = (id) => /^[A-Za-z0-9_-]{1,40}$/.test(String(id)) ? String(id) : null;

async function fetchOne(source) {
  const id = safeId(source.id);
  if (!id) return { id: String(source.id), ok: false, error: 'id nguồn không hợp lệ' };
  const file = path.join(outDir, `${id}.txt`);
  if (!force && index[id]?.ok && fs.existsSync(file)) return { ...index[id], cached: true };
  const url = String(source.url ?? '');
  const base = { id, url, fetchedAt: new Date().toISOString() };
  if (!/^https?:\/\//i.test(url)) return { ...base, ok: false, error: 'không có URL http(s)' };
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Ngôn ngữ phải nói rõ: không có Accept-Language thì trang tài liệu nhiều thứ tiếng tự chọn theo nơi đặt
      // máy — tài liệu Gemini từng trả về bản tiếng Hindi, và mọi trích đoạn tiếng Anh thành "không khớp".
      headers: {
        'user-agent': 'Mozilla/5.0 (VideoStudio scout-fetch; quote check)',
        accept: 'text/html,text/plain;q=0.9,*/*;q=0.5',
        'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
      },
    });
    const type = res.headers.get('content-type') ?? '';
    const info = { ...base, status: res.status, finalUrl: res.url, type };
    if (!res.ok) return { ...info, ok: false, error: `HTTP ${res.status}` };
    if (/pdf/i.test(type)) return { ...info, ok: false, error: 'trang là PDF — chưa đối chiếu được' };
    if (!/html|text\/plain|xml/i.test(type)) return { ...info, ok: false, error: `loại nội dung ${type || 'không rõ'}` };
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) return { ...info, ok: false, error: `trang quá lớn (${(buf.length / 1e6).toFixed(1)} MB)` };
    const raw = buf.toString('utf8');
    const text = /html|xml/i.test(type) ? pageText(raw) : raw;
    fs.writeFileSync(file, text);
    const thin = text.length < MIN_TEXT;
    return { ...info, ok: !thin, chars: text.length, ...(thin ? { error: 'trang gần như không có chữ (có thể dựng bằng JavaScript)' } : {}) };
  } catch (error) {
    const reason = error?.name === 'TimeoutError' ? `quá ${TIMEOUT_MS / 1000} giây không trả lời` : error?.cause?.code ?? error?.message ?? String(error);
    return { ...base, ok: false, error: `không tải được: ${reason}` };
  }
}

const sources = Array.isArray(dossier?.sources) ? dossier.sources : [];
const results = [];
for (let i = 0; i < sources.length; i += PARALLEL) {
  results.push(...(await Promise.all(sources.slice(i, i + PARALLEL).map(fetchOne))));
}
for (const r of results) {
  const { cached, ...stored } = r;
  index[r.id] = stored;
}
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1));

const fetched = results.filter((r) => r.ok).length;
if (json) {
  console.log(JSON.stringify({ ok: true, total: results.length, fetched, results }));
} else {
  for (const r of results) console.log(`${r.ok ? '✓' : '⚠'} ${r.id.padEnd(4)} ${r.ok ? `${r.chars ?? '?'} ký tự${r.cached ? ' (đã có)' : ''}` : r.error} · ${r.url}`);
  console.log(`\n${fetched}/${results.length} trang gốc tải được → ${outDir}`);
}
