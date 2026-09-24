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

/**
 * Vùng màn hình một phần tử được phép nằm: dưới eyebrow (và dòng thương hiệu góc phải), trên thanh
 * phụ đề. Giống BOARD_SAFE của style bảng trắng vì chrome y hệt nhau.
 */
export const CANVAS_SAFE = { x0: 0, y0: 110, x1: 1920, y1: 984 };

/**
 * Soát một mặt phẳng đã dựng xong (tools/verify.mjs chạy cho video nào khai `meta.canvas`).
 *
 * Zoom là chỗ dễ sai nhất của style này: kéo camera lại gần thì thứ đang nằm yên ở mép trên bị đẩy lên
 * dưới dòng "NGÀY 01 · …", hoặc tụt xuống dưới thanh phụ đề — nhìn ảnh tĩnh ở một khung thì không thấy,
 * vì nó chỉ hỏng trong lúc camera đang lia.
 *
 * `zones`: [{ id, x0, y0, x1, y1, from, to }] — hình chữ nhật trên mặt phẳng, và khoảng khung hình mà
 * cụm ấy **phải đọc được**. Không phải "khoảng nó hiện": camera nhìn chỗ khác thì cụm ra ngoài khung là
 * chuyện bình thường, không ai soát. Cái cần soát là lúc lời đọc đang nói về nó mà nó lại bị chrome đè.
 * Khai theo cụm (hàng token, bảng khả năng, dải vector…), không cần từng phần tử. Soát cả lúc đang lia,
 * vì đó mới là lúc chật nhất.
 */
export function checkCanvas({ zones = [], camera = [] }, { duration, step = 5 } = {}) {
  const problems = [];
  const warnings = [];
  const end = duration ?? (camera.length ? camera[camera.length - 1].at + 120 : 0);
  for (const z of zones) {
    const from = Math.max(0, z.from ?? 0);
    const to = Math.min(end, z.to ?? end);
    let worst = null;
    for (let f = from; f <= to; f += step) {
      const a = toScreen(camera, f, { x: z.x0, y: z.y0 });
      const b = toScreen(camera, f, { x: z.x1, y: z.y1 });
      const over = [
        a.y < CANVAS_SAFE.y0 ? `đè lên eyebrow (y ${Math.round(a.y)} < ${CANVAS_SAFE.y0})` : null,
        b.y > CANVAS_SAFE.y1 ? `chui xuống dưới thanh phụ đề (y ${Math.round(b.y)} > ${CANVAS_SAFE.y1})` : null,
        a.x < CANVAS_SAFE.x0 ? `tràn mép trái (x ${Math.round(a.x)})` : null,
        b.x > CANVAS_SAFE.x1 ? `tràn mép phải (x ${Math.round(b.x)})` : null,
      ].filter(Boolean);
      if (over.length) worst = { f, over };
    }
    if (worst) problems.push(`${z.id} ${worst.over.join(', ')} ở khung ${worst.f}`);
  }
  for (let i = 1; i < camera.length; i++) {
    if (camera[i].at < camera[i - 1].at) problems.push(`mốc camera ${i} lùi về trước mốc ${i - 1}`);
    const jump = Math.abs(Math.log(camera[i].w) - Math.log(camera[i - 1].w));
    if (jump > 1.6 && (camera[i].dur ?? 40) < 45) warnings.push(`mốc camera ${i} nhảy zoom mạnh trong ${camera[i].dur ?? 40} khung — mắt khó theo`);
  }
  return { problems, warnings };
}

