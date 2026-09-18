import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { pdfPageCount, pptxSlides, slidesMarkdown } from "./slides";

const P = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const para = (...runs: string[]) => `<a:p>${runs.map((r) => `<a:r><a:t>${r}</a:t></a:r>`).join("")}</a:p>`;
const slideXml = (...paras: string[]) => `<p:sld ${P}><p:cSld><p:spTree><p:sp><p:txBody>${paras.join("")}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`;
const relsXml = (entries: [string, string][]) =>
  `<Relationships>${entries.map(([id, target]) => `<Relationship Id="${id}" Type="x" Target="${target}"/>`).join("")}</Relationships>`;

/**
 * Một PPTX tối giản nhưng đúng cấu trúc: hai slide mà thứ tự trình chiếu NGƯỢC với tên file (slide2.xml
 * chiếu trước), và ghi chú của người trình bày gắn qua file .rels — đúng hai chỗ dễ làm sai nhất.
 */
function pptx() {
  return zipSync({
    "ppt/presentation.xml": strToU8(`<p:presentation><p:sldIdLst><p:sldId id="257" r:id="rId3"/><p:sldId id="256" r:id="rId2"/></p:sldIdLst></p:presentation>`),
    "ppt/_rels/presentation.xml.rels": strToU8(relsXml([["rId2", "slides/slide1.xml"], ["rId3", "slides/slide2.xml"]])),
    "ppt/slides/slide1.xml": strToU8(slideXml(para("Học máy"), para("Mô hình ", "học từ", " dữ liệu"))),
    "ppt/slides/slide2.xml": strToU8(slideXml(para("Mở đầu &amp; mục tiêu"), para("Năm 2023 có 100&#xA0;triệu người dùng"))),
    "ppt/slides/_rels/slide2.xml.rels": strToU8(relsXml([["rId1", "../notesSlides/notesSlide1.xml"]])),
    "ppt/notesSlides/notesSlide1.xml": strToU8(slideXml(para("Nhấn mạnh con số này"), para("2"))),
  });
}

describe("bóc chữ PPTX", () => {
  it("theo thứ tự trình chiếu, không theo tên file", () => {
    const slides = pptxSlides(pptx());
    expect(slides.map((s) => s.paragraphs[0])).toEqual(["Mở đầu & mục tiêu", "Học máy"]);
    expect(slides.map((s) => s.slide)).toEqual([1, 2]);
  });

  it("ghép các run của một đoạn và giải mã thực thể XML", () => {
    const [first, second] = pptxSlides(pptx());
    expect(first.paragraphs[1]).toBe("Năm 2023 có 100 triệu người dùng");
    expect(second.paragraphs[1]).toBe("Mô hình học từ dữ liệu");
  });

  it("lấy ghi chú của giảng viên qua .rels, bỏ dòng chỉ có số trang", () => {
    const [first, second] = pptxSlides(pptx());
    expect(first.notes).toEqual(["Nhấn mạnh con số này"]);
    expect(second.notes).toEqual([]);
  });

  it("dựng Markdown mỗi slide một mục", () => {
    const md = slidesMarkdown("Bài 1", pptxSlides(pptx()));
    expect(md).toContain("## Slide 1\n\n- Mở đầu & mục tiêu");
    expect(md).toContain("> Ghi chú của giảng viên: Nhấn mạnh con số này");
  });

  it("báo rõ khi file không phải PPTX", () => {
    expect(() => pptxSlides(strToU8("không phải zip"))).toThrow(/không phải PPTX/);
    expect(() => pptxSlides(zipSync({ "word/document.xml": strToU8("<w/>") }))).toThrow(/presentation\.xml/);
  });
});

describe("đếm trang PDF", () => {
  it("đếm đối tượng /Type /Page, không đếm /Pages", () => {
    const pdf = strToU8("%PDF-1.4\n1 0 obj << /Type /Pages /Count 2 >> endobj\n2 0 obj << /Type /Page >> endobj\n3 0 obj << /Type/Page >> endobj\n%%EOF");
    expect(pdfPageCount(pdf)).toBe(2);
  });

  it("không đếm được thì trả null, không phải 0", () => {
    expect(pdfPageCount(strToU8("%PDF-1.7\n(object streams)\n%%EOF"))).toBeNull();
  });

  it("từ chối file không phải PDF", () => {
    expect(() => pdfPageCount(strToU8("PK"))).toThrow(/không phải PDF/);
  });
});
