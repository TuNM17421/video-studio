import React from 'react';
import { C, alpha } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { SvgText } from '../text/Text.jsx';

function Note({ x, y, note, color }) {
  if (!note) return null;
  return (
    <g>
      <SvgText x={x} y={y} size={17} weight={700} anchor="start" color={color}>
        {note.label}
      </SvgText>
      {(note.lines || []).map((t, i) => (
        <SvgText key={i} x={x} y={y + 40 + i * 36} size={21} anchor="start" color={C.textMuted}>
          {t}
        </SvgText>
      ))}
    </g>
  );
}

/**
 * Iceberg — what is visible versus the much larger part underneath (câu trả lời thấy được / dữ liệu,
 * ràng buộc, chi phí bên dưới).
 * Anatomy: a white tip with a 5 px accent outline above a red dashed waterline (5 px, dash `12 10`,
 * 60 px wider than the berg on both sides); the submerged body is accent at 22 % with the same outline,
 * three times as wide as the tip. Notes sit 84 px right of the berg: `above` beside the tip (label
 * 17/700 accentStrong), `below` under the waterline (label 17/700 red) — each a label plus up to 3 muted
 * 21/600 lines.
 * `depth` (0–1) reveals the submerged body and its note after the tip is established — say what everyone
 * sees first, then lower the waterline view. Needs ~420 px right of the berg for the notes.
 */
export function Iceberg({ x, y, w = 560, h = 480, above, below, depth = 1, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const wl = y + h * 0.22;
  const tw = w * 0.34;
  const mid = x + w / 2;
  const d = clamp01(depth);
  const tip = `M ${mid} ${y} L ${mid + tw / 2} ${wl} L ${mid - tw / 2} ${wl} Z`;
  const body = `M ${mid - tw / 2} ${wl} L ${mid + tw / 2} ${wl} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
  const nx = x + w + 84;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {d > 0.001 ? (
        <g opacity={d < 1 ? d : undefined}>
          <path d={body} fill={alpha('accent', 0.22)} stroke={C.accent} strokeWidth={5} strokeLinejoin="round" />
          <Note x={nx} y={wl + 64} note={below} color={C.red} />
        </g>
      ) : null}
      <path d={tip} fill={C.bg} stroke={C.accent} strokeWidth={5} strokeLinejoin="round" />
      <path d={`M ${x - 60} ${wl} H ${x + w + 60}`} stroke={C.red} strokeWidth={5} strokeDasharray="12 10" />
      <Note x={nx} y={wl - 30 - Math.max(0, (above?.lines || []).length) * 36} note={above} color={C.accentStrong} />
    </g>
  );
}
