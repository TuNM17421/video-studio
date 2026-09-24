import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';

/**
 * Token nào đang nhìn token nào: đường cong từ hàng trên xuống hàng dưới, đậm và dày theo trọng số.
 * Đây là hình khó nhất của style Illustrated và cũng là hình đáng vẽ nhất — nói bằng lời thì mơ hồ.
 *
 * `from` / `to` là toạ độ neo của hai hàng token, lấy bằng `tokenLayout()` của TokenRow (dùng `cx` và
 * mép dưới / mép trên). `links` là { from, to, w } với `w` trong [0, 1]; trọng số do kịch bản đưa.
 * `focus` chỉ vẽ các đường xuất phát từ một token — **hầu như luôn nên dùng**: cả lưới n×n một lúc là
 * mớ chỉ rối, một token một lúc mới đọc được. `reveal` 0→1 kéo từng đường ra dần.
 * Đường dưới `minWeight` bị bỏ để không vẽ nhiễu.
 */
export function AttentionLines({
  from, to, links, color = C.accent, strongColor = C.red, bend = 0.45, dip = 0, minWeight = 0.08,
  focus = -1, reveal = 1, maxWidth = 9, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const shown = clamp01(reveal);
  const drawn = links.filter((l) => l.w >= minWeight && (focus < 0 || l.from === focus));
  return (
    <g opacity={opacity < 1 ? opacity : undefined} fill="none" strokeLinecap="round">
      {drawn.map((l, i) => {
        const a = from[l.from];
        const b = to[l.to];
        if (!a || !b) return null;
        const w = clamp01(l.w);
        // cong theo trục dọc: hai điểm điều khiển kéo về phía nhau nên đường rời neo theo chiều thẳng.
        // `dip` đẩy cả hai điểm điều khiển xuống — cần khi hai neo nằm CÙNG độ cao (ô trống cuối hàng
        // nhìn về các viên phía trước), vì lúc đó độ cong theo chênh lệch y bằng không.
        const dy = (b.y - a.y) * bend;
        const d = `M ${a.x} ${a.y} C ${a.x} ${a.y + dy + dip}, ${b.x} ${b.y - dy + dip}, ${b.x} ${b.y}`;
        const ink = l.color ?? (w >= 0.6 ? strongColor : color);
        // các đường hiện lần lượt, đường nặng trước
        const slot = drawn.length > 1 ? i / drawn.length : 0;
        const on = clamp01((shown - slot * 0.6) / 0.4);
        if (on <= 0.001) return null;
        return <path key={`${l.from}-${l.to}`} d={d} stroke={ink} strokeWidth={1.5 + maxWidth * w} strokeOpacity={(0.15 + 0.85 * w) * on} />;
      })}
    </g>
  );
}

/** Neo dưới của mỗi ô trong một hàng token (đầu trên của đường) — dùng với tokenLayout(). */
export const anchorsBelow = (cells, pad = 6) => cells.map((c) => ({ x: c.cx, y: c.y + c.h + pad }));
/** Neo trên của mỗi ô trong một hàng token (đầu dưới của đường). */
export const anchorsAbove = (cells, pad = 6) => cells.map((c) => ({ x: c.cx, y: c.y - pad }));
