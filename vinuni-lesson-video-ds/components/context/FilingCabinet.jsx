import React, { useId } from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { clamp01, smooth } from '../../lib/motion.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { DocumentSheet } from '../figures/Figures.jsx';

const HEAD = 64;
const PAD = 20;
const GAP = 12;

/** Front box {x, y, w, h} of drawer `i` (closed position) — for connectors. */
export function cabinetDrawer({ x, y, w, h, drawers = [] }, i) {
  const n = Math.max(1, drawers.length);
  const dh = (h - HEAD - PAD - (n - 1) * GAP) / n;
  return { x: x + PAD, y: y + HEAD + i * (dh + GAP), w: w - 2 * PAD, h: dh };
}

/**
 * FilingCabinet — the external store (tủ hồ sơ / kho dữ liệu / bộ nhớ ngoài). Anatomy: a bgAlt
 * cabinet (radius 22, 3 px accent stroke) · header (LineIcon archive — or `icon` e.g. 'database' —
 * + 17/700 label) · N closed drawers (bg fill, 2 px accent stroke, radius 12, 21/600 label left,
 * a rounded handle right). The `selected` drawer is pulled out toward the viewer (front 28 px wider,
 * 12 px lower, red; its open top shows as an amber memory-soft trapezoid), the other drawers dim to
 * 45 %, and a DocumentSheet rises out of the drawer, then moves to the right of the cabinet
 * (`docLabel` under it).
 * Timing: with `frame` + `at`, the drawer opens over at…at+24 (smooth), the page rises over
 * at+16…at+32 and slides out over at+32…at+56. Without `frame`: settled (drawer open, page outside).
 * No `selected` → all closed. Reserve docW + 60 px right of the cabinet.
 * @category context
 */
export function FilingCabinet({
  x,
  y,
  w,
  h,
  label = 'KHO TÀI LIỆU',
  icon = 'archive',
  drawers = [],
  selected,
  frame,
  at,
  showDoc = true,
  docLabel,
  docW = 150,
  opacity = 1,
}) {
  const clipId = `fc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (opacity <= 0.001) return null;
  const hasSel = selected != null && selected >= 0 && selected < drawers.length;
  const clock = frame != null && at != null;
  const open = hasSel ? (clock ? smooth(frame, at, at + 24) : 1) : 0;
  const up = hasSel && showDoc ? (clock ? smooth(frame, at + 16, at + 32) : 1) : 0;
  const out = hasSel && showDoc ? (clock ? smooth(frame, at + 32, at + 56) : 1) : 0;
  const dim = 1 - 0.55 * open;
  const front = (i, b, hot) => (
    <g key={`d${i}`} opacity={!hot && dim < 1 ? dim : undefined}>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={12} fill={hot ? C.redSoft : C.bg} stroke={hot ? C.red : C.accent} strokeWidth={hot ? 3 : 2} />
      <SvgText x={b.x + 22} y={b.y + b.h / 2 + 7.5} size={21} weight={hot ? 700 : 600} anchor="start" color={hot ? C.red : C.text}>
        {drawers[i]}
      </SvgText>
      <rect x={b.x + b.w - 62} y={b.y + b.h / 2 - 5} width={40} height={10} rx={5} fill={hot ? C.red : C.accent} />
    </g>
  );
  const sb = hasSel ? cabinetDrawer({ x, y, w, h, drawers }, selected) : null;
  // pulled-out front: comes toward the viewer (wider, lower); the open top shows as a trapezoid
  const fb = hasSel ? { x: sb.x - 14 * open, y: sb.y + 12 * open, w: sb.w + 28 * open, h: sb.h } : null;
  const docH = (168 / 215) * docW;
  const inX = x + w / 2 - docW / 2;
  const inY = fb ? fb.y + 8 - (docH * 0.5 + 12) * up : 0;
  const endX = x + w + 36;
  const endY = sb ? sb.y + sb.h / 2 - docH / 2 - 16 : 0;
  const dx = inX + (endX - inX) * out;
  const dy = inY + (endY - inY) * out;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={C.accent} strokeWidth={3} />
      <LineIcon name={icon} x={x + 40} y={y + 34} size={30} color={C.accentStrong} strokeWidth={1.5} />
      <SvgText x={x + 66} y={y + 40} size={17} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1.2}>
        {label}
      </SvgText>
      {drawers.map((_, i) => (i === selected && hasSel ? null : front(i, cabinetDrawer({ x, y, w, h, drawers }, i), false)))}
      {hasSel ? (
        <g>
          {open > 0.01 ? (
            <path
              d={`M ${sb.x + 10} ${sb.y - 10 * open} H ${sb.x + sb.w - 10} L ${fb.x + fb.w} ${fb.y + 2} H ${fb.x} Z`}
              fill={ROLE.amberSoft}
              stroke={ROLE.amber}
              strokeWidth={2}
              strokeLinejoin="round"
            />
          ) : null}
          {up > 0.001 ? (
            <g clipPath={out < 0.999 ? `url(#${clipId})` : undefined}>
              <DocumentSheet x={dx} y={dy} w={docW} selected lines={3} opacity={clamp01(up * 3)} />
            </g>
          ) : null}
          {out < 0.999 ? (
            <clipPath id={clipId}>
              {/* while inside the drawer the page is hidden below the front's top edge */}
              <rect x={x - 20} y={y - 400} width={w + docW + 400} height={fb.y + 4 - (y - 400)} />
              <rect x={x + w + 4} y={y - 400} width={docW + 400} height={h + 800} />
            </clipPath>
          ) : null}
          {front(selected, fb, true)}
          {docLabel && out > 0.5 ? (
            <SvgText x={endX + docW / 2} y={endY + docH + 34} size={20} weight={700} color={C.red} opacity={clamp01((out - 0.5) * 2)}>
              {docLabel}
            </SvgText>
          ) : null}
        </g>
      ) : null}
    </g>
  );
}
