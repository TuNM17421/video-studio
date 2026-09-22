import type { Claim, OutlineSlide } from "./research";

/**
 * Cổng 1 đặt mỗi claim cạnh đúng ý slide nó nói tới, và chỉ lên tiếng khi có gì lệch.
 *
 * Nguồn so là dàn ý agent chép từ slide (`outline.json` — chữ trên slide không về tới trình duyệt), nên "khớp" ở
 * đây nghĩa là claim khớp với bản chép đó, không phải với slide thật. Đủ để bắt lỗi hay gặp: claim gắn nhầm slide
 * (c12 ghi slide 39 lẫn 40, câu chỉ có ở 40) hay con số không có trên slide nào nó dẫn.
 */

/** Tỉ lệ từ của claim có trong một ý slide, từ mức này trở lên thì coi là "câu này có trên slide". */
export const NEAR = 0.5;
/** Ý slide ngắn hơn chừng này không tính là "nằm trong claim" — "AI" nằm trong gần như mọi câu. */
export const MIN_CONTAINED_POINT = 12;

export interface SlideAnchor {
  slide: number;
  inOutline: boolean;
  /** Chỉ số ý khớp nhất trong các ý của slide (gộp mọi mục cùng số), `null` nếu không ý nào tới `NEAR`. */
  point: number | null;
  score: number;
  /**
   * Claim có trên slide dù không khớp riêng ý nào: nói đúng tiêu đề ("2024–2026 là bước ngoặt"), hay gộp nhiều ý
   * mà agent chép tách dòng ("Perceptron 1957, Deep Learning 2012" khi dàn ý ghi "1. Perceptron (1957)", "2. Deep …").
   */
  onSlide: boolean;
}

export interface ClaimReview {
  /** Slide đặt thẻ claim: slide dẫn khớp nhất; `null` khi claim không gắn slide nào. */
  home: number | null;
  anchors: SlideAnchor[];
  /** Con số trong claim (viết đúng như claim) không có ở tiêu đề hay ý nào của các slide nó dẫn. */
  missingNumbers: string[];
}

export interface SlideGroup {
  key: string;
  slide: number | null;
  title: string;
  skip: boolean;
  inOutline: boolean;
  points: string[];
  claims: Claim[];
}

