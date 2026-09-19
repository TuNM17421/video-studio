import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { drawOn } from '../../lib/paths.js';
import { SvgText } from '../text/Text.jsx';

function Side({ x, y, w, h, label, title, sub, color, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={color} strokeWidth={3} />
      <SvgText x={x + 40} y={y + 50} size={17} weight={700} anchor="start" color={color}>
        {label}
      </SvgText>
      <SvgText x={x + 40} y={y + 118} size={24} weight={700} anchor="start">
        {title}
      </SvgText>
      {sub ? (
        <SvgText x={x + 40} y={y + 160} size={21} anchor="start" color={C.textMuted}>
          {sub}
        </SvgText>
      ) : null}
    </g>
  );
}

/**
 * AnalogyBridge — an everyday situation beside the concept it explains, joined by an arc drawn over the
 * top ("giống như"). Left card: accent stroke, label ĐỜI THƯỜNG. Right card: red stroke, label KHÁI NIỆM —
 * the concept is what the lesson is about, so it carries the emphasis. Both cards are bgAlt, radius 22,
 * 3 px stroke; title 24/700, one muted 21/600 line.
 * `reveal` (0–1) fades the concept card in; `bridge` (0–1) draws the 5 px accent arc from the everyday
 * card to the concept, and the "GIỐNG NHƯ" label above the arc's apex fades in over its last third. Show the everyday card first, then the concept, then
 * draw the bridge when the narration says the two are alike. The arc rises 105 px above `y`, so keep
 * `y` ≥ 400 to leave the header zone clear.
 */
export function AnalogyBridge({
  x,
  y,
  w = 1320,
  h = 220,
  everyday,
  concept,
  reveal = 1,
  bridge = 1,
  everydayLabel = 'ĐỜI THƯỜNG',
  conceptLabel = 'KHÁI NIỆM',
  bridgeLabel = 'GIỐNG NHƯ',
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const bw = (w - 220) / 2;
  const rx = x + w - bw;
  const ax = x + bw / 2;
  const bx = rx + bw / 2;
  const lift = 140;
  const d = `M ${ax} ${y} C ${ax} ${y - lift} ${bx} ${y - lift} ${bx} ${y}`;
  const b = clamp01(bridge);
  const labelO = clamp01((b - 0.66) / 0.34);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {b > 0.001 ? (
        <path d={d} fill="none" stroke={C.accent} strokeWidth={5} strokeLinecap="round" {...drawOn(d, b)} />
      ) : null}
      <SvgText x={x + w / 2} y={y - lift * 0.75 - 22} size={17} weight={700} color={C.accent} opacity={labelO}>
        {bridgeLabel}
      </SvgText>
      <Side x={x} y={y} w={bw} h={h} label={everydayLabel} title={everyday.title} sub={everyday.sub} color={C.accent} />
      <Side x={rx} y={y} w={bw} h={h} label={conceptLabel} title={concept.title} sub={concept.sub} color={C.red} opacity={clamp01(reveal)} />
    </g>
  );
}
