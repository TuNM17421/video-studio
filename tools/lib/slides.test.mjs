/** npm run test:tools — bóc chữ PPTX, chữ từng trang PDF, và dàn ý code dựng từ đó. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { pdfPages } from './pdf-text.mjs';
import { isThin, outlineFromSlides, pdfPageCount, pdfSlides, pptxSlides, slidesMarkdown, stripRepeated, unzip } from './slides.mjs';

/** Zip tối giản để thử: mỗi file nén deflate (như PowerPoint), hoặc để nguyên nếu `stored`. */
function zip(entries, { stored = false } = {}) {
  const locals = [];
  const central = [];
  let offset = 0;
  for (const [name, text] of Object.entries(entries)) {
    const raw = Buffer.from(text, 'utf8');
    const data = stored ? raw : deflateRawSync(raw);
    const nameBuf = Buffer.from(name, 'utf8');
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(stored ? 0 : 8, 8);
    local.writeUInt32LE(crc32(raw), 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    locals.push(local, nameBuf, data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(stored ? 0 : 8, 10);
    cd.writeUInt32LE(crc32(raw), 16);
    cd.writeUInt32LE(data.length, 20);
    cd.writeUInt32LE(raw.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(entries).length, 8);
  end.writeUInt16LE(Object.keys(entries).length, 10);
  end.writeUInt32LE(cdBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...locals, cdBuf, end]));
}

const P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const para = (...runs) => `<a:p>${runs.map((r) => `<a:r><a:t>${r}</a:t></a:r>`).join('')}</a:p>`;
const slideXml = (...paras) => `<p:sld ${P}><p:cSld><p:spTree><p:sp><p:txBody>${paras.join('')}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const relsXml = (entries) => `<Relationships>${entries.map(([id, target]) => `<Relationship Id="${id}" Type="x" Target="${target}"/>`).join('')}</Relationships>`;

/**
 * PPTX tối giản nhưng đúng cấu trúc: hai slide mà thứ tự trình chiếu NGƯỢC với tên file (slide2.xml chiếu
 * trước), và ghi chú của người trình bày gắn qua file .rels — đúng hai chỗ dễ làm sai nhất.
 */
const pptx = (opts) => zip({
  'ppt/presentation.xml': '<p:presentation><p:sldIdLst><p:sldId id="257" r:id="rId3"/><p:sldId id="256" r:id="rId2"/></p:sldIdLst></p:presentation>',
  'ppt/_rels/presentation.xml.rels': relsXml([['rId2', 'slides/slide1.xml'], ['rId3', 'slides/slide2.xml']]),
  'ppt/slides/slide1.xml': slideXml(para('Học máy'), para('Mô hình ', 'học từ', ' dữ liệu')),
  'ppt/slides/slide2.xml': slideXml(para('Mở đầu &amp; mục tiêu'), para('Năm 2023 có 100&#xA0;triệu người dùng')),
  'ppt/slides/_rels/slide2.xml.rels': relsXml([['rId1', '../notesSlides/notesSlide1.xml']]),
  'ppt/notesSlides/notesSlide1.xml': slideXml(para('Nhấn mạnh con số này'), para('2')),
}, opts);

test('giải nén được cả file nén deflate lẫn file để nguyên', () => {
  assert.equal(unzip(zip({ 'a.txt': 'xin chào' })).get('a.txt')().toString('utf8'), 'xin chào');
  assert.equal(unzip(zip({ 'a.txt': 'xin chào' }, { stored: true })).get('a.txt')().toString('utf8'), 'xin chào');
});

test('slide theo thứ tự trình chiếu, không theo tên file', () => {
  const slides = pptxSlides(pptx());
  assert.deepEqual(slides.map((s) => s.paragraphs[0]), ['Mở đầu & mục tiêu', 'Học máy']);
  assert.deepEqual(slides.map((s) => s.slide), [1, 2]);
});

test('ghép các run của một đoạn, giải mã thực thể XML, lấy ghi chú qua .rels', () => {
  const [first, second] = pptxSlides(pptx({ stored: true }));
  // &#xA0; (dấu cách không ngắt) gộp thành dấu cách thường như mọi khoảng trắng khác
  assert.equal(first.paragraphs[1], 'Năm 2023 có 100 triệu người dùng');
  assert.equal(second.paragraphs[1], 'Mô hình học từ dữ liệu');
  assert.deepEqual(first.notes, ['Nhấn mạnh con số này']);
  assert.deepEqual(second.notes, []);
});

test('dựng Markdown mỗi slide một mục', () => {
  const md = slidesMarkdown('Bài 1', pptxSlides(pptx()));
  assert.ok(md.includes('## Slide 1\n\n- Mở đầu & mục tiêu'));
  assert.ok(md.includes('> Ghi chú của giảng viên: Nhấn mạnh con số này'));
});

test('báo rõ khi file không phải PPTX', () => {
  assert.throws(() => pptxSlides(new TextEncoder().encode('không phải zip')), /không phải PPTX/);
  assert.throws(() => pptxSlides(zip({ 'word/document.xml': '<w/>' })), /presentation\.xml/);
});

test('đếm trang PDF: /Type /Page, không đếm /Pages; không đếm được thì null; file lạ thì báo', () => {
  const enc = (s) => new TextEncoder().encode(s);
  assert.equal(pdfPageCount(enc('%PDF-1.4\n1 0 obj << /Type /Pages /Count 2 >> endobj\n2 0 obj << /Type /Page >> endobj\n3 0 obj << /Type/Page >> endobj\n%%EOF')), 2);
  assert.equal(pdfPageCount(enc('%PDF-1.7\n(object streams)\n%%EOF')), null);
  assert.throws(() => pdfPageCount(enc('PK')), /không phải PDF/);
});

// ── PDF: chữ từng trang (PDF.js) và dàn ý do code dựng ─────────────────────────────

/** PDF tối giản, mỗi trang vài dòng chữ Helvetica — đủ để PDF.js đọc như một file slide xuất từ PowerPoint. */
function makePdf(pages) {
  const body = [];
  const pageIds = pages.map((_, k) => 4 + k * 2);
  body[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  body[2] = `<< /Type /Pages /Kids [${pageIds.map((i) => `${i} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  body[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((lines, k) => {
    const stream = `BT /F1 18 Tf 50 750 Td ${lines.map((l, j) => `${j ? '0 -30 Td ' : ''}(${l}) Tj`).join(' ')} ET`;
    body[pageIds[k]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageIds[k] + 1} 0 R >>`;
    body[pageIds[k] + 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  let out = '%PDF-1.4\n';
  const offsets = [];
  for (let i = 1; i < body.length; i++) {
    offsets[i] = out.length;
    out += `${i} 0 obj\n${body[i]}\nendobj\n`;
  }
  const xref = out.length;
  out += `xref\n0 ${body.length}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${body.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

const FOOTER = (n) => `Lecturer VinUni AICB Day 1 02/04/2026 ${n} / 5`;
const DECK = [
  ['AI and LLM Foundation', 'Course AICB Phase 1 Week 1', FOOTER(1)],
  ['?', 'Think about how the assistant works every day', FOOTER(2)],
  ['API Pricing Model', 'Price per one million tokens for input and output', 'Output tokens cost three to five times more', FOOTER(3)],
  ['Transformer attention diagram', FOOTER(4)],
  ['Thank you', 'Email: lecturer@vinuni.edu.vn', FOOTER(5)],
];

test('PDF: chữ từng trang qua PDF.js; file không phải PDF thì null', async () => {
  const pages = await pdfPages(makePdf(DECK));
  assert.equal(pages.length, 5);
  assert.match(pages[2], /API Pricing Model/);
  assert.match(pages[2], /three to five times/);
  assert.equal(await pdfPages(Buffer.from('không phải PDF')), null);
});

test('dàn ý do code dựng: bỏ chân trang lặp lại, tiêu đề là dòng có chữ, tự bỏ qua trang cảm ơn', async () => {
  const slides = stripRepeated(pdfSlides(await pdfPages(makePdf(DECK))));
  // Chân trang đổi số trang từng trang nhưng vẫn là một dòng lặp lại — bỏ.
  assert.ok(slides.every((s) => !s.paragraphs.some((p) => /Lecturer VinUni/.test(p))), JSON.stringify(slides));
  const outline = outlineFromSlides('Bài 1', slides, [1]);
  assert.equal(outline.pages, 5);
  assert.deepEqual(outline.outline.map((o) => o.slide), [1, 2, 3, 4, 5]);
  assert.equal(outline.outline[1].heading, 'Think about how the assistant works every day');
  assert.equal(outline.outline[2].heading, 'API Pricing Model');
  assert.deepEqual(outline.outline.filter((o) => o.skip).map((o) => o.slide), [1, 5]);
  assert.equal(isThin(slides[3]), true, 'trang chỉ có tiêu đề hình vẽ là trang ít chữ');
  const md = slidesMarkdown('Bài 1', slides, 'PDF');
  assert.ok(md.includes('Read trang 4 của input/slide.pdf'));
});

test('tiêu đề đánh số ("Bước 1", "Bước 2") và tiêu đề lặp ở ít trang không bị coi là chân trang', () => {
  const slides = Array.from({ length: 10 }, (_, i) => ({
    slide: i + 1,
    paragraphs: [i < 2 ? 'Token Economy' : `Bước ${i}`, `Giảng viên VinUni · Ngày 1 · trang ${i + 1} / 10`, `${i + 1} / 10`],
    notes: [],
  }));
  const out = stripRepeated(slides);
  assert.equal(out[0].paragraphs[0], 'Token Economy');
  assert.equal(out[5].paragraphs[0], 'Bước 5');
  assert.ok(out.every((s) => s.paragraphs.length === 1), JSON.stringify(out));
});
