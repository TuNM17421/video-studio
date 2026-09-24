import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Một ma trận thật: ngoặc vuông hai bên, mỗi ô một sắc độ theo giá trị, nhãn hàng / cột nếu cần.
 * Khác `Heatmap` ở chỗ nó là một **đại lượng trong phép tính** (có ngoặc, có nhãn, tô sáng được cả một
 * hàng hoặc cả một cột để chỉ ra tích vô hướng đang lấy hàng nào nhân cột nào), còn Heatmap chỉ là lưới.
 *
 * `values` là mảng hai chiều trong [-1, 1] (hoặc đặt `domain`): dương tô mực chính, âm tô đỏ.
 * `reveal` mở dần theo hàng. Chỉ bật `showValues` khi kịch bản đưa số thật.
 */
export function MatrixGrid({
  x, y, values, cell = 46, gap = 4, domain = 1, color = C.accent, negColor = C.red,
  rowLabels, colLabels, labelSize = 18, label, showValues = false, size = 18,
  highlightRow = -1, highlightCol = -1, brackets = true, reveal = 1, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const rows = values.length;
  const cols = values[0]?.length ?? 0;
  const w = cols * cell + (cols - 1) * gap;
  const h = rows * cell + (rows - 1) * gap;
  const tick = 14;
  const shown = clamp01(reveal) * rows;
  const cellX = (c) => x + c * (cell + gap);
  const cellY = (r) => y + r * (cell + gap);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {values.map((row, r) => {
        const on = clamp01(shown - r);
        if (on <= 0.001) return null;
        return (
          <g key={r} opacity={on}>
            {row.map((v, c) => {
              const k = clamp01(Math.abs(v) / domain);
              const dim = (highlightRow >= 0 && r !== highlightRow) || (highlightCol >= 0 && c !== highlightCol);
              return (
                <g key={c} opacity={dim ? 0.25 : 1}>
                  <rect x={cellX(c)} y={cellY(r)} width={cell} height={cell} rx={5} fill={v < 0 ? negColor : color} fillOpacity={0.1 + 0.9 * k} />
                  {showValues ? (
                    <SvgText x={cellX(c) + cell / 2} y={cellY(r) + cell / 2 + size * 0.35} size={size} weight={700} color={k > 0.55 ? C.bg : C.text}>
                      {v}
                    </SvgText>
                  ) : null}
                </g>
              );
            })}
          </g>
        );
      })}
      {highlightRow >= 0 ? <rect x={x - 4} y={cellY(highlightRow) - 4} width={w + 8} height={cell + 8} rx={7} fill="none" stroke={C.red} strokeWidth={3} /> : null}
      {highlightCol >= 0 ? <rect x={cellX(highlightCol) - 4} y={y - 4} width={cell + 8} height={h + 8} rx={7} fill="none" stroke={C.red} strokeWidth={3} /> : null}
      {brackets ? (
        <g fill="none" stroke={C.accentStrong} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
          <path d={`M ${x - 12 + tick} ${y - 6} H ${x - 12} V ${y + h + 6} H ${x - 12 + tick}`} />
          <path d={`M ${x + w + 12 - tick} ${y - 6} H ${x + w + 12} V ${y + h + 6} H ${x + w + 12 - tick}`} />
        </g>
      ) : null}
      {rowLabels
        ? rowLabels.map((l, r) => (
            <SvgText key={`r${r}`} x={x - 26} y={cellY(r) + cell / 2 + labelSize * 0.35} size={labelSize} weight={600} anchor="end" color={r === highlightRow ? C.red : C.textMuted}>
              {l}
            </SvgText>
          ))
        : null}
      {colLabels
        ? colLabels.map((l, c) => (
            <SvgText key={`c${c}`} x={cellX(c) + cell / 2} y={y - 16} size={labelSize} weight={600} color={c === highlightCol ? C.red : C.textMuted}>
              {l}
            </SvgText>
          ))
        : null}
      {label ? (
        <SvgText x={x + w / 2} y={y + h + 44} size={22} weight={600} color={C.textMuted}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
