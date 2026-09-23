/**
 * Transition giữa hai cảnh — mượn ý tưởng từ `@remotion/transitions` nhưng cài lại bằng
 * `interpolate`/`Easing` sẵn có, nên KHÔNG thêm dependency và không đụng pipeline render.
 *
 * Mỗi hàm nhận `progress` 0..1 và trả về thứ cần để vẽ:
 *   - `enter`/`exit` → transform string, gắn thẳng vào <g transform={...}>
 *   - `clipPath`     → id + phần tử <clipPath> để cắt hình
 *
 * Vì sao không phải CSS transition: render chụp từng frame rời rạc, `progress` phải suy ra từ số
 * frame thì frame N mới luôn ra đúng một hình (xem motion.js).
 *
 * Cách dùng chung:
 *   const p = transitionProgress(frame, { at: 120, duration: 18 });
 *   <g transform={slide(p, 'exit', 'left')}>{cảnh A}</g>
 *   <g transform={slide(p, 'enter', 'left')}>{cảnh B}</g>
 */
import { Easing, interpolate, CLAMP } from './motion.js';

export const SCENE_W = 1920;
export const SCENE_H = 1080;

/** 0 trước khi bắt đầu, 1 sau khi xong. Ease mặc định là cubic in-out cho cảm giác "máy quay". */
export function transitionProgress(frame, { at, duration = 18, easing = Easing.inOut(Easing.cubic) } = {}) {
  return interpolate(frame, [at, at + duration], [0, 1], { ...CLAMP, easing });
}

/**
 * slide — cảnh cũ trượt ra, cảnh mới trượt vào cùng hướng. Transition "mặc định" dễ dùng nhất.
 * `direction`: 'left' | 'right' | 'up' | 'down' (hướng cảnh mới đi TỚI).
 */
export function slide(progress, role, direction = 'left') {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const span = axis === 'x' ? SCENE_W : SCENE_H;
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  // Cảnh mới đứng ở phía ĐỐI DIỆN hướng đi (đi sang trái thì nó chờ sẵn bên phải) rồi tiến về 0.
  // Sai dấu ở đây thì hai cảnh cùng trượt về một phía và để hở nền trắng giữa khung — trông như
  // mất một mảng hình, và chỉ lộ ra khi thật sự nhìn bản render.
  const offset = role === 'exit' ? progress * span * sign : (1 - progress) * span * -sign;
  return axis === 'x' ? `translate(${offset} 0)` : `translate(0 ${offset})`;
}

/**
 * push — như slide nhưng cảnh mới "đẩy" cảnh cũ: cảnh cũ đi chậm hơn (parallax nhẹ),
 * nên mắt bám theo cảnh mới. Dùng khi chuyển sang một ý MẠNH hơn.
 */
export function push(progress, role, direction = 'left') {
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const span = axis === 'x' ? SCENE_W : SCENE_H;
  const sign = direction === 'left' || direction === 'up' ? -1 : 1;
  const offset = role === 'exit' ? progress * span * sign * 0.35 : (1 - progress) * span * -sign;
  return axis === 'x' ? `translate(${offset} 0)` : `translate(0 ${offset})`;
}

/** zoom — cảnh cũ lùi ra sau và mờ đi, cảnh mới tiến tới. Dùng khi đi SÂU vào một ý. */
export function zoom(progress, role) {
  const scale = role === 'exit' ? interpolate(progress, [0, 1], [1, 1.18]) : interpolate(progress, [0, 1], [0.86, 1]);
  const cx = SCENE_W / 2;
  const cy = SCENE_H / 2;
  return `translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
}

/** Độ mờ đi kèm zoom (zoom một mình sẽ thấy hai cảnh chồng nhau). */
export function zoomOpacity(progress, role) {
  return role === 'exit' ? interpolate(progress, [0, 0.7], [1, 0], CLAMP) : interpolate(progress, [0.3, 1], [0, 1], CLAMP);
}

/**
 * wipe — cảnh mới lộ dần bằng một dải quét ngang/dọc. Trả về phần tử <clipPath> để bọc cảnh mới.
 * Dùng khi hai cảnh CÙNG bố cục và chỉ đổi nội dung (đọc rõ là "cùng một thứ, trạng thái khác").
 */
export function wipeClip(progress, id, direction = 'left') {
  const w = direction === 'left' || direction === 'right' ? SCENE_W * progress : SCENE_W;
  const h = direction === 'up' || direction === 'down' ? SCENE_H * progress : SCENE_H;
  const x = direction === 'right' ? SCENE_W - w : 0;
  const y = direction === 'down' ? SCENE_H - h : 0;
  return { id, rect: { x, y, width: w, height: h } };
}

/**
 * clockWipe — quét theo kim đồng hồ. Dành cho khoảnh khắc "hết giờ / chuyển chương".
 * Tốn sự chú ý nên đừng dùng quá một lần mỗi video.
 */
export function clockWipePath(progress) {
  const cx = SCENE_W / 2;
  const cy = SCENE_H / 2;
  const r = Math.hypot(SCENE_W, SCENE_H);
  if (progress <= 0) return '';
  if (progress >= 1) return `M 0 0 H ${SCENE_W} V ${SCENE_H} H 0 Z`;
  const angle = progress * Math.PI * 2 - Math.PI / 2;
  const x = cx + r * Math.cos(angle);
  const y = cy + r * Math.sin(angle);
  const large = progress > 0.5 ? 1 : 0;
  return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${x} ${y} Z`;
}

/**
 * Chọn transition theo Ý, không theo "cho đỡ chán":
 *
 *   slide  — sang ý KẾ TIẾP cùng cấp (mặc định)
 *   push   — sang ý MẠNH hơn, có nhấn
 *   zoom   — đi SÂU vào chi tiết của ý vừa nói
 *   wipe   — CÙNG bố cục, đổi trạng thái
 *   clock  — hết chương
 *
 * Luật: một video chỉ nên dùng 2-3 kiểu. Đổi kiểu liên tục làm người xem chú ý vào hiệu ứng
 * thay vì nội dung.
 */
export const TRANSITION_INTENT = Object.freeze({
  next: 'slide',
  stronger: 'push',
  deeper: 'zoom',
  sameLayout: 'wipe',
  chapterEnd: 'clock',
});
