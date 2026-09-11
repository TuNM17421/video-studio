import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { Multiline, SvgText } from '../text/Text.jsx';

/** Largest size ≤ `size` (never below 16 px) at which `text` fits in `room` px. */
const fitSize = (text, size, room, weight = 700) => {
  const w = textWidth(text, size, weight);
  return w <= room ? size : Math.max(16, Math.floor((size * room) / w));
};

/*
 * Story figures ported from the Day02 rebuild-v1 videos (src/videos/Day02/rebuild-v1/video-01-problem-first/
 * visuals.tsx): a person, a document, a speech bubble, a stopwatch — plus a form sheet with empty
 * answer slots. Use them for self-authored situations (learner, observer, user) and label the scene
 * MINH HỌA.
 */

/** Person in a bgAlt circle (r 66 by default): head + shoulders; optional name and role below. */
export function Person({ x, y, r = 66, name, role, active = false, color, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const k = r / 66;
  const c = color ?? (active ? C.red : C.accent);
  const nameSize = Math.round(Math.max(22, Math.min(30, 30 * k)));
  const roleSize = Math.round(Math.max(18, Math.min(22, 22 * k)));
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <circle cx={x} cy={y} r={r} fill={C.bgAlt} stroke={c} strokeWidth={4} />
      <circle cx={x} cy={y - 18 * k} r={18 * k} fill={c} />
      <path d={`M ${x - 34 * k} ${y + 35 * k} Q ${x} ${y} ${x + 34 * k} ${y + 35 * k}`} fill="none" stroke={c} strokeLinecap="round" strokeWidth={12 * k} />
      {name ? (
        <SvgText x={x} y={y + r + 12 + nameSize} size={nameSize} weight={700} color={c}>
          {name}
        </SvgText>
      ) : null}
      {role ? (
        <SvgText x={x} y={y + r + 22 + nameSize + roleSize} size={roleSize} color={C.textMuted}>
          {role}
        </SvgText>
      ) : null}
    </g>
  );
}

/** Marker-band colors for DocumentSheet `highlight` tones: [band fill, text color]. */
const MARK = {
  red: [C.redSoft, C.red],
  accent: [C.dotInactive, C.accentStrong],
  amber: [ROLE.amberSoft, C.text],
};

/**
 * Folded-corner page (215×168 at scale 1) with text lines; `fill` 0–1 draws the lines progressively.
 * Placeholder mode (default): `lines` is a NUMBER of grey bars (first bar colored).
 * Text mode: `lines` is an ARRAY of strings → real text rows (`size` px, row pitch 1.6 × size), the page
 * grows taller to fit (`h` overrides). In both modes: `highlight` [{ line, tone }] paints a marker band
 * behind a row (red · accent · amber), `strike` [i] draws a red strike-through (injected sentence,
 * fabricated claim), `revealLines` (number, may be fractional — drive with countUp(frame, …)) shows only
 * the first N rows, the partial one fading in.
 */
