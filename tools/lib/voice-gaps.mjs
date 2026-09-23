/**
 * Khoảng nghỉ khai bằng ĐÍCH THỰC NGHE THẤY, không bằng số chèn.
 *
 * ── Vì sao ────────────────────────────────────────────────────────────────────────────────────
 * `pauseAfter` trong `cues.js` là số giây lặng CHÈN THÊM. Nhưng thứ tai nghe thấy ở một khe là
 *
 *     khe thực = đuôi giữ lại của clip trước + pauseAfter + đầu giữ lại của clip sau
 *
 * `assemble()` (lib/voice-audio.mjs) cắt lặng thừa nhưng GIỮ ≤50 ms đầu và ≤80 ms đuôi của mỗi clip.
 * Đo trên chính `voice.wav` của video demo: `pauseAfter: 0` ra khe thực **0,16–0,18 s**, `0.5` ra
 * **0,67 s**, `1.0` ra **1,17 s**. Tức khai 0 KHÔNG phải là 0, và ba bậc 0/0,5/1,0 là ba bậc nhảy
 * chứ không phải một thang theo nghĩa của câu.
 *
 * Thí nghiệm nghe A/B (21/09/2026, `projects/demo-…/voice-ab/`) cho thấy nhịp nghỉ hiện tại đặt
 * NGƯỢC CHỖ: khe dài nhất rơi vào giữa phần giải thích, còn ngay trước câu chốt lại ngắn nhất.
 * Thái nghe mù và chọn bản B — bản khai đích theo NGHĨA của khe. Module này là bản B thành luật.
 *
 * ── Bảng luật ─────────────────────────────────────────────────────────────────────────────────
 * Mỗi loại khe có một khoảng đích (giây, THỰC NGHE THẤY). Giữa khoảng, cộng jitter tất định ±40 ms
 * theo hash id cue để nhịp không đều tăm tắp — cùng cue luôn ra cùng số, không dùng nguồn ngẫu nhiên.
 *
 * ── Suy loại ──────────────────────────────────────────────────────────────────────────────────
 * Ưu tiên từ trên xuống. Thứ máy suy được thì suy; thứ không suy được ("đâu là câu chốt") thì khai
 * tay bằng MỘT trường `gap` trong `cues.js`.
 *
 * Khai tay thắng mọi phép SUY — trừ ranh giới CẢNH/CHƯƠNG, ở đó lấy **khe DÀI HƠN trong hai cái**
 * (21/09/2026). Vì sao: hai thứ đó không mâu thuẫn nhau. `gap: 'punch'` ở câu cuối một chương nói
 * "câu này là câu chốt"; nó KHÔNG nói "rút ngắn nhịp sang chương sau". Đo trên
 * `d05-v06-human-centered-ai-design`: luật cũ (khai tay đè tất) làm **4/6 ranh giới CHƯƠNG** chỉ
 * được `punch` 0,82 s thay cho `chapter` 1,40 s, và **20/29 ranh giới CẢNH** mất nhịp cảnh — cả
 * video chỉ còn 2 khe `chapter`. Lấy max giữ được cả hai ý: câu chốt vẫn có nhịp chốt, chỗ sang
 * chương vẫn nghe ra là sang chương. Khai tay DÀI HƠN ranh giới (`gap: 'chapter'` giữa hai cảnh)
 * thì khai tay vẫn thắng — max không lấy mất quyền của lane script.
 */
import { speechBounds } from './voice-audio.mjs';

/** Khoảng đích cho từng loại khe, tính bằng GIÂY THỰC NGHE THẤY. */
export const GAP_KINDS = Object.freeze({
  tight: { range: [0.25, 0.35], jitter: 0.04, why: 'hai câu cùng một ý — câu sau bắt vào câu trước' },
  beat: { range: [0.45, 0.6], jitter: 0.04, why: 'sau câu hỏi hoặc câu mời gọi' },
  count: { range: [0.38, 0.42], jitter: 0.02, why: 'trong chuỗi đếm / liệt kê — nhịp đều' },
  punch: { range: [0.74, 0.9], jitter: 0.02, why: 'trước câu chốt hoặc chỗ đổi ý' },
  scene: { range: [0.9, 1.2], jitter: 0.04, why: 'ranh giới CẢNH' },
  chapter: { range: [1.2, 1.6], jitter: 0.05, why: 'ranh giới CHƯƠNG / cầu nối' },
});

