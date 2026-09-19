import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

/**
 * LayerStack — layers of one system stacked top to bottom (giao diện / ứng dụng / mô hình, the layers of
 * a defence), with one layer pulled forward as the current focus.
 * Anatomy: rows 130 px tall, 22 px apart, radius 22, 3 px dotInactive stroke on bgAlt · label 18/700
 * accentStrong, optional muted 21/600 line. The focused layer spans the full width with a redSoft fill,
 * 5 px red stroke and a red label; the others are inset 56 px each side and dimmed to 36 %.
 * `active` is a layer index, or -1 for no focus (every layer full strength, full width). `reveal`
 * (0–1 per layer, optional) builds the stack one layer at a time. Walk `active` down the stack as the
 * narration moves through the layers; do not animate the inset — a cut between focus states reads cleaner.
 */
export function LayerStack({ x, y, w = 800, layers = [], active = -1, reveal, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const rh = 130;
  const gap = 22;
  const inset = 56;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {layers.map((l, i) => {
        const shown = reveal ? clamp01(reveal[i] ?? 0) : 1;
        if (shown <= 0.001) return null;
        const on = i === active;
        const dim = active >= 0 && !on;
        const ix = dim ? inset : 0;
        const ty = y + i * (rh + gap);
        const o = shown * (dim ? 0.36 : 1);
        return (
          <g key={i} opacity={o < 1 ? o : undefined}>
            <rect
              x={x + ix}
              y={ty}
              width={w - ix * 2}
              height={rh}
              rx={22}
              fill={on ? C.redSoft : C.bgAlt}
              stroke={on ? C.red : C.dotInactive}
              strokeWidth={on ? 5 : 3}
            />
            <SvgText
              x={x + ix + 44}
              y={ty + (l.sub ? 56 : rh / 2 + 7)}
              size={18}
              weight={700}
              anchor="start"
              color={on ? C.red : C.accentStrong}
            >
              {l.label}
            </SvgText>
            {l.sub ? (
              <SvgText x={x + ix + 44} y={ty + 96} size={21} anchor="start" color={C.textMuted}>
                {l.sub}
              </SvgText>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
