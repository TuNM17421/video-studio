#!/usr/bin/env node
/**
 * Chặng 0 · Nạp slide: tạo một lượt research mới từ file slide của giảng viên.
 *
 *   node tools/research-slide.mjs <slide.pptx|slide.pdf> [--title "Bài 2 · LLM"] [--agent claude] [--cues 20] [--json]
 *
 * Tạo `research/<rid>/` với `input/slide.<ext>`, `input/slide.md` + `input/slides.json` (chữ từng slide: PPTX bóc
 * thẳng, PDF qua PDF.js), `outline.json` (dàn ý code dựng từ chữ đó) và `state.json`, rồi in `rid`. PDF không bóc
 * được chữ (quét ảnh, mã hoá, Node dưới 22) thì chỉ có file gốc — agent đọc thẳng PDF và tự viết dàn ý như trước. Studio gọi đúng lệnh này khi người dùng tải slide lên; agent chạy
 * `/research-script` không qua Studio cũng vậy — nên hai đường tạo ra cùng một thư mục.
 *
 * File hỏng thì báo lỗi và không để lại thư mục nào.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pdfPages } from './lib/pdf-text.mjs';
import { writeJson } from './lib/research-store.mjs';
import { isThin, MAX_SLIDE_BYTES, outlineFromSlides, pdfPageCount, pdfSlides, pptxSlides, slidesMarkdown, stripRepeated } from './lib/slides.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'research');
const AGENTS = ['claude', 'codex', 'antigravity'];

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? '';
};
const file = args.find((a, i) => !a.startsWith('--') && !['--title', '--agent', '--cues', '--name'].includes(args[i - 1]));
const json = args.includes('--json');

function die(message) {
  console.log(json ? JSON.stringify({ ok: false, error: message }) : `✗ ${message}`);
  process.exit(1);
}

/** "Bài 2 · LLM trong lớp học" → "bai-2-llm-trong-lop-hoc" */
function slugify(s) {
  return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50).replace(/-+$/, '') || 'slide';
}

/** yyMMddHHmm theo giờ máy — đủ để hai lượt cùng một slide không trùng thư mục, và đọc được bằng mắt. */
function stamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}`;
}

if (!file || !fs.existsSync(file)) die('Cách dùng: node tools/research-slide.mjs <slide.pptx|slide.pdf> [--title "…"] [--agent claude] [--cues 20]');
const ext = path.extname(file).slice(1).toLowerCase();
if (ext !== 'pdf' && ext !== 'pptx') die('Chỉ nhận slide .pdf hoặc .pptx.');
const bytes = fs.readFileSync(file);
if (bytes.length > MAX_SLIDE_BYTES) die(`Slide lớn quá ${MAX_SLIDE_BYTES / 1024 / 1024} MB.`);

// Đọc và kiểm file trước khi tạo gì trên đĩa.
let parsed = null;
let pages = null;
try {
  if (ext === 'pptx') parsed = pptxSlides(bytes);
  else {
    pages = pdfPageCount(bytes);
    const texts = await pdfPages(bytes);
    if (texts) parsed = pdfSlides(texts);
  }
} catch (error) {
  die(error.message);
}
if (parsed) parsed = stripRepeated(parsed);

const name = flag('--name') || path.basename(file);
const title = (flag('--title') || name.replace(/\.(pdf|pptx)$/i, '')).trim().slice(0, 300);
const agent = flag('--agent') || 'claude';
if (!AGENTS.includes(agent)) die(`--agent chỉ nhận ${AGENTS.join(', ')}.`);
const cues = Math.min(80, Math.max(5, Number(flag('--cues')) || 20));

const base = `${slugify(title)}-${stamp()}`;
let rid = base;
for (let i = 2; fs.existsSync(path.join(ROOT, rid)); i++) rid = `${base}-${i}`;
const dir = path.join(ROOT, rid);
fs.mkdirSync(path.join(dir, 'input'), { recursive: true });
fs.writeFileSync(path.join(dir, 'input', `slide.${ext}`), bytes);
if (parsed) {
  fs.writeFileSync(path.join(dir, 'input', 'slide.md'), slidesMarkdown(title, parsed, ext === 'pdf' ? 'PDF' : 'PPTX'));
  writeJson(path.join(dir, 'input', 'slides.json'), { source: ext, slides: parsed });
  writeJson(path.join(dir, 'outline.json'), outlineFromSlides(title, parsed));
}

const state = {
  version: 1,
  id: rid,
  title,
  createdAt: new Date().toISOString(),
  agent,
  options: { cues },
  deck: {
    name,
    format: ext,
    file: `input/slide.${ext}`,
    text: parsed ? 'input/slide.md' : null,
    // Dàn ý do code dựng — agent bóc tách chỉ ghi claims.json.
    ...(parsed ? { outline: 'code' } : {}),
    slides: parsed ? parsed.length : pages,
    bytes: bytes.length,
    emptySlides: parsed ? parsed.filter((s) => !s.paragraphs.length).map((s) => s.slide) : [],
    ...(parsed && ext === 'pdf' ? { thinSlides: parsed.filter(isThin).map((s) => s.slide) } : {}),
  },
  stage: 'extract',
  status: 'idle',
  error: null,
  gates: {},
  attempts: {},
  runs: [],
};
writeJson(path.join(dir, 'state.json'), state);

if (json) console.log(JSON.stringify({ ok: true, id: rid, dir: `research/${rid}`, deck: state.deck }));
else console.log(`✓ research/${rid} · ${ext.toUpperCase()} · ${state.deck.slides ?? '?'} slide${state.deck.emptySlides.length ? ` · slide chỉ có hình: ${state.deck.emptySlides.join(', ')}` : ''}`);
