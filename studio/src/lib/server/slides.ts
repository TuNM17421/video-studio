import { strFromU8, unzipSync } from "fflate";

/**
 * Slide của giảng viên → thứ agent đọc được.
 *
 * PDF để nguyên: công cụ Read của Claude đọc thẳng PDF, cả chữ lẫn hình và sơ đồ, nên bóc chữ ra ở đây
 * chỉ làm mất thông tin. PPTX thì Read không mở được, nên Studio tự bóc chữ và ghi chú của từng slide ra
 * một file Markdown — phần hình trong PPTX không đi theo được, và người dùng được nói rõ điều đó.
 */

export const MAX_SLIDE_BYTES = 50 * 1024 * 1024;

export interface PptxSlide {
  /** Số thứ tự khi trình chiếu, từ 1. */
  slide: number;
  paragraphs: string[];
  /** Ghi chú của người trình bày — thường là chỗ giảng viên viết điều họ định nói. */
  notes: string[];
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, e: string) =>
    e[0] === "#"
      ? String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
      : ENTITIES[e.toLowerCase()]);

/** Mỗi `<a:p>` là một đoạn; chữ của nó nằm rải trong các `<a:t>` (một từ in đậm là một run riêng). */
function paragraphs(xml: string) {
  const out: string[] = [];
  for (const [, body] of xml.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)) {
    const text = [...body.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decode(m[1])).join("").replace(/\s+/g, " ").trim();
    if (text) out.push(text);
  }
  return out;
}

/** `Id` → `Target` của một file .rels. */
function rels(xml: string | undefined) {
  const map = new Map<string, string>();
  if (!xml) return map;
  for (const [tag] of xml.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(tag)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (id && target) map.set(id, target);
  }
  return map;
}

/** `slides/slide7.xml` tương đối với `ppt/` hoặc `ppt/slides/` → đường dẫn đầy đủ trong gói zip. */
function resolve(base: string, target: string) {
  const parts = [...base.split("/").slice(0, -1), ...target.split("/")];
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p && p !== ".") out.push(p);
  }
  return out.join("/");
}

/**
 * Chữ của từng slide, theo thứ tự trình chiếu.
 *
 * Thứ tự lấy từ `presentation.xml` chứ không từ tên file: kéo slide 7 lên đầu trong PowerPoint không đổi
 * tên `slide7.xml`, chỉ đổi danh sách `sldIdLst`. Sắp theo tên file thì bài giảng bị đảo mạch.
 */
export function pptxSlides(bytes: Uint8Array): PptxSlide[] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes, { filter: (f) => f.name.startsWith("ppt/") && /\.(xml|rels)$/.test(f.name) });
  } catch {
    throw new Error("File không phải PPTX hợp lệ (không giải nén được).");
  }
  const read = (name: string) => (files[name] ? strFromU8(files[name]) : undefined);
  const presentation = read("ppt/presentation.xml");
  if (!presentation) throw new Error("File không phải PPTX hợp lệ (thiếu ppt/presentation.xml).");

  const presRels = rels(read("ppt/_rels/presentation.xml.rels"));
  let order = [...presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g)]
    .map((m) => presRels.get(m[1]))
    .filter((t): t is string => Boolean(t))
    .map((t) => resolve("ppt/presentation.xml", t))
    .filter((name) => files[name]);
  if (!order.length) {
    order = Object.keys(files)
      .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)![1]) - Number(/(\d+)\.xml$/.exec(b)![1]));
  }

  return order.map((name, i) => {
    const slideRels = rels(read(name.replace(/slides\/(slide\d+\.xml)$/, "slides/_rels/$1.rels")));
    const notesTarget = [...slideRels.values()].find((t) => /notesSlide\d+\.xml$/.test(t));
    const notesXml = notesTarget ? read(resolve(name, notesTarget)) : undefined;
    return {
      slide: i + 1,
      paragraphs: paragraphs(read(name) ?? ""),
      // Trang ghi chú mang cả số trang như một đoạn chữ riêng; một dòng chỉ có số thì không phải lời giảng.
      notes: notesXml ? paragraphs(notesXml).filter((p) => !/^\d+$/.test(p)) : [],
    };
  });
}

/** Chữ bóc được → `slide.md` cho agent đọc. */
export function slidesMarkdown(name: string, slides: PptxSlide[]) {
  const lines = [`# ${name}`, "", `${slides.length} slide · chữ bóc từ PPTX (hình và sơ đồ không đi theo).`, ""];
  for (const s of slides) {
    lines.push(`## Slide ${s.slide}`, "");
    if (s.paragraphs.length) lines.push(...s.paragraphs.map((p) => `- ${p}`));
    else lines.push("_(slide không có chữ — có thể chỉ có hình)_");
    if (s.notes.length) lines.push("", `> Ghi chú của giảng viên: ${s.notes.join(" ")}`);
    lines.push("");
  }
  return lines.join("\n");
}

/**
 * Số trang của một PDF, đếm các đối tượng `/Type /Page` — không cần thư viện PDF nào.
 *
 * `null` khi không đếm được: PDF từ 1.5 có thể nén các đối tượng trang vào object stream, khi đó chúng không
 * còn nằm trần trong file. Agent vẫn đọc được; nó chỉ không biết trước phải đọc bao nhiêu đợt.
 */
export function pdfPageCount(bytes: Uint8Array): number | null {
  const head = strFromU8(bytes.subarray(0, 5), true);
  if (head !== "%PDF-") throw new Error("File không phải PDF hợp lệ.");
  const body = strFromU8(bytes, true);
  const count = (body.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
  return count > 0 ? count : null;
}
