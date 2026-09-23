/**
 * Cầu nối giữa hai chương — nơi một vật thể của cảnh TRƯỚC đi tiếp sang cảnh SAU.
 *
 * Luật của dòng poster (retro 21/09/2026 · audit animation F12): cảnh cầu nối **không được vẽ lại**
 * hình của cảnh liền kề. Vẽ lại nghĩa là có hai bản sao của một hình, sửa một bên là cầu nối lệch
 * và không gate nào bắt được. Cầu nối phải `import` chính phần tử đó — ví dụ `bridge-1` dựng
 * `<Plaque {...BAI_HOC_1973} />` lấy thẳng từ `chapter-lighthill.jsx`, không gõ lại hai dòng chữ.
 *
 * File này giữ phần TOÁN của việc mang vật thể đi: `carry()`.
 */
import { Easing, kf } from './engine.jsx';

/**
 * `carry` — nội suy MỘT hộp/nhóm từ trạng thái của cảnh trước sang trạng thái của cảnh sau, trong
 * đúng một cửa sổ `[at, at + dur]`.
 *
 * `from`/`to` là hai object cùng khoá (`x`, `y`, `w`, `h`, `scale`, `opacity`… tuỳ cảnh); trả về
 * object cùng khoá đó đã nội suy, cộng `p` (tiến độ 0→1). Viết một cửa sổ thay vì bốn lời gọi `kf`
 * rời nhau là cách duy nhất bảo đảm bốn giá trị không bao giờ lệch pha — lỗi đã cắn ở `bridge-2`
 * (máy tan xong 1,1 s mà nốt chưa kịp lớn, đo ra khung chết).
 *
 * Hai chỗ dùng: `bridge-2` (cỗ máy của chương 2006 thu thành nốt gốc của chương Cây) và `outro`
 * (nhóm mũi tên "hôm nay" của `T5` lùi ra nhường chỗ cho thân cây).
 */
export function carry(T, { at, dur, from, to, ease = Easing.easeInOutCubic }) {
  const p = kf(T, [[at, 0], [at + dur, 1]], ease);
  const out = { p };
  for (const k of Object.keys(from)) out[k] = from[k] + (to[k] - from[k]) * p;
  return out;
}
