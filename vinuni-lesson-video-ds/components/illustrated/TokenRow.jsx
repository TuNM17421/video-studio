import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Một câu đã cắt thành token: mỗi token là một viên gạch, xếp thành hàng (xuống dòng khi hết bề rộng).
 * Đây là vật liệu mở đầu của style Illustrated — hàng token này rồi sẽ thành vector, thành ma trận,
 * và là hai đầu của AttentionLines. Toạ độ từng viên lấy bằng tokenLayout() để cảnh khác nối vào.
 *
 * `shown` là số token đã hiện (đếm theo câu lời đọc), `enter` là phần hiện dở của viên kế tiếp.
 * Không tự cắt token: danh sách token do kịch bản đưa, vì cách cắt là nội dung bài học.
 */
export function tokenLayout({ x, y, tokens, size = 30, padX = 18, gap = 12, rowGap = 22, maxW = 1600 }) {
  const h = Math.round(size * 2);
  const out = [];
  let cx = x;
  let cy = y;
  for (const t of tokens) {
    const text = typeof t === 'string' ? t : t.text;
    const w = Math.round(textWidth(text, size, 600) + padX * 2);
    if (cx > x && cx + w - x > maxW) {
      cx = x;
      cy += h + rowGap;
    }
    out.push({ text, x: cx, y: cy, w, h, cx: cx + w / 2, cy: cy + h / 2 });
    cx += w + gap;
  }
  return out;
}

export function TokenRow({
  x, y, tokens, size = 30, padX = 18, gap = 12, rowGap = 22, maxW = 1600,
  shown = tokens.length, enter = 1, highlight = -1, color = C.accent, ids = false, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const cells = tokenLayout({ x, y, tokens, size, padX, gap, rowGap, maxW });
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {cells.map((c, i) => {
        // viên sau `shown` chưa vẽ; viên thứ `shown` đang hiện dở theo `enter`
        const on = i < shown ? 1 : i === shown ? clamp01(enter) : 0;
        if (on <= 0.001) return null;
        const t = typeof tokens[i] === 'string' ? {} : tokens[i];
        const ink = t.color ?? (i === highlight ? C.red : color);
        return (
          <g key={`${i}-${c.text}`} opacity={on}>
            <rect x={c.x} y={c.y} width={c.w} height={c.h} rx={8} fill={i === highlight ? C.redSoft : C.bgAlt} stroke={ink} strokeWidth={i === highlight ? 3 : 2} />
            <SvgText x={c.cx} y={c.cy + size * 0.35} size={size} weight={600} color={i === highlight ? C.red : C.text}>
              {c.text}
            </SvgText>
            {ids ? (
              <SvgText x={c.cx} y={c.y + c.h + 26} size={18} weight={600} color={C.textMuted}>
                {String(i)}
              </SvgText>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
