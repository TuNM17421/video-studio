import React from 'react';
import { C } from '../../lib/tokens.js';

/**
 * SVG text with the lesson defaults (y is the BASELINE, 600 weight, centered).
 * Port of Text in src/videos/Day05/rebuild-v1/.../shared.tsx.
 */
export function SvgText({
  x,
  y,
  children,
  size = 25,
  color = C.text,
  weight = 600,
  anchor = 'middle',
  opacity = 1,
  letterSpacing,
  baseline,
  family,
}) {
  if (opacity <= 0.001) return null;
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      letterSpacing={letterSpacing}
      dominantBaseline={baseline}
      fontFamily={family}
      opacity={opacity < 1 ? opacity : undefined}
    >
      {children}
    </text>
  );
}

/**
 * A centered block of 1–3 short lines; `y` is the vertical middle of the block.
 * Port of Multiline in Day05 shared.tsx (line height 33 at 24 px).
 */
export function Multiline({
  x,
  y,
  lines,
  size = 24,
  lineHeight = 33,
  color = C.text,
  weight = 600,
  firstWeight,
  anchor = 'middle',
  opacity = 1,
}) {
  if (opacity <= 0.001 || !lines || lines.length === 0) return null;
  const y0 = y - ((lines.length - 1) * lineHeight) / 2;
  return (
    <text
      x={x}
      y={y0}
      fill={color}
      fontSize={size}
      fontWeight={weight}
      textAnchor={anchor}
      opacity={opacity < 1 ? opacity : undefined}
    >
      {lines.map((line, i) => (
        <tspan key={`${i}-${line}`} x={x} dy={i === 0 ? 0 : lineHeight} fontWeight={i === 0 && firstWeight ? firstWeight : undefined}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * One line that mixes colors/weights — e.g. a sentence whose key word turns red.
 * spans: [{ text, color?, weight? }]
 */
export function RichText({ x, y, spans, size = 32, weight = 600, color = C.text, anchor = 'middle', opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <text
      x={x}
      y={y}
      fontSize={size}
      fontWeight={weight}
      fill={color}
      textAnchor={anchor}
      opacity={opacity < 1 ? opacity : undefined}
    >
      {spans.map((s, i) => (
        <tspan key={`${i}-${s.text}`} fill={s.color ?? color} fontWeight={s.weight ?? weight}>
          {s.text}
        </tspan>
      ))}
    </text>
  );
}
