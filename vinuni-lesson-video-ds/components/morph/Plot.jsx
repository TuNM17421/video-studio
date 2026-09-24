import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { curvePath } from '../../lib/paths.js';

/**
 * Đường cong của một hàm trên một khung, tô được vùng dưới đường.
 *
 * Dùng cho phân bố xác suất, đường học (loss), bất cứ thứ gì là "giá trị theo một trục". `reveal` vẽ
 * đường từ trái sang — hợp với lời đọc kể dần, và `pointAt` cho phép đặt một chấm hay một nhãn đúng
 * chỗ trên đường mà không phải tự tính lại hàm.
 *
 *   const plot = { o: { x: 300, y: 820 }, w: 1200, h: 420, from: -3, to: 3, min: 0, max: 1 };
 *   <Plot {...plot} fn={(x) => Math.exp(-x * x / 2)} fill reveal={r} />
 */
export const plotPoint = ({ o, w, h, from, to, min = 0, max = 1 }, x, y) => ({
  x: o.x + ((x - from) / ((to - from) || 1)) * w,
  y: o.y - ((y - min) / ((max - min) || 1)) * h,
});

export function Plot({
  o, w = 1200, h = 400, from = -3, to = 3, min = 0, max = 1, fn, samples = 96,
  color = C.accent, fill = false, fillOpacity = 0.16, width = 5, reveal = 1, opacity = 1,
}) {
  if (opacity <= 0.001 || typeof fn !== 'function') return null;
  const box = { o, w, h, from, to, min, max };
  const k = clamp01(reveal);
  const n = Math.max(2, Math.round(samples * k));
  const pts = Array.from({ length: n }, (_, i) => {
    const x = from + ((to - from) * i) / (samples - 1);
    return plotPoint(box, x, fn(x));
  });
  const d = curvePath(pts, 'catmullRom');
  const base = plotPoint(box, from, min);
  const last = pts[pts.length - 1];
  const area = `${d} L ${last.x} ${base.y} L ${base.x} ${base.y} Z`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {fill ? <path d={area} fill={color} fillOpacity={fillOpacity} stroke="none" /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}
