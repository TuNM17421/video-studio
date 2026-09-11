import React from 'react';
import { C } from '../../lib/tokens.js';
import { CLAMP, interpolate } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { mixColor } from '../../lib/paths.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** Colors per variant: [fill, stroke, text, pressed fill]. */
const VARIANTS = {
  primary: [C.accent, 'none', C.bg, C.accentStrong],
  secondary: [C.bg, C.accent, C.accent, C.dotInactive],
  danger: [C.red, 'none', C.bg, mixColor(C.red, C.text, 0.3)],
  ghost: ['none', 'none', C.accent, C.dotInactive],
};

/** Default width for a label (+ optional icon) at `size`: text + 32 px padding each side. */
export const uiButtonWidth = (label, { icon, size = 20 } = {}) =>
  Math.round(textWidth(label, size, 700) * 1.05 + (icon ? size + 14 : 0) + 64);

/**
 * A generic app button mock (SVG) — for mock screens, not a real product's control.
 * Anatomy: radius 14 rect (h default 64) · optional LineIcon (size ≈ label size + 6) left of the label ·
 * label 20 / 700 (keep app-button copy short: "Gửi thư", "CHUYỂN KHOẢN", "Thử lại").
 * variant: 'primary' (accent fill, white text) · 'secondary' (white fill, 2.5 px accent stroke) ·
 * 'danger' (red fill — irreversible / risky action) · 'ghost' (text only).
 * state: 'default' · 'pressed' (darker fill, shrinks to 96 %) · 'disabled' (dotInactive fill, muted text) ·
 * 'locked' (disabled look + red lock badge on the top-right corner — the action is blocked by a rule).
 * Timing: with `frame` + `pressAt`, a press plays 0→1→0 over 12 frames (peak at +4) — pair with a
 * Cursor click at the same frame. Static: `state="pressed"`. Not a data component — no MINH HỌA tag
 * (the enclosing BrowserFrame carries it).
 * @category ui
 */
export function UIButton({
  x,
  y,
  w,
  h = 64,
  label,
  variant = 'primary',
  state = 'default',
  icon,
  size = 20,
  frame,
  pressAt,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const width = w ?? uiButtonWidth(label, { icon, size });
  const off = state === 'disabled' || state === 'locked';
  const [fill0, stroke0, text0, pressFill] = VARIANTS[variant] || VARIANTS.primary;
  let p = state === 'pressed' ? 1 : 0;
  if (!off && frame != null && pressAt != null) {
    p = Math.max(p, interpolate(frame, [pressAt, pressAt + 4, pressAt + 12], [0, 1, 0], CLAMP));
  }
  let fill = fill0;
  let stroke = stroke0;
  let color = text0;
  if (off) {
    fill = variant === 'ghost' ? 'none' : C.dotInactive;
    stroke = variant === 'secondary' ? C.dotInactive : 'none';
    color = C.textMuted;
  } else if (p > 0) {
    fill = fill0 === 'none' ? (p > 0.02 ? mixColor(C.bg, pressFill, p) : 'none') : mixColor(fill0, pressFill, p);
  }
  const s = 1 - 0.04 * p;
  const cx = x + width / 2;
  const cy = y + h / 2;
  const iconS = size + 6;
  const tw = textWidth(label, size, 700) * 1.05;
  const contentW = tw + (icon ? iconS + 10 : 0);
  const left = cx - contentW / 2;
  return (
    <g opacity={opacity < 1 ? opacity : undefined} transform={s !== 1 ? `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})` : undefined}>
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={14}
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke === 'none' ? undefined : 2.5}
        opacity={off ? 0.85 : undefined}
      />
      {icon ? <LineIcon name={icon} x={left + iconS / 2} y={cy} size={iconS} color={color} strokeWidth={1.6} /> : null}
      <SvgText x={icon ? left + iconS + 10 + tw / 2 : cx} y={cy + size * 0.36} size={size} weight={700} color={color}>
        {label}
      </SvgText>
      {state === 'locked' ? (
        <g>
          <circle cx={x + width - 4} cy={y + 4} r={19} fill={C.bg} stroke={C.red} strokeWidth={2.5} />
          <LineIcon name="lock" x={x + width - 4} y={y + 3} size={22} color={C.red} strokeWidth={1.7} />
        </g>
      ) : null}
    </g>
  );
}
