import React from 'react';
import { C, WIDTH, HEIGHT } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';

/**
 * Spotlight — dims the whole scene except one region, to point the eye at the part the narration is
 * about without moving or redrawing anything.
 * Anatomy: a white (`C.bg`) veil over the full 1920 × 1080 frame at 82 % × `amount`, with a rounded hole
 * (radius 26) around `region` grown by `pad`. Render it AFTER the content it dims and BEFORE anything
 * that must stay sharp (captions are HTML and stay above it anyway).
 * `amount` (0–1) fades the veil in and out — use appear() in, fadeWindow() for a spotlight that leaves.
 * Move the hole between regions with smooth() on the region's numbers rather than cutting.
 * The mask itself is luminance (white keeps the veil, black cuts the hole), not a palette color.
 * The mask id is derived from `id` (default: the region's coordinates), so two spotlights in one scene
 * need different `id`s only when they share a region.
 */
export function Spotlight({ region, amount = 1, pad = 18, radius = 26, id }) {
  const a = clamp01(amount);
  if (a <= 0.001 || !region) return null;
  const mask = `vk-spot-${id ?? `${Math.round(region.x)}-${Math.round(region.y)}-${Math.round(region.w)}-${Math.round(region.h)}`}`;
  return (
    <g>
      <defs>
        <mask id={mask}>
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill="white" />
          <rect x={region.x - pad} y={region.y - pad} width={region.w + pad * 2} height={region.h + pad * 2} rx={radius} fill="black" />
        </mask>
      </defs>
      <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={C.bg} opacity={0.82 * a} mask={`url(#${mask})`} />
    </g>
  );
}
