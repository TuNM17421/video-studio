import React, { useId } from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { appear, clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { Icon, ICONS } from '../icons/Icons.jsx';
import { LineIcon, LINE_ICONS } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** tone → [stroke, soft fill]: a ROLE_OF name ('input','process','output','check','memory'…), a C token name, or a hex. */
function toneOf(tone) {
  if (!tone) return [C.accent, C.dotInactive];
  if (ROLE_OF[tone]) return ROLE_OF[tone];
  if (tone === 'red' || tone === C.red) return [C.red, C.redSoft];
  const hex = C[tone] || tone;
  return [hex, alpha(hex, 0.12)];
}

const DEFAULT_HEADER_W = 220;

/** Box of lane `index` (the body area right of the header column), in scene px. */
export function laneBox(props, index) {
  const { x, y, w, h, lanes = [], headerW = DEFAULT_HEADER_W } = props;
  const n = Math.max(1, lanes.length);
  const lh = h / n;
  return { x: x + headerW, y: y + lh * index, w: w - headerW, h: lh };
}

/** Vertical center of lane `index` — place cards at laneY(p, i) - cardH / 2. */
export function laneY(props, index) {
  const b = laneBox(props, index);
  return b.y + b.h / 2;
}

/**
 * Swimlane — horizontal lanes (3–5) that say WHO does each step: NGƯỜI DÙNG · ỨNG DỤNG · MÔ HÌNH ·
 * DỮ LIỆU · CÔNG CỤ. Cards and Flows placed in lanes (via laneBox / laneY) read as a sequence diagram.
 *
 * Anatomy: radius-22 outer frame (3 px dotInactive) · header column `headerW` px on the left per lane:
 * icon (LineIcon or hand Icon name) + 17/700 uppercase label (+ optional lowercase `sub`) in the lane's
 * role `tone`, with a 6 px tone strip at the left edge · lane bodies alternate bg / bgAlt, separated by
 * 2 px dotInactive rules · children drawn on top (place them with laneBox()).
 *
 * States: `activeLane` (index) → that lane gets a red 3 px outline, a faint red tint and a red label;
 * scale it with `activeLevel` 0–1 (drive with pulse()/appear()). Other lanes stay neutral.
 *
 * Timing: with `frame`, lane i reveals over 24 f from `start + i * per` (default per 10). Without
 * `frame` the lanes render settled. Children are not faded — time them yourself.
 */
export function Swimlane({
  x,
  y,
  w,
  h,
  lanes = [],
  headerW = DEFAULT_HEADER_W,
  activeLane,
  activeLevel = 1,
  frame,
  start = 0,
  per = 10,
  opacity = 1,
  children,
}) {
  const clipId = useId().replace(/:/g, '');
  if (opacity <= 0.001 || lanes.length === 0) return null;
  const n = lanes.length;
  const lh = h / n;
  const reveal = (i) => (frame == null ? 1 : appear(frame, start + i * per));
  const act = clamp01(activeLevel);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={w} height={h} rx={22} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {lanes.map((lane, i) => {
          const o = reveal(i);
          if (o <= 0.001) return null;
          const ly = y + i * lh;
          const [stroke, soft] = toneOf(lane.tone);
          const isActive = activeLane === i && act > 0.001;
          return (
            <g key={`lane-${i}`} opacity={o < 1 ? o : undefined}>
              <rect x={x} y={ly} width={w} height={lh} fill={i % 2 === 0 ? C.bg : C.bgAlt} />
              <rect x={x} y={ly} width={headerW} height={lh} fill={lane.tone ? soft : C.bgAlt} opacity={lane.tone ? 0.55 : 1} />
              <rect x={x} y={ly} width={6} height={lh} fill={stroke} />
              {isActive ? <rect x={x + headerW} y={ly} width={w - headerW} height={lh} fill={alpha('red', 0.05 * act)} /> : null}
              {i > 0 ? <line x1={x} y1={ly} x2={x + w} y2={ly} stroke={C.dotInactive} strokeWidth={2} /> : null}
            </g>
          );
        })}
        <line x1={x + headerW} y1={y} x2={x + headerW} y2={y + h} stroke={C.dotInactive} strokeWidth={3} />
      </g>
      <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={C.dotInactive} strokeWidth={3} />
      {lanes.map((lane, i) => {
        const o = reveal(i);
        if (o <= 0.001) return null;
        const ly = y + i * lh;
        const cx = x + 6 + (headerW - 6) / 2;
        const cy = ly + lh / 2;
        const [stroke] = toneOf(lane.tone);
        const isActive = activeLane === i && act > 0.001;
        const color = isActive && act > 0.45 ? C.red : stroke;
        const hasIcon = Boolean(lane.icon);
        const compact = lh < 110;
        const iconSize = compact ? 26 : 34;
        const block = (hasIcon && !compact ? iconSize + 10 : 0) + 17 + (lane.sub ? 24 : 0);
        const top = cy - block / 2;
        const labelY = top + (hasIcon && !compact ? iconSize + 10 : 0) + 14;
        const IconCmp = LINE_ICONS[lane.icon] ? LineIcon : ICONS[lane.icon] ? Icon : null;
        const inline = hasIcon && compact;
        const labelW = textWidth(lane.label, 17, 700) + lane.label.length * 1.2;
        const groupX = cx - (iconSize + 8 + labelW) / 2;
        const labelX = inline ? groupX + iconSize + 8 : cx;
        return (
          <g key={`head-${i}`} opacity={o < 1 ? o : undefined}>
            {IconCmp ? (
              <IconCmp
                name={lane.icon}
                x={inline ? groupX + iconSize / 2 : cx}
                y={inline ? labelY - 6 : top + iconSize / 2}
                size={iconSize}
                color={color}
              />
            ) : null}
            <SvgText x={labelX} y={labelY} size={17} weight={700} color={color} letterSpacing={1.2} anchor={inline ? 'start' : 'middle'}>
              {lane.label}
            </SvgText>
            {lane.sub ? (
              <SvgText x={cx} y={labelY + 24} size={17} weight={500} color={C.textMuted}>
                {lane.sub}
              </SvgText>
            ) : null}
            {isActive ? (
              <rect
                x={x + headerW + 6}
                y={ly + 6}
                width={w - headerW - 12}
                height={lh - 12}
                rx={16}
                fill="none"
                stroke={C.red}
                strokeWidth={3}
                opacity={act < 1 ? act : undefined}
              />
            ) : null}
          </g>
        );
      })}
      {children}
    </g>
  );
}
