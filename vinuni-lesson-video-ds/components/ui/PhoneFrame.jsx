import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { graphemes } from '../../lib/text.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** Status-bar height for a frame of width `w` (compact under 300 px, like BrowserFrame's bar). */
const statusBarHeight = (w) => (w < 300 ? 40 : 48);

/** Fixed corner radius — large, iPhone-like, regardless of `w` (device shape, not a scaling knob). */
const CORNER_R = 44;

/** Trim `str` with an ellipsis so it fits `maxW` px at `size`/`weight` (grapheme-safe). */
function fitLine(str, maxW, size, weight) {
  const s = String(str ?? '');
  if (textWidth(s, size, weight) <= maxW) return s;
  const g = graphemes(s);
  let n = g.length;
  while (n > 0 && textWidth(g.slice(0, n).join('') + '…', size, weight) > maxW) n--;
  return n > 0 ? g.slice(0, n).join('') + '…' : '';
}

/** Four ascending signal bars, right edge at `x`, vertically centered on `cy`. */
function SignalGlyph({ x, cy, size, color }) {
  const bars = 4;
  const gap = size * 0.16;
  const bw = size * 0.16;
  const maxH = size * 0.78;
  return (
    <g>
      {Array.from({ length: bars }, (_, i) => {
        const bh = maxH * ((i + 1) / bars);
        const bx = x - (bars - i) * (bw + gap) + gap;
        return <rect key={i} x={bx} y={cy + maxH / 2 - bh} width={bw} height={bh} rx={bw * 0.3} fill={color} />;
      })}
    </g>
  );
}

/** A minimal two-arc wifi glyph, right edge at `x`, vertically centered on `cy`. */
function WifiGlyph({ x, cy, size, color }) {
  const r = size * 0.5;
  const cx = x - r;
  return (
    <g fill="none" stroke={color} strokeWidth={size * 0.13} strokeLinecap="round">
      <path d={`M ${cx - r} ${cy + r * 0.32} A ${r} ${r} 0 0 1 ${cx + r} ${cy + r * 0.32}`} />
      <path d={`M ${cx - r * 0.55} ${cy + r * 0.62} A ${r * 0.62} ${r * 0.62} 0 0 1 ${cx + r * 0.55} ${cy + r * 0.62}`} />
      <circle cx={cx} cy={cy + r * 0.9} r={size * 0.07} fill={color} stroke="none" />
    </g>
  );
}

/** A battery pill (outline + nub + charge fill), right edge at `x`, vertically centered on `cy`. */
function BatteryGlyph({ x, cy, size, color, level = 0.8 }) {
  const w = size * 1.7;
  const h = size * 0.82;
  const nubW = size * 0.16;
  const bx = x - w - nubW;
  const pad = 2.5;
  const fillW = Math.max(0, (w - 2 * pad) * clamp01(level));
  return (
    <g>
      <rect x={bx} y={cy - h / 2} width={w} height={h} rx={h * 0.28} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />
      <rect x={bx + pad} y={cy - h / 2 + pad} width={fillW} height={h - 2 * pad} rx={(h - 2 * pad) * 0.3} fill={color} />
      <rect x={bx + w} y={cy - nubW * 0.9} width={nubW} height={nubW * 1.8} rx={1.5} fill={color} />
    </g>
  );
}

/**
 * The body (content) box of a PhoneFrame with the given box — where children should be drawn.
 * Children are placed in SCENE coordinates; use this to lay them out. `pad` insets all four sides
 * (24 is the usual inner margin). Only the status bar is subtracted (like `browserContentBox`) —
 * a `variant` bottom bar / home indicator is drawn OVER children afterward, so keep content sparse
 * near the bottom edge (~90–140 px) when `variant` is 'chat' or 'camera'.
 */
export function phoneContentBox({ x, y, w, h }, pad = 0) {
  const sb = statusBarHeight(w);
  return { x: x + pad, y: y + sb + pad, w: w - 2 * pad, h: h - sb - 2 * pad };
}

/**
 * A generic, fictional mobile-app screen mock (SVG) — never a real device or product's chrome.
 * Anatomy: white body, 3 px accent stroke, radius 44 (fixed, device shape) · bgAlt status bar
 * (48 px; 40 px compact under `w < 300`) with `time` (left), optional `appName` (center, bold,
 * hidden when compact) and a right-aligned icon cluster (signal bars · wifi · battery, hand-drawn,
 * never a real OS glyph) · body where `children` render (scene coordinates — see `phoneContentBox`).
 * `variant` draws an OPTIONAL bottom decoration OVER children, after they're clipped in:
 *   'plain'  (default) — just a home-indicator pill.
 *   'chat'   — a footer input pill + accent send button (for a chat-style app screen), plus the
 *              home indicator.
 *   'camera' — a bottom toolbar with a shutter ring, a flip-camera glyph and a thumbnail swatch,
 *              plus the home indicator.
 * States: `opacity` for entrances (appear()).
 * `illustrative` defaults to TRUE (a mock screen is always illustrative) — the MINH HỌA tag sits in
 * the content box's top-right corner, drawn over the children. Pass `false` only when the scene tag
 * covers it.
 * Timing: static; animate children and `opacity` from the scene frame.
 * @category ui
 */
