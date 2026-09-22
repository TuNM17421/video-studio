/** npm run test:tools — bóc chữ PPTX và đếm trang PDF bằng Node thuần. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, deflateRawSync } from 'node:zlib';
import { pdfPageCount, pptxSlides, slidesMarkdown, unzip } from './slides.mjs';

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
