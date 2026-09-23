/**
 * Soát giọng theo TỪ, không theo phần trăm từng cue.
 *
 * ── Vì sao (retro d05-v06 · F4) ───────────────────────────────────────────────────────────────
 * Thuật ngữ "đòn bẩy" bị OmniVoice đọc hỏng ở NHIỀU cue. `voice-risk` và `align-health` đều chấm
 * theo TỶ LỆ KHỚP CỦA TỪNG CUE, nên mỗi cue chỉ tụt vài phần trăm và không cue nào vượt ngưỡng —
 * cue 104 đạt 92% và suýt lọt. Phải mất **2 lượt Kaggle** mới kết luận được đây là lỗi hệ thống
 * của một TỪ, không phải xui ở một câu.
 *
 * Nhìn theo từ thì kết luận đến ngay sau lượt probe đầu: một cụm hỏng ở ≥2 cue = lỗi hệ thống ⇒
 * ĐỔI LỜI ngay, đừng sinh lại. Sinh lại một từ backend đọc sai thì lượt nào cũng sai.
 */

import { normalizeNumberWords } from './voice-numbers.mjs';

/**
 * Bỏ dấu, thường hoá, VÀ quy số về một dạng.
 *
 * Quy số là bắt buộc: Whisper nghe "tám mươi phần trăm" rồi ghi "80%", nên nếu không quy thì bảng
 * thuật ngữ đầy những "tam muoi", "phan tram" — đúng 6/14 câu khớp yếu mà `align-health` đã chỉ ra
 * là LỆCH ĐỊNH DẠNG chứ không phải đọc sai. Một bảng đầy báo giả thì không ai đọc.
 */
export const norm = (s) => normalizeNumberWords(String(s ?? ''))
  .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/**
 * Từ chức năng tiếng Việt — cụm nào chỉ gồm chúng thì không phải THUẬT NGỮ. Không lọc thì bảng
 * đầy "của các", "là một" và không ai đọc nổi.
 */
const STOP = new Set(('va la co khong cua cho nhung mot hai cai nay do kia thi ma nen vi nhu vao ra len xuong ta ban minh chung toi ho no se dang da duoc bi tren duoi trong ngoai o den tu voi hay hoac cung van con chi moi rat qua nhieu it khi luc noi lam thay biet phai nua the nao sao ai gi day').split(' '));

/** Một "âm tiết" tiếng Việt ≈ một chữ cách nhau bằng khoảng trắng. */
const sylls = (s) => norm(s).split(' ').filter(Boolean);

/**
 * Gom mọi cụm 2–3 âm tiết xuất hiện ở **≥ `minCues` cue khác nhau**. Đây là tập ứng viên
 * "thuật ngữ của bài" — thứ mà một backend đọc sai sẽ sai ở mọi chỗ.
 *
 * @param {{n:number,text:string}[]} cues
 * @returns {{term:string, cues:number[]}[]} xếp theo số cue giảm dần
 */
export function collectTerms(cues, { minCues = 2, minLen = 2, maxLen = 3 } = {}) {
  const seen = new Map(); // term -> Set(cue n)
  for (const c of cues) {
    const w = sylls(c.text);
    for (let len = minLen; len <= maxLen; len++) {
      for (let i = 0; i + len <= w.length; i++) {
        const parts = w.slice(i, i + len);
        // Bỏ cụm toàn từ chức năng, và cụm mở/đóng bằng từ chức năng (nó là mảnh câu, không phải thuật ngữ).
        if (parts.every((p) => STOP.has(p))) continue;
        if (STOP.has(parts[0]) || STOP.has(parts[parts.length - 1])) continue;
        const term = parts.join(' ');
        if (!seen.has(term)) seen.set(term, new Set());
        seen.get(term).add(c.n);
      }
    }
  }
  return [...seen.entries()]
    .filter(([, ns]) => ns.size >= minCues)
    .map(([term, ns]) => ({ term, cues: [...ns].sort((a, b) => a - b) }))
    .sort((a, b) => b.cues.length - a.cues.length || a.term.localeCompare(b.term));
}

/**
 * Với mỗi thuật ngữ: trong những cue CÓ nó ở kịch bản, bao nhiêu cue mà Whisper KHÔNG nghe ra nó.
 * `rows` = `align-report.json` → `rows[]` (`{ n, text, heardText }`).
 *
 * `missedIn.length >= systemic` ⇒ **lỗi hệ thống của TỪ** (không phải của câu) ⇒ đổi lời.
 */
export function termHealth(rows, { minCues = 2, systemic = 2 } = {}) {
  const usable = rows.filter((r) => r && !r.silent && r.text && r.heardText !== undefined);
  const terms = collectTerms(usable, { minCues });
  const heard = new Map(usable.map((r) => [r.n, norm(r.heardText)]));
  const out = [];
  for (const t of terms) {
    const missedIn = t.cues.filter((n) => heard.has(n) && !heard.get(n).includes(t.term));
    if (!missedIn.length) continue;
    out.push({
      term: t.term,
      inCues: t.cues,
      missedIn,
      ratio: missedIn.length / t.cues.length,
      systemic: missedIn.length >= systemic,
    });
  }
  // Lỗi hệ thống lên đầu; trong cùng nhóm thì cụm hỏng nhiều cue hơn đứng trước.
  out.sort((a, b) => Number(b.systemic) - Number(a.systemic) || b.missedIn.length - a.missedIn.length || b.ratio - a.ratio);

  /*
   * GỘP cụm chồng nhau. "xác suất", "theo xác", "theo xác suất" là MỘT phát hiện, không phải ba —
   * chúng hụt ở đúng cùng những cue. Giữ cụm DÀI NHẤT (nó mang nghĩa rõ nhất cho người đọc) và bỏ
   * mọi cụm con có cùng tập cue hụt. Không gộp thì bảng dài gấp ba và người đọc bỏ qua nó.
   */
  const kept = [];
  for (const t of out) {
    const sameCues = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
    const covered = kept.some((k) => (k.term.includes(t.term) || t.term.includes(k.term)) && sameCues(k.missedIn, t.missedIn));
    if (covered) {
      // Giữ bản DÀI hơn: thay tại chỗ nếu cụm mới dài hơn cụm đã giữ.
      const i = kept.findIndex((k) => (k.term.includes(t.term) || t.term.includes(k.term)) && sameCues(k.missedIn, t.missedIn));
      if (t.term.length > kept[i].term.length) kept[i] = t;
      continue;
    }
    kept.push(t);
  }
  // Cụm chỉ còn số sau khi quy đổi (vd "80 phan 100") là lệch ĐỊNH DẠNG, không phải đọc sai.
  return kept.filter((t) => /\p{L}{3}/u.test(t.term.replace(/\b(phan|100|nghin|trieu|ty)\b/g, '')));
}
