/**
 * Burned-in subtitle pages from narration cues — port of createSubtitleCaptions / splitIntoPages
 * in the source repo (src/videos/Day05/rebuild-v1/SubtitleTrack.tsx).
 *
 *   paginate(text)        → balanced pages of ≤ 78 characters that end at a phrase boundary: after
 *                           punctuation, or before a word that opens a clause (và, hoặc, để, khi…)
 *   cueCaptions(cues)     → [{ start, end, text }] in frames; the pages of each cue share the cue's
 *                           speech window by length, the last page holds through the trailing pause
 *   sliceCaptions(c, s, d)→ the captions of one scene, shifted to scene-local frames
 *
 * Addition over the repo version (length balance + punctuation only): Vietnamese writes every syllable
 * as a word, so a plain length balance splits compounds ("quan / sát", "đạt yêu / cầu").
 */
export const CAPTION_MAX = 78;

const PUNCTUATION_END = /[,;:!?–—.…]$/;
const chars = (s) => [...s].length;
const bare = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

/** Words that open a clause or phrase — a page may end right before them. */
const OPENERS = new Set([
  'và', 'hoặc', 'hay', 'rồi', 'nhưng', 'mà', 'để', 'khi', 'nếu', 'thì', 'dù', 'rằng', 'như', 'dựa',
  'trước', 'cho', 'với', 'trong', 'bằng', 'từ', 'vì', 'của', 'theo', 'nhờ', 'là',
]);
/** Words that lean on the next one — a page must not end right after them. */
const LEANERS = new Set([
  'sẽ', 'đã', 'đang', 'được', 'bị', 'cần', 'những', 'các', 'một', 'mỗi', 'hai', 'ba', 'bốn', 'năm',
  'sáu', 'rất', 'không', 'chưa', 'hãy', 'nên', 'phải', 'cách', 'việc', 'người', 'bài', 'đằng', 'thật',
]);

/** Cost of ending a page between words[i] and words[i + 1] (negative = a good place). */
function breakCost(words, i) {
  if (PUNCTUATION_END.test(words[i])) return -900;
  let cost = 0;
  if (OPENERS.has(bare(words[i + 1]))) cost -= 500;
  if (LEANERS.has(bare(words[i]))) cost += 600;
  return cost;
}

export function paginate(sourceText, max = CAPTION_MAX) {
  const text = sourceText.trim().replace(/\s+/g, ' ');
  const words = text.split(' ');
  if (words.some((w) => chars(w) > max)) throw new Error(`Caption contains an overlong word: ${sourceText}`);

  let minPages = 1;
  let current = 0;
  for (const w of words) {
    const candidate = current === 0 ? chars(w) : current + 1 + chars(w);
    if (candidate > max) {
      minPages += 1;
      current = chars(w);
    } else current = candidate;
  }
  const ideal = chars(text) / minPages;
  const memo = new Map();
  const best = (index, pagesLeft) => {
    const key = `${index}:${pagesLeft}`;
    if (memo.has(key)) return memo.get(key);
    if (pagesLeft === 0) {
      const done = index === words.length ? { cost: 0, pages: [] } : null;
      memo.set(key, done);
      return done;
    }
    let result = null;
    let page = '';
    for (let end = index; end <= words.length - pagesLeft; end++) {
      page = page ? `${page} ${words[end]}` : words[end];
      if (chars(page) > max) break;
      const rest = best(end + 1, pagesLeft - 1);
      if (!rest) continue;
      const boundary = pagesLeft > 1 ? breakCost(words, end) : 0;
      const cost = (chars(page) - ideal) ** 2 + boundary + rest.cost;
      if (!result || cost < result.cost) result = { cost, pages: [page, ...rest.pages] };
    }
    memo.set(key, result);
    return result;
  };
  const solved = best(0, minPages);
  if (!solved) throw new Error(`Unable to paginate caption: ${sourceText}`);
  return solved.pages;
}

/**
 * cues: [{ start, end, text, pause? }] (frames). `pause` = trailing silence in frames (default 30):
 * page changes are spread over the speech window [start, end − pause]; the last page holds to `end`.
 */
export function cueCaptions(cues, { max = CAPTION_MAX, pause = 30 } = {}) {
  const out = [];
  for (const cue of cues) {
    const pages = paginate(cue.text, max);
    const weights = pages.map(chars);
    const total = weights.reduce((a, b) => a + b, 0);
    const speechEnd = Math.max(cue.start + pages.length, cue.end - (cue.pause ?? pause));
    const speech = speechEnd - cue.start;
    let current = cue.start;
    let elapsed = 0;
    for (let i = 0; i < pages.length; i++) {
      elapsed += weights[i];
      const remaining = pages.length - i - 1;
      const end =
        i === pages.length - 1
          ? cue.end
          : Math.min(cue.end - remaining, Math.max(current + 1, cue.start + Math.round((speech * elapsed) / total)));
      out.push({ start: current, end, text: pages[i] });
      current = end;
    }
  }
  return out;
}

/** Captions overlapping [start, start + duration), shifted to scene-local frames and clipped. */
export function sliceCaptions(captions, start, duration) {
  const end = start + duration;
  const out = [];
  for (const c of captions) {
    if (c.end <= start || c.start >= end) continue;
    out.push({ start: Math.max(c.start, start) - start, end: Math.min(c.end, end) - start, text: c.text });
  }
  return out;
}
