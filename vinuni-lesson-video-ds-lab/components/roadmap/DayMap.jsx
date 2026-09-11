import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { Flow } from '../flow/Flow.jsx';
import { Multiline, SvgText } from '../text/Text.jsx';

/*
 * Day map for day-overview videos ("bản đồ ngày học"): three zone cards — the day's three questions —
 * each holding numbered parts. One map persists through the whole video and lights up the part being
 * introduced.
 *   dock 0 → full: three large cards (480×300) centered in the content zone, zone title + question
 *   dock 1 → strip: a compact row (540×96) under the header, part pills, the active part in red
 * Animate `dock` with smooth() at the first/last scene so the map moves between layouts across cuts.
 */
const FULL = { x0: 180, step: 540, y: 420, w: 480, h: 300, r: 26 };
const STRIP = { x0: 120, step: 570, y: 288, w: 540, h: 96, r: 18 };
const mix = (a, b, t) => a + (b - a) * t;

/** Rectangle of zone `i` at a given dock amount (0 full → 1 strip). Use it to anchor connectors. */
export function dayMapRect(i, dock = 0) {
  const t = clamp01(dock);
  return {
    x: mix(FULL.x0 + i * FULL.step, STRIP.x0 + i * STRIP.step, t),
    y: mix(FULL.y, STRIP.y, t),
    w: mix(FULL.w, STRIP.w, t),
    h: mix(FULL.h, STRIP.h, t),
  };
}

/** Bottom edge of the docked strip — scene content goes below it (y ≥ 410). */
export const DAYMAP_STRIP_BOTTOM = STRIP.y + STRIP.h;

function PartPill({ x, y, w, label, state, glow = 0, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const h = 40;
  const fill = state === 'active' ? C.redSoft : state === 'done' ? C.bg : C.dotInactive;
  const stroke = state === 'active' ? C.red : state === 'done' ? C.accent : 'none';
  const color = state === 'active' ? C.red : state === 'done' ? C.text : C.textMuted;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {glow > 0.001 ? <rect x={x - 6} y={y - 6} width={w + 12} height={h + 12} rx={26} fill="none" stroke={C.red} strokeWidth={3} opacity={glow * 0.8} /> : null}
      <rect x={x} y={y} width={w} height={h} rx={20} fill={fill} stroke={stroke} strokeWidth={stroke === 'none' ? undefined : 2.5} />
      <SvgText x={x + w / 2} y={y + 26} size={17} weight={700} color={color}>
        {label}
      </SvgText>
    </g>
  );
}

export function DayMap({
  zones,
  dock = 0,
  activePart = -1,
  visited,
  reveal,
  pulses,
  arrows,
  activeGlow = 0,
  opacity = 1,
}) {
  if (!zones || opacity <= 0.001) return null;
  const d = clamp01(dock);
  const fullness = clamp01(1 - d * 1.8);
  const stripness = clamp01((d - 0.5) / 0.5);
  const doneUpTo = visited ?? activePart - 1;
  const rects = zones.map((_, i) => dayMapRect(i, d));
  let partIndex = 0;
  const cards = zones.map((zone, i) => {
    const r = rects[i];
    const parts = (zone.parts || []).map((p, k) => ({ ...p, index: partIndex + k }));
    partIndex += parts.length;
    const shown = reveal ? clamp01(reveal[i]) : 1;
    if (shown <= 0.001) return null;
    const upcoming = activePart >= 0 && parts.length > 0 && parts.every((p) => p.index > activePart && p.index > doneUpTo);
    const zoneOpacity = shown * (upcoming ? 1 - 0.42 * stripness : 1);
    const hot = pulses ? clamp01(pulses[i]) : 0;
    const pillW = (r.w - 44 - 12) / 2;
    return (
      <g key={zone.title} opacity={zoneOpacity < 1 ? zoneOpacity : undefined}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={mix(FULL.r, STRIP.r, d)} fill={C.bgAlt} stroke={C.accent} strokeWidth={3} />
        {hot > 0.001 ? (
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={mix(FULL.r, STRIP.r, d)} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={hot * 0.72} />
        ) : null}
        <SvgText
          x={r.x + mix(30, 22, d)}
          y={r.y + mix(52, 30, d)}
          size={mix(20, 17, d)}
          weight={700}
          anchor="start"
          color={hot > 0.45 ? C.red : C.accent}
          letterSpacing={mix(1.6, 1, d)}
        >
          {zone.title}
        </SvgText>
        {fullness > 0.001 ? (
          <Multiline
            x={r.x + r.w / 2}
            y={r.y + r.h / 2 + 22}
            lines={zone.question}
            size={38}
            lineHeight={50}
            weight={700}
            color={hot > 0.45 ? C.red : C.text}
            opacity={fullness}
          />
        ) : null}
        {stripness > 0.001
          ? parts.map((p, k) => {
              const state = p.index === activePart ? 'active' : p.index <= doneUpTo ? 'done' : 'todo';
              return (
                <PartPill
                  key={p.label}
                  x={r.x + 22 + k * (pillW + 12)}
                  y={r.y + 44}
                  w={pillW}
                  label={`${p.n} · ${p.label}`}
                  state={state}
                  glow={state === 'active' ? activeGlow : 0}
                  opacity={stripness}
                />
              );
            })
          : null}
      </g>
    );
  });
  const links = [];
  if (fullness > 0.001) {
    for (let i = 0; i < zones.length - 1; i++) {
      const a = rects[i];
      const b = rects[i + 1];
      const p = arrows ? clamp01(arrows[i]) : 1;
      if (p <= 0.001) continue;
      links.push(
        <Flow
          key={`link-${i}`}
          points={[{ x: a.x + a.w + 6, y: a.y + a.h / 2 }, { x: b.x - 4, y: b.y + b.h / 2 }]}
          progress={p}
          showParticle={false}
          opacity={fullness}
        />,
      );
    }
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {links}
      {cards}
    </g>
  );
}