export function DocumentSheet({
  x,
  y,
  w = 215,
  h: hProp,
  label,
  detail,
  selected = false,
  fill = 1,
  lines = 3,
  size = 20,
  highlight,
  strike,
  revealLines,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const k = w / 215;
  const textMode = Array.isArray(lines);
  const n = textMode ? lines.length : lines;
  const c = selected ? C.red : C.accent;
  const f = clamp01(fill);
  const marks = new Map((highlight || []).map((m) => [m.line, MARK[m.tone] || MARK.amber]));
  const struck = new Set(strike || []);
  const rowOpacity = (i) => (revealLines == null ? 1 : clamp01(revealLines - i));
  const rows = [];
  let h;
  let fold;
  if (textMode) {
    fold = Math.min(45 * k, 52);
    const pitch = Math.round(size * 1.6);
    const top = Math.max(fold * 0.55, 26) + 6;
    const padX = Math.max(24, Math.round(22 * Math.min(k, 1.4)));
    h = hProp ?? Math.max(168, top + n * pitch + 26);
    for (let i = 0; i < n; i++) {
      const o = rowOpacity(i) * clamp01(f * n - i);
      if (o <= 0.001) continue;
      const text = lines[i];
      const ry = y + top + i * pitch;
      const tw = Math.min(textWidth(text, size, 700) * 1.06, w - 2 * padX + 8);
      const mk = marks.get(i);
      const cut = struck.has(i);
      rows.push(
        <g key={i} opacity={o < 1 ? o : undefined}>
          {mk ? <rect x={x + padX - 8} y={ry + 2} width={tw + 16} height={pitch - 4} rx={8} fill={mk[0]} /> : null}
          <SvgText x={x + padX} y={ry + pitch / 2 + size * 0.36} size={size} weight={600} anchor="start" color={cut ? C.textMuted : mk ? mk[1] : C.text}>
            {text}
          </SvgText>
          {cut ? <path d={`M ${x + padX - 6} ${ry + pitch / 2} H ${x + padX + tw + 6}`} stroke={C.red} strokeWidth={3.5} strokeLinecap="round" /> : null}
        </g>,
      );
    }
  } else {
    fold = 45 * k;
    h = hProp ?? 168 * k;
    for (let i = 0; i < n; i++) {
      const full = (i === n - 1 ? 105 : 145) * k;
      const t = clamp01(f * n - i);
      const o = rowOpacity(i);
      if (t <= 0 || o <= 0.001) continue;
      const ry = y + (63 + i * 27) * k;
      const mk = marks.get(i);
      const cut = struck.has(i);
      rows.push(
        <g key={i} opacity={o < 1 ? o : undefined}>
          {mk ? <rect x={x + 22 * k} y={ry - 7 * k} width={full * t + 16 * k} height={24 * k} rx={6 * k} fill={mk[0]} /> : null}
          <rect x={x + 30 * k} y={ry} width={full * t} height={10 * k} rx={5 * k} fill={cut ? C.redSoft : mk ? mk[1] : i === 0 ? c : C.dotInactive} />
          {cut ? <path d={`M ${x + 24 * k} ${ry + 5 * k} H ${x + 36 * k + full * t}`} stroke={C.red} strokeWidth={3} strokeLinecap="round" /> : null}
        </g>,
      );
    }
  }
  const lk = textMode ? 1 : Math.max(0.8, k);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path d={`M ${x} ${y} H ${x + w - fold} L ${x + w} ${y + fold} V ${y + h} H ${x} Z`} fill={textMode ? C.bg : C.bgAlt} stroke={c} strokeLinejoin="round" strokeWidth={3} />
      <path d={`M ${x + w - fold} ${y} V ${y + fold} H ${x + w}`} fill="none" stroke={c} strokeWidth={3} />
      {rows}
      {label ? (
        <SvgText x={x + w / 2} y={y + h + 42 * lk} size={24} weight={700} color={c}>
          {label}
        </SvgText>
      ) : null}
      {detail ? (
        <SvgText x={x + w / 2} y={y + h + 72 * lk} size={20} color={C.textMuted}>
          {detail}
        </SvgText>
      ) : null}
    </g>
  );
}

/**
 * Form sheet ("phiếu"): header label + rows of question → answer slot. A row without `value` shows an
 * empty dashed slot (nothing measured yet). `reveal[i]` fades rows in; `active` highlights one row.
 */
