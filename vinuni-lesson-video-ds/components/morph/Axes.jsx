import React from 'react';
import { C } from '../../lib/tokens.js';
import { LAYER } from './Layer.jsx';

/**
 * Trục toạ độ của một mặt phẳng hình học — luôn là phần KHUNG (15 %), không bao giờ tranh chú ý với vật.
 * `ticks` vạch chia nhỏ; đặt `grid` để có lưới mờ.
 */
export function Axes({ o, x = 420, yUp = 420, yDown = 150, ticks = 0, grid = false, color = C.text, opacity = LAYER.frame }) {
  if (opacity <= 0.001) return null;
  const step = ticks ? x / ticks : 0;
  return (
    <g opacity={opacity} stroke={color} fill="none" strokeLinecap="round">
      {grid && step
        ? Array.from({ length: ticks * 2 + 1 }, (_, i) => {
            const gx = o.x - x + i * step;
            return <path key={`g${i}`} d={`M ${gx} ${o.y - yUp} V ${o.y + yDown}`} strokeWidth={1} opacity={0.5} />;
          })
        : null}
      <path d={`M ${o.x - x} ${o.y} H ${o.x + x}`} strokeWidth={3} />
      <path d={`M ${o.x} ${o.y + yDown} V ${o.y - yUp}`} strokeWidth={3} />
      {step
        ? Array.from({ length: ticks * 2 + 1 }, (_, i) => {
            const gx = o.x - x + i * step;
            return <path key={`t${i}`} d={`M ${gx} ${o.y - 9} V ${o.y + 9}`} strokeWidth={2} />;
          })
        : null}
    </g>
  );
}
