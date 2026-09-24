import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Một vector nằm ngang, vẽ thành dải ô: mỗi chiều một ô, đậm nhạt theo giá trị.
 * Đây là hình "token thành viên gạch nhiều ô" của style Illustrated — dùng ngay dưới một TokenRow để
 * nói "mỗi token là một dãy số", và là một hàng của MatrixGrid.
 *
 * `values` là số trong [-1, 1] (hoặc đặt `domain`). Dương tô mực chính, âm tô đỏ, nên một dải có cả hai
 * dấu vẫn đọc được mà không cần thêm màu ngoài bảng. `reveal` 0→1 mở dần cả dải từ trái sang.
 * Số hiển thị chỉ khi kịch bản có số thật (`showValues`) — đừng bịa.
 */
export function VectorStrip({
  x, y, values, cell = 46, h = 56, gap = 4, domain = 1, color = C.accent, negColor = C.red,
  brackets = true, label, showValues = false, size = 20, highlight = -1, reveal = 1, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const n = values.length;
  const w = n * cell + (n - 1) * gap;
  const tick = Math.max(10, Math.min(22, h * 0.22));
  const off = Math.max(10, cell * 0.16);
  const shown = clamp01(reveal) * n;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {values.map((v, i) => {
        const on = clamp01(shown - i);
        if (on <= 0.001) return null;
        const k = clamp01(Math.abs(v) / domain);
        const cx = x + i * (cell + gap);
        return (
          <g key={i} opacity={on}>
            <rect x={cx} y={y} width={cell} height={h} rx={5} fill={v < 0 ? negColor : color} fillOpacity={0.1 + 0.9 * k} />
            {i === highlight ? <rect x={cx - 3} y={y - 3} width={cell + 6} height={h + 6} rx={7} fill="none" stroke={C.red} strokeWidth={3} /> : null}
            {showValues ? (
              <SvgText x={cx + cell / 2} y={y + h / 2 + size * 0.35} size={size} weight={700} color={k > 0.55 ? C.bg : C.text}>
                {v}
              </SvgText>
            ) : null}
          </g>
        );
      })}
      {brackets ? (
        <g fill="none" stroke={C.accentStrong} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${x - off} ${y + tick} V ${y} H ${x - off + tick}`} />
          <path d={`M ${x - off} ${y + h - tick} V ${y + h} H ${x - off + tick}`} />
          <path d={`M ${x + w + off} ${y + tick} V ${y} H ${x + w + off - tick}`} />
          <path d={`M ${x + w + off} ${y + h - tick} V ${y + h} H ${x + w + off - tick}`} />
        </g>
      ) : null}
      {label ? (
        <SvgText x={x + w / 2} y={y + h + 34} size={22} weight={600} color={C.textMuted}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
