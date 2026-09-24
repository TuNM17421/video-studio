import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * Dấu ngoặc nhọn ôm một ĐOẠN, kèm nhãn — `Brace` / `BraceLabel` của Manim.
 *
 * Khác mọi cách nhấn khác ở chỗ nó chú thích **một khoảng**, không phải một điểm: "tám chiều này",
 * "phần bị cắt", "ba token đầu". Mũi tên chỉ được vào một chỗ; ngoặc nhọn nói được "từ đây tới đây".
 *
 *   <Brace from={{ x: 400, y: 560 }} to={{ x: 1200, y: 560 }} label="tám chiều" side="down" grow={t} />
 *
 * `side` là phía ngoặc nằm so với đoạn. `grow` 0→1 mở ngoặc ra từ giữa, như khi Manim vẽ nó.
 */
const f1 = (v) => Math.round(v * 10) / 10;

export function Brace({
  from, to, label, side = 'down', depth = 26, grow = 1, color = C.textMuted, size = 30, gap = 16, opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const k = clamp01(grow);
  if (k <= 0.001) return null;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  // pháp tuyến hướng ra phía `side`
  const sign = side === 'up' || side === 'left' ? -1 : 1;
  const nx = -uy * sign;
  const ny = ux * sign;
  // ngoặc mở dần từ giữa ra hai đầu
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const a = { x: mid.x - ux * (len / 2) * k, y: mid.y - uy * (len / 2) * k };
  const b = { x: mid.x + ux * (len / 2) * k, y: mid.y + uy * (len / 2) * k };
  const d = depth * k;
  const p = (q) => `${f1(q.x)} ${f1(q.y)}`;
  const off = (q, n, s) => ({ x: q.x + nx * n + ux * s, y: q.y + ny * n + uy * s });
  const tip = { x: mid.x + nx * d * 1.7, y: mid.y + ny * d * 1.7 };
  const path = [
    `M ${p(a)}`,
    `Q ${p(off(a, d * 0.9, 0))} ${p(off(a, d, len * 0.14))}`,
    `L ${p(off(mid, d, -len * 0.06))}`,
    `Q ${p(off(mid, d * 1.4, 0))} ${p(tip)}`,
    `Q ${p(off(mid, d * 1.4, 0))} ${p(off(mid, d, len * 0.06))}`,
    `L ${p(off(b, d, -len * 0.14))}`,
    `Q ${p(off(b, d * 0.9, 0))} ${p(b)}`,
  ].join(' ');
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path d={path} fill="none" stroke={color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      {label && k > 0.85 ? (
        <SvgText x={tip.x + nx * gap} y={tip.y + ny * gap + (ny > 0 ? size * 0.85 : 0)} size={size} weight={700}
          color={color} opacity={clamp01((k - 0.85) / 0.15)}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