export function FormSheet({ x, y, w, title, rows, rowH = 76, labelW, reveal, active = -1, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const headH = 56;
  const h = headH + rows.length * rowH + 18;
  const lw = labelW ?? Math.round(w * 0.48);
  const slotW = w - 56 - lw;
  // One label size (and one value size) for every row, shrunk only when some row would overflow its column.
  const labelSize = Math.min(...rows.map((row) => fitSize(row.label, 23, lw - 14)));
  const valueSize = Math.min(20, ...rows.filter((row) => row.value).map((row) => fitSize(row.value, 20, slotW - 36, 600)));
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={18} fill={C.bg} stroke={C.accent} strokeWidth={3} />
      <path d={`M ${x + 1.5} ${y + headH} H ${x + w - 1.5}`} stroke={C.dotInactive} strokeWidth={3} />
      {title ? (
        <SvgText x={x + 28} y={y + 36} size={18} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2}>
          {title}
        </SvgText>
      ) : null}
      {rows.map((row, i) => {
        const o = reveal ? clamp01(reveal[i]) : 1;
        if (o <= 0.001) return null;
        const ry = y + headH + 9 + i * rowH;
        const hot = i === active;
        const slotX = x + 28 + lw;
        return (
          <g key={row.label} opacity={o < 1 ? o : undefined}>
            {hot ? <rect x={x + 10} y={ry + 4} width={w - 20} height={rowH - 8} rx={12} fill={C.redSoft} /> : null}
            <SvgText x={x + 28} y={ry + rowH / 2 + Math.round(labelSize * 0.35)} size={labelSize} weight={700} anchor="start" color={hot ? C.red : C.text}>
              {row.label}
            </SvgText>
            <rect
              x={slotX}
              y={ry + 14}
              width={slotW}
              height={rowH - 28}
              rx={10}
              fill={row.value ? C.bgAlt : C.bg}
              stroke={hot ? C.red : C.accent}
              strokeWidth={2}
              strokeDasharray={row.value ? undefined : '10 8'}
            />
            {row.value ? (
              <SvgText x={slotX + 18} y={ry + rowH / 2 + Math.round(valueSize * 0.35)} size={valueSize} weight={600} anchor="start">
                {row.value}
              </SvgText>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** Speech bubble with a tail (bottom-left or bottom-right). `lines` for 1–2 centered lines. */
export function SpeechBubble({ x, y, w, h = 88, label, lines, tone = 'accent', tail = 'left', size = 24, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const c = tone === 'red' ? C.red : C.accent;
  const r = 18;
  const tx = tail === 'left' ? x + 55 : x + w - 55;
  const tipX = tail === 'left' ? x + 25 : x + w - 25;
  const backX = tail === 'left' ? x + 31 : x + w - 31;
  const d =
    tail === 'left'
      ? `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${tx} L ${tipX} ${y + h + 26} L ${backX} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
      : `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${backX} L ${tipX} ${y + h + 26} L ${tx} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <path d={d} fill={tone === 'red' ? C.redSoft : C.bgAlt} stroke={c} strokeWidth={3} strokeLinejoin="round" />
      {lines ? (
        <Multiline x={x + w / 2} y={y + h / 2 + size * 0.36} lines={lines} size={size} lineHeight={Math.round(size * 1.35)} color={c} weight={700} />
      ) : (
        <SvgText x={x + w / 2} y={y + h / 2 + size * 0.36} size={size} weight={700} color={c}>
          {label}
        </SvgText>
      )}
    </g>
  );
}

/**
 * Stopwatch (r 54): ring + crown; the hand sweeps with `sweep` (0–1 = one turn) and a red-soft wedge
 * shows the elapsed share. No digits — use it for "measure the time" without inventing numbers.
 */
export function Stopwatch({ x, y, r = 54, sweep = 0, label, color = C.red, wedge = true, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const s = clamp01(sweep);
  const angle = -Math.PI / 2 + s * Math.PI * 2;
  const R = r - 9;
  const hx = x + Math.cos(angle) * (r - 16);
  const hy = y + Math.sin(angle) * (r - 16);
  let wedgePath = null;
  if (wedge && s > 0.002) {
    const ex = x + Math.cos(angle) * R;
    const ey = y + Math.sin(angle) * R;
    wedgePath =
      s >= 0.999
        ? <circle cx={x} cy={y} r={R} fill={C.redSoft} />
        : <path d={`M ${x} ${y} L ${x} ${y - R} A ${R} ${R} 0 ${s > 0.5 ? 1 : 0} 1 ${ex} ${ey} Z`} fill={C.redSoft} />;
  }
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x - 9} y={y - r - 16} width={18} height={12} rx={4} fill={color} />
      <circle cx={x} cy={y} r={r} fill={C.bg} stroke={color} strokeWidth={4} />
      {wedgePath}
      <path d={`M ${x} ${y} L ${hx} ${hy}`} stroke={color} strokeWidth={5} strokeLinecap="round" />
      <circle cx={x} cy={y} r={6} fill={color} />
      {label ? (
        <SvgText x={x} y={y + r + 40} size={24} weight={700} color={color}>
          {label}
        </SvgText>
      ) : null}
    </g>
  );
}