const norm = (s: string) => s
  .normalize("NFC")
  .toLowerCase()
  .replace(/[‘’‚‛“”„‟"`´]/g, "'")
  .replace(/\s+/g, " ")
  .trim()
  .replace(/[.;:,]+$/, "");

const words = (s: string) => new Set(norm(s).match(/[\p{L}\p{N}]+(?:[.,]\p{N}+)*/gu) ?? []);

/**
 * Một con số theo giá trị, để cách viết khác nhau không thành "số lạ": "1.000" = "1,000" = "1000" (nhóm nghìn),
 * "3,7" = "3.7", "03" = "3", "5.0" = "5". Nhóm sau dấu đúng 3 chữ số thì là dấu nghìn — trừ khi phần đầu là 0 ("0.750").
 */
function numberValue(raw: string): string {
  const groups = raw.split(/[.,]/);
  const thousands = groups.length > 1 && /^[1-9]\d{0,2}$/.test(groups[0]) && groups.slice(1).every((g) => g.length === 3);
  if (thousands) return groups.join("");
  const [int, ...frac] = groups;
  const whole = int.replace(/^0+(?=\d)/, "");
  const decimals = frac.join("").replace(/0+$/, "");
  return decimals ? `${whole}.${decimals}` : whole;
}

const nums = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((raw) => ({ raw, value: numberValue(raw) }));

/** Claim khớp một ý slide tới đâu: 1 khi câu này chứa câu kia, còn lại là tỉ lệ từ của claim có trong ý đó. */
export function matchScore(text: string, point: string): number {
  const t = norm(text);
  const p = norm(point);
  if (!t || !p) return 0;
  if (p.includes(t)) return 1;
  if (p.length >= MIN_CONTAINED_POINT && t.includes(p)) return 1;
  const tw = words(t);
  const pw = words(p);
  let shared = 0;
  for (const w of tw) if (pw.has(w)) shared++;
  return tw.size ? shared / tw.size : 0;
}

const entriesOf = (outline: OutlineSlide[], n: number) => outline.filter((o) => o.slide === n);

export function reviewClaim(claim: Pick<Claim, "text" | "slides">, outline: OutlineSlide[]): ClaimReview {
  const anchors: SlideAnchor[] = [...new Set(claim.slides)].map((slide) => {
    const entries = entriesOf(outline, slide);
    const points = entries.flatMap((e) => e.points ?? []);
    let best = -1;
    let score = 0;
    points.forEach((p, i) => {
      const s = matchScore(claim.text, p);
      if (s > score) { score = s; best = i; }
    });
    const heading = Math.max(0, ...entries.map((e) => matchScore(claim.text, e.heading ?? "")));
    const whole = matchScore(claim.text, entries.flatMap((e) => [e.heading ?? "", ...(e.points ?? [])]).join(" "));
    return { slide, inOutline: entries.length > 0, point: score >= NEAR ? best : null, score, onSlide: Math.max(heading, whole) >= NEAR };
  });
  // Nhà là slide dẫn khớp nhất — tính cả tiêu đề và cả slide; hoà thì slide ghi trước.
  const rank = (a: SlideAnchor) => Math.max(a.score, a.onSlide ? NEAR : 0);
  let home: SlideAnchor | null = null;
  for (const a of anchors) if (!home || rank(a) > rank(home)) home = a;
  const cited = anchors.filter((a) => a.inOutline).flatMap((a) => entriesOf(outline, a.slide));
  const known = new Set(cited.flatMap((e) => [e.heading ?? "", ...(e.points ?? [])]).flatMap(nums).map((n) => n.value));
  // Số nguyên một chữ số ("1 token", "3 bước") gần như không bao giờ là dữ kiện đang soát — chỉ là nhiễu.
  const missing = cited.length ? nums(claim.text).filter((n) => !/^\d$/.test(n.value) && !known.has(n.value)).map((n) => n.raw) : [];
  return { home: home?.slide ?? null, anchors, missingNumbers: [...new Set(missing)] };
}

/** Thẻ claim gom theo slide nhà, xếp theo số slide; claim không gắn slide nào ở nhóm "Cả bài" cuối cùng. */
export function groupClaims(claims: Claim[], outline: OutlineSlide[], reviews: Map<string, ClaimReview>): SlideGroup[] {
  const groups = new Map<string, SlideGroup>();
  for (const c of claims) {
    const slide = reviews.get(c.id)?.home ?? null;
    const key = slide === null ? "whole" : `s${slide}`;
    let g = groups.get(key);
    if (!g) {
      const entries = slide === null ? [] : entriesOf(outline, slide);
      g = {
        key,
        slide,
        title: [...new Set(entries.map((e) => e.heading?.trim()).filter(Boolean))].join(" / "),
        skip: entries.length > 0 && entries.every((e) => e.skip),
        inOutline: entries.length > 0,
        points: entries.flatMap((e) => e.points ?? []),
        claims: [],
      };
      groups.set(key, g);
    }
    g.claims.push(c);
  }
  return [...groups.values()].sort((a, b) => (a.slide ?? Infinity) - (b.slide ?? Infinity));
}

/** Lựa chọn cho ô "Slide": mọi số trong dàn ý, kèm số claim đang dẫn mà dàn ý không có (để không mất âm thầm). */
export function slideOptions(outline: OutlineSlide[], cited: number[]): { value: number; label: string }[] {
  const numbers = [...new Set([...outline.map((o) => o.slide), ...cited])].sort((a, b) => a - b);
  return numbers.map((n) => {
    const entries = entriesOf(outline, n);
    if (!entries.length) return { value: n, label: `${n} · (không có trong dàn ý)` };
    const title = [...new Set(entries.map((e) => e.heading?.trim()).filter(Boolean))].join(" / ");
    return { value: n, label: title ? `${n} · ${title}` : String(n) };
  });
}
