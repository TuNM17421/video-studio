import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';
import { LAYER } from './Layer.jsx';

/**
 * Trục số có vạch và nhãn — `NumberLine` của Manim.
 *
 * Thứ quan trọng không phải cái đường, mà là `numberToPoint`: có nó thì mọi vật đặt được **đúng vị trí
 * giá trị của nó**, và khi giá trị đổi thì vật trượt theo. Không có nó thì mọi thang đo trên màn hình
 * chỉ là trang trí.
 *
 *   const line = { o: { x: 300, y: 800 }, length: 1300, from: 0, to: 1 };
 *   <NumberLine {...line} step={0.25} decimals={2} />
 *   <circle cx={numberToPoint(line, 0.72).x} cy={…} />
 */
export const numberToPoint = ({ o, length, from, to }, v) => ({
  x: o.x + ((v - from) / ((to - from) || 1)) * length,
  y: o.y,
});

export function NumberLine({
  o, length = 1200, from = 0, to = 1, step = 0.25, decimals = 1, label, size = 26,
  color = C.text, tick = 12, opacity = LAYER.frame, labelOpacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const line = { o, length, from, to };
  const ticks = [];
  const n = Math.round((to - from) / (step || 1));
  for (let i = 0; i <= n; i += 1) ticks.push(from + i * step);
  const fmt = (v) => (decimals ? v.toFixed(decimals).replace('.', ',') : String(Math.round(v)));
  return (
    <g>
      <g opacity={opacity} stroke={color} fill="none" strokeLinecap="round">
        <path d={`M ${o.x} ${o.y} H ${o.x + length}`} strokeWidth={3} />
        {ticks.map((v, i) => {
          const p = numberToPoint(line, v);
          return <path key={i} d={`M ${p.x} ${p.y - tick} V ${p.y + tick}`} strokeWidth={2} />;
        })}
      </g>
      <g opacity={labelOpacity}>
        {ticks.map((v, i) => {
          const p = numberToPoint(line, v);
          return <SvgText key={i} x={p.x} y={p.y + tick + size} size={size} weight={600} color={C.textMuted}>{fmt(v)}</SvgText>;
        })}
        {label ? <SvgText x={o.x + length / 2} y={o.y + tick + size * 2.4} size={size * 1.1} weight={700} color={C.text}>{label}</SvgText> : null}
      </g>
    </g>
  );
}