export function PhoneFrame({
  x,
  y,
  w = 320,
  h = 693,
  appName,
  time = '9:41',
  variant = 'plain',
  opacity = 1,
  illustrative = true,
  children,
}) {
  const clipId = React.useId().replace(/:/g, '');
  if (opacity <= 0.001) return null;
  const sb = statusBarHeight(w);
  const compact = w < 300;
  const body = phoneContentBox({ x, y, w, h });
  const cy = y + sb / 2;
  const timeFs = compact ? 14 : 16;
  const iconSize = compact ? 15 : 18;

  const iconsRightX = x + w - (compact ? 16 : 22);
  const batteryW = iconSize * 1.7 + iconSize * 0.16;
  const wifiW = iconSize;
  const signalW = iconSize;
  const iconGap = compact ? 8 : 10;
  const iconsLeftX = iconsRightX - batteryW - iconGap - wifiW - iconGap - signalW;

  const timeX = x + (compact ? 16 : 22);
  const timeMaxW = iconsLeftX - timeX - 8;

  let appLabel = null;
  if (appName && !compact) {
    const nameFs = 15;
    const nameMaxW = w * 0.4;
    const cx = x + w / 2;
    appLabel = (
      <SvgText x={cx} y={cy + nameFs * 0.36} size={nameFs} weight={700} anchor="middle" color={C.text}>
        {fitLine(appName, nameMaxW, nameFs, 700)}
      </SvgText>
    );
  }

  const homeIndicatorY = y + h - 14;
  const homeIndicator = (
    <rect x={x + w / 2 - w * 0.14} y={homeIndicatorY} width={w * 0.28} height={5} rx={2.5} fill={C.text} opacity={0.35} />
  );

  let bottomDecoration = homeIndicator;
  if (variant === 'chat') {
    const barH = compact ? 66 : 76;
    const barY = y + h - barH;
    const pillH = compact ? 40 : 48;
    const pillY = barY + (barH - 28 - pillH) / 2;
    const pillX = x + 18;
    const sendR = pillH / 2 - 5;
    const pillW = w - 36 - 2 * sendR - 16;
    bottomDecoration = (
      <g>
        <line x1={x} x2={x + w} y1={barY} y2={barY} stroke={C.dotInactive} strokeWidth={2} />
        <rect x={pillX} y={pillY} width={pillW} height={pillH} rx={pillH / 2} fill={C.bg} stroke={C.dotInactive} strokeWidth={2} />
        <SvgText x={pillX + 16} y={pillY + pillH / 2 + 5} size={compact ? 14 : 16} weight={500} anchor="start" color={C.textMuted}>
          {fitLine('Nhắn tin…', pillW - 28, compact ? 14 : 16, 500)}
        </SvgText>
        <circle cx={pillX + pillW + 8 + sendR} cy={pillY + pillH / 2} r={sendR} fill={C.accent} />
        <LineIcon name="send" x={pillX + pillW + 8 + sendR} y={pillY + pillH / 2 + 1} size={sendR * 1.1} color={C.bg} strokeWidth={1.8} />
        {homeIndicator}
      </g>
    );
  } else if (variant === 'camera') {
    const barH = compact ? 108 : 128;
    const barY = y + h - barH;
    const shutterR = compact ? 28 : 34;
    const shutterCx = x + w / 2;
    const shutterCy = barY + (barH - 24) / 2;
    const sideR = compact ? 16 : 20;
    const sideY = shutterCy;
    bottomDecoration = (
      <g>
        <rect x={x} y={barY} width={w} height={barH} fill={C.bgAlt} opacity={0.94} />
        <line x1={x} x2={x + w} y1={barY} y2={barY} stroke={C.dotInactive} strokeWidth={2} />
        <rect x={shutterCx - sideR / 2 - w * 0.26} y={sideY - sideR / 2} width={sideR} height={sideR} rx={6} fill={C.dotInactive} stroke={C.accent} strokeWidth={2} />
        <LineIcon name="refresh-cw" x={shutterCx + w * 0.26} y={sideY} size={sideR * 1.3} color={C.text} strokeWidth={1.6} />
        <circle cx={shutterCx} cy={shutterCy} r={shutterR} fill={C.bg} stroke={C.accent} strokeWidth={4} />
        <circle cx={shutterCx} cy={shutterCy} r={shutterR - 9} fill={C.accent} />
        {homeIndicator}
      </g>
    );
  }

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={w} height={h} rx={CORNER_R} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={CORNER_R} fill={C.bg} />
      <rect x={x} y={y} width={w} height={sb} fill={C.bgAlt} clipPath={`url(#${clipId})`} />
      <line x1={x} x2={x + w} y1={y + sb} y2={y + sb} stroke={C.dotInactive} strokeWidth={2} />
      <SvgText x={timeX} y={cy + timeFs * 0.36} size={timeFs} weight={700} anchor="start" color={C.text}>
        {fitLine(time, timeMaxW, timeFs, 700)}
      </SvgText>
      {appLabel}
      <SignalGlyph x={iconsLeftX + signalW} cy={cy} size={iconSize} color={C.text} />
      <WifiGlyph x={iconsLeftX + signalW + iconGap + wifiW} cy={cy} size={iconSize} color={C.text} />
      <BatteryGlyph x={iconsRightX} cy={cy} size={iconSize} color={C.text} />
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <g clipPath={`url(#${clipId})`}>{bottomDecoration}</g>
      <rect x={x} y={y} width={w} height={h} rx={CORNER_R} fill="none" stroke={C.accent} strokeWidth={3} />
      {illustrativeTag(illustrative, body)}
    </g>
  );
}