/*
 * `jitter` nhỏ hơn ở `count` và `punch` là CÓ CHỦ ĐÍCH, không phải tinh chỉnh cho vừa số:
 * chuỗi đếm phải nghe ra một nhịp ĐỀU, còn nhịp trước câu chốt là một khoảng lặng cố ý — cả hai
 * mất tác dụng nếu mỗi lần một khác. `tight`/`scene`/`chapter` thì jitter rộng hơn để khỏi đều
 * tăm tắp như máy đếm nhịp.
 */

/**
 * Độ dài danh nghĩa của một loại khe (giữa dải, giây) — thang để so "khe nào DÀI HƠN".
 * Dùng chính `GAP_KINDS` làm nguồn, không chép lại thứ tự ra một mảng rời có thể trôi.
 */
export function gapLength(kind) {
  const k = GAP_KINDS[kind];
  return k ? (k.range[0] + k.range[1]) / 2 : -Infinity;
}

/** Jitter tất định ±40 ms (FNV-1a của số câu). Không `Math.random`, không đồng hồ thật. */
export function jitterSeconds(n, spread = 0.04) {
  let h = 0x811c9dc5;
  for (const ch of String(n)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return ((h % 81) - 40) / 40 * spread;
}

/**
 * Từ ĐẾM thật — cố ý BỎ `một` và `năm`: `một` hầu hết là mạo từ ("đúng một cái trần"), `năm` hầu hết
 * là "năm 2006". Để chúng trong danh sách thì câu nào cũng thành chuỗi đếm (đo thật: 32/87 khe bị
 * gắn nhầm `count`, trong đó có cả "Nhưng dễ hiểu lắm các bạn.").
 */
const COUNT_WORD = /(?<![\p{L}\p{N}])(hai|ba|bốn|sáu|bảy|tám|chín|mười|chục|trăm|nghìn|ngàn|triệu)(?![\p{L}\p{N}])|\d/iu;
/** Câu hỏi, câu bỏ lửng, hoặc câu nói THẲNG với người nghe ("…các bạn.", "…giúp mình."). */
const INVITE = /[?…]\s*$|(?<![\p{L}\p{N}])(nhé|nha|nhá)(?![\p{L}\p{N}])[^.]*$|(?<![\p{L}\p{N}])(các bạn|giúp mình)(?![\p{L}\p{N}])\s*[.!]?\s*$/iu;

/**
 * Suy loại khe SAU cue `i`. `cues` là mảng đã có `scene`/`section`/`text`/`pauseAfter`/`gap`.
 * Trả `{ kind, source }` — `source` nói loại này do đâu mà có, để bảng đối chiếu đọc được.
 */
export function classifyGap(cues, i, { chapterOf } = {}) {
  const cur = cues[i];
  const next = cues[i + 1];
  if (!next) return { kind: null, source: 'cue cuối — không có khe' };

  const chap = chapterOf || ((c) => c.section);
  // Ranh giới CẤU TRÚC — thứ duy nhất khai tay không được rút ngắn.
  const edge =
    chap(cur) !== chap(next) ? { kind: 'chapter', source: 'đổi section (chương/cầu nối)' }
    : cur.scene && next.scene && cur.scene !== next.scene ? { kind: 'scene', source: 'đổi scene' }
    : null;

  if (cur.gap && GAP_KINDS[cur.gap]) {
    const hand = { kind: cur.gap, source: 'khai tay `gap` trong cues.js' };
    if (!edge) return hand;
    // max theo ĐỘ DÀI khe, không theo thứ tự luật: câu chốt vẫn chốt, sang chương vẫn nghe ra.
    if (gapLength(edge.kind) > gapLength(hand.kind)) {
      return { kind: edge.kind, source: `${edge.source} — dài hơn khai tay \`${cur.gap}\`, lấy max` };
    }
    return { kind: hand.kind, source: `${hand.source} — dài hơn ranh giới \`${edge.kind}\`, lấy max` };
  }
  if (edge) return edge;

  // `pauseAfter: 1.0` sẵn có là TÍN HIỆU của script lane: "muốn một nhịp dài ở đây". Đừng san phẳng.
  if ((cur.pauseAfter ?? 0) >= 1) return { kind: 'punch', source: 'pauseAfter ≥ 1,0 sẵn có — nhịp dài script lane đã muốn' };

  const prev = cues[i - 1];
  const sameScene = (a, b) => a && b && (!a.scene || !b.scene || a.scene === b.scene);
  const run = (c) => c && COUNT_WORD.test(String(c.text || ''));
  if (run(cur) && ((run(next) && sameScene(cur, next)) || (run(prev) && sameScene(cur, prev)))) {
    return { kind: 'count', source: 'chuỗi đếm/liệt kê' };
  }

  if (INVITE.test(String(cur.text || ''))) return { kind: 'beat', source: 'câu hỏi / câu mời gọi' };
  return { kind: 'tight', source: 'mặc định — cùng ý, cùng cảnh' };
}

/** Đích (giây thực) của một khe đã biết loại. */
export function targetFor(kind, n) {
  const k = GAP_KINDS[kind];
  if (!k) return null;
  const mid = (k.range[0] + k.range[1]) / 2;
  const half = (k.range[1] - k.range[0]) / 2;
  const t = mid + Math.max(-half, Math.min(half, jitterSeconds(n, k.jitter ?? 0.04)));
  return Math.round(t * 1000) / 1000;
}

/**
 * Phần lặng `assemble()` GIỮ LẠI ở hai đầu một clip — phải khớp đúng công thức trong
 * `lib/voice-audio.mjs`, nếu không đích tính ra sẽ lệch đúng bằng chỗ sai.
 */
export function keptEdges(pcm, sampleRate) {
  const { a, b } = speechBounds(pcm);
  const total = pcm.length / 2;
  return {
    lead: Math.min(a, Math.round(0.05 * sampleRate)) / sampleRate,
    tail: Math.min(total - b, Math.round(0.08 * sampleRate)) / sampleRate,
  };
}

/**
 * Tính `pauseAfter` cho từng cue sao cho khe THỰC chạm đích.
 *
 *   cues        [{ n, text, scene?, section?, pauseAfter?, gap?, silent? }]
 *   edgesOf(n)  → { lead, tail } của clip cue n (giây), lấy từ `keptEdges`
 *
 * Trả mảng `{ n, kind, source, target, kept, pauseAfter, before }` — `before` là khe thực CŨ, để in
 * bảng đối chiếu. Cue cuối không có khe: giữ nguyên `pauseAfter` đang khai.
 */
export function resolveGaps(cues, edgesOf, { chapterOf } = {}) {
  const out = [];
  for (let i = 0; i < cues.length; i++) {
    const cur = cues[i];
    const next = cues[i + 1];
    if (!next) {
      out.push({ n: cur.n, kind: null, source: 'cue cuối', target: null, kept: null, pauseAfter: cur.pauseAfter ?? 1, before: null });
      continue;
    }
    const { kind, source } = classifyGap(cues, i, { chapterOf });
    const target = targetFor(kind, cur.n);
    const eCur = edgesOf(cur.n) || { lead: 0, tail: 0 };
    const eNext = edgesOf(next.n) || { lead: 0, tail: 0 };
    const kept = Math.round((eCur.tail + eNext.lead) * 1000) / 1000;
    const pauseAfter = Math.max(0, Math.round((target - kept) * 1000) / 1000);
    const before = Math.round(((cur.pauseAfter ?? 1) + kept) * 1000) / 1000;
    out.push({ n: cur.n, kind, source, target, kept, pauseAfter, before, after: Math.round((pauseAfter + kept) * 1000) / 1000 });
  }
  return out;
}
