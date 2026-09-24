/**
 * Từ vựng hình cho biến hình — mọi hàm trả về MỘT path KHÉP KÍN, cùng chiều kim đồng hồ.
 *
 * Đây là điều kiện để `morphPath` (flubber) nội suy sạch. Vẽ bằng `<rect>` / `<circle>` thì đẹp như nhau
 * nhưng KHÔNG biến hình được — muốn một vật sống suốt cả video thì mọi trạng thái của nó phải là path
 * cùng loại. Vì thế tất cả ở đây đều là đa giác (đường cong đã được chia nhỏ): cùng chiều, cùng kiểu dữ
 * liệu, đổi qua đổi lại không bị xoắn.
 *
 * Toạ độ là toạ độ cảnh (1920 × 1080) hoặc toạ độ mặt phẳng nếu đang ở trong một Canvas.
 */
const f1 = (v) => Math.round(v * 10) / 10;
const close = (pts) => `M ${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L ')} Z`;

/** Chữ nhật, góc bo tuỳ chọn (bo được chia thành `seg` đoạn cho mượt khi biến hình). */
export function rect({ x, y, w, h, r = 0, seg = 6 }) {
  if (!r) return close([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
  const rr = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= seg; i++) {
      const a = a0 + (Math.PI / 2) * (i / seg);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
  };
  corner(x + rr, y + rr, Math.PI);
  corner(x + w - rr, y + rr, -Math.PI / 2);
  corner(x + w - rr, y + h - rr, 0);
  corner(x + rr, y + h - rr, Math.PI / 2);
  return close(pts);
}

/** Hình tròn / elip thành đa giác `n` đỉnh. */
export const ellipse = ({ cx, cy, rx, ry, n = 48 }) =>
  close(Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry];
  }));
export const circle = ({ cx, cy, r, n = 48 }) => ellipse({ cx, cy, rx: r, ry: r, n });

/** Mũi tên khép kín từ `from` tới `to`: thân + đầu tam giác, vẽ liền một nét. */
export function arrow({ from, to, width = 12, head = 34, barb = 2.4 }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const h = Math.min(head, len * 0.6);
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const bx = from.x + ux * (len - h);
  const by = from.y + uy * (len - h);
  const wide = (h * barb) / 2;
  return close([
    [from.x + nx * width, from.y + ny * width],
    [bx + nx * width, by + ny * width],
    [bx + nx * wide, by + ny * wide],
    [to.x, to.y],
    [bx - nx * wide, by - ny * wide],
    [bx - nx * width, by - ny * width],
    [from.x - nx * width, from.y - ny * width],
  ]);
}

/** Tam giác đều hướng lên, xoay `rotate` độ quanh tâm. */
export function triangle({ cx, cy, r, rotate = 0 }) {
  const a0 = (-90 + rotate) * (Math.PI / 180);
  return close([0, 1, 2].map((i) => {
    const a = a0 + (i * Math.PI * 2) / 3;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  }));
}

/** Miếng quạt (một phần của bánh) — dùng cho xác suất, tỉ lệ. */
export function wedge({ cx, cy, r, from = 0, to = 90, n = 24 }) {
  const a0 = (from - 90) * (Math.PI / 180);
  const a1 = (to - 90) * (Math.PI / 180);
  const pts = [[cx, cy]];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return close(pts);
}

/** Đa giác từ danh sách điểm — lối thoát khi cần một hình không có sẵn ở đây. */
export const polygon = (points) => close(points.map((p) => (Array.isArray(p) ? p : [p.x, p.y])));

/** Một ô của dải giá trị (vector nằm ngang): ô thứ `i` trong dải bắt đầu ở `x`. */
export const cell = ({ x, y, i, size = 74, gap = 6, h = 92, r = 5 }) =>
  rect({ x: x + i * (size + gap), y, w: size, h, r });

/** Khung bao cả dải `n` ô — hình hay dùng làm trạng thái ĐẦU của một phép biến hình. */
export const strip = ({ x, y, n, size = 74, gap = 6, h = 92, r = 0 }) =>
  rect({ x, y, w: n * size + (n - 1) * gap, h, r });
