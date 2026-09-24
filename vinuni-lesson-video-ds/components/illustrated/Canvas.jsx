import React from 'react';

/**
 * Canvas — MỘT mặt phẳng cho cả video, và một camera đi trên nó.
 *
 * Đây là thứ làm style Illustrated khác Lesson, không phải mấy hình vẽ. Lesson là chuỗi cảnh: mỗi câu
 * một khung, có tiêu đề, cắt cứng sang câu sau. Illustrated không có cảnh nào cả — vật liệu (hàng token,
 * dãy số, ma trận) nằm cố định trên một mặt phẳng rộng hơn màn hình, camera lia tới chỗ đang nói và lùi
 * ra khi cần xem toàn cảnh. Người xem không bao giờ mất dấu, vì không có gì bị cắt đi.
 *
 *   <Canvas frame={frame} camera={CAMERA}>…</Canvas>
 *
 * `camera`: [{ at, dur?, x, y, w }] — điểm (x, y) trên mặt phẳng về giữa màn hình, `w` đơn vị mặt phẳng
 * phủ hết chiều ngang 1920. Zoom nội suy theo log nên lia gần ↔ xa không bị giật.
 * Mốc đầu tiên áp dụng ngay từ khung 0; giữa hai mốc là ease-in-out trong `dur` khung.
 */
const CENTER = { x: 960, y: 540 };
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Trạng thái camera ở `frame`: { x, y, w, scale }. */
export function cameraAt(camera, frame) {
  if (!camera || !camera.length) return { ...CENTER, w: 1920, scale: 1 };
  let from = camera[0];
  let to = camera[0];
  for (const key of camera) {
    if (key.at <= frame) {
      from = to;
      to = key;
    }
  }
  const dur = to.dur ?? 40;
  const t = to === from || dur <= 0 ? 1 : easeInOut(Math.max(0, Math.min(1, (frame - to.at) / dur)));
  // zoom nội suy trong không gian log: đi từ w=1920 tới w=480 phải mượt như đi ngược lại
  const w = Math.exp(Math.log(from.w) + (Math.log(to.w) - Math.log(from.w)) * t);
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    w,
    scale: 1920 / w,
  };
}

/** Điểm trên mặt phẳng → điểm trên màn hình, ở khung `frame`. */
export function toScreen(camera, frame, p) {
  const c = cameraAt(camera, frame);
  return { x: CENTER.x + (p.x - c.x) * c.scale, y: CENTER.y + (p.y - c.y) * c.scale, scale: c.scale };
}

export function Canvas({ frame, camera, children }) {
  const c = cameraAt(camera, frame);
  return (
    <g transform={`translate(${CENTER.x} ${CENTER.y}) scale(${c.scale}) translate(${-c.x} ${-c.y})`}>
      {children}
    </g>
  );
}
