import React from 'react';
import { C } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { graphemes } from '../../lib/text.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** Title-bar height for a frame of width `w` (compact under 480 px). */
const barHeight = (w) => (w < 480 ? 44 : 56);

/** Trim `str` with an ellipsis so it fits `maxW` px at `size`/`weight` (grapheme-safe). */
function fitLine(str, maxW, size, weight) {
  const s = String(str ?? '');
  if (textWidth(s, size, weight) <= maxW) return s;
  const g = graphemes(s);
  let n = g.length;
  while (n > 0 && textWidth(g.slice(0, n).join('') + '…', size, weight) > maxW) n--;
  return n > 0 ? g.slice(0, n).join('') + '…' : '';
}

/**
 * The body (content) box of a BrowserFrame with the given box — where children should be drawn.
 * Children are placed in SCENE coordinates; use this to lay them out. `pad` insets all four sides
 * (24 is the usual inner margin).
 */
export function browserContentBox({ x, y, w, h }, pad = 0) {
  const bar = barHeight(w);
  return { x: x + pad, y: y + bar + pad, w: w - 2 * pad, h: h - bar - 2 * pad };
}

/**
 * A generic, fictional app / web window mock (SVG) — never a real product's chrome.
 * Anatomy: white body, 3 px accent stroke, radius 22 · bgAlt title bar (56 px; 44 px when w < 480)
 * with three small window dots, an optional tab `title` (17 / 700 accent) and an address pill
 * (globe or lock icon + `url`, 17 / 600 muted) · a hairline divider · body where `children` render
 * (scene coordinates — see `browserContentBox`).
 * States: `active` 0–1 → 5 px red outline (drive with pulse()) · `opacity` for entrances (appear()).
 * `illustrative` defaults to TRUE (a mock screen is always illustrative) — the MINH HỌA tag sits in
 * the body's top-right corner, drawn over the children. Pass `false` only when the scene tag covers it.
 * Timing: static; animate children and `opacity` / `active` from the scene frame.
 * @category ui
 */
export function BrowserFrame({
  x,
  y,
  w,
  h,
  url = 'lms.truong.edu.vn',
  title,
  secure = true,
  active = 0,
  opacity = 1,
  illustrative = true,
  children,
}) {
  const clipId = React.useId().replace(/:/g, '');
  if (opacity <= 0.001) return null;
  const bar = barHeight(w);
  const compact = w < 480;
  const a = clamp01(typeof active === 'boolean' ? (active ? 1 : 0) : active);
  const body = browserContentBox({ x, y, w, h });
  const dotR = compact ? 5 : 7;
  const dotGap = compact ? 16 : 22;
  const dotX0 = x + (compact ? 22 : 28);
  const cy = y + bar / 2;
  const fs = compact ? 15 : 17;
  // Tab title (optional) then address pill filling the rest of the bar.
  let cursorX = dotX0 + dotGap * 2 + dotR + (compact ? 14 : 22);
  let titleText = null;
  if (title && !compact) {
    const tw = Math.min(textWidth(title, fs, 700), w * 0.3);
    titleText = (
      <SvgText x={cursorX} y={cy + fs * 0.36} size={fs} weight={700} anchor="start" color={C.accent}>
        {fitLine(title, tw, fs, 700)}
      </SvgText>
    );
    cursorX += tw + 20;
  }
  const pillH = compact ? 26 : 34;
  const pillX = cursorX;
  const pillW = Math.max(0, x + w - (compact ? 16 : 24) - pillX);
  const iconS = compact ? 15 : 19;
  const urlX = pillX + 14 + iconS + 8;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={w} height={h} rx={22} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bg} />
      <rect x={x} y={y} width={w} height={bar} fill={C.bgAlt} clipPath={`url(#${clipId})`} />
      <line x1={x} x2={x + w} y1={y + bar} y2={y + bar} stroke={C.dotInactive} strokeWidth={2} />
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={dotX0 + i * dotGap} cy={cy} r={dotR} fill={C.dotInactive} stroke={C.accent} strokeOpacity={0.45} strokeWidth={1.5} />
      ))}
      {titleText}
      {pillW > 60 ? (
        <g>
          <rect x={pillX} y={cy - pillH / 2} width={pillW} height={pillH} rx={pillH / 2} fill={C.bg} stroke={C.dotInactive} strokeWidth={2} />
          <LineIcon name={secure ? 'lock' : 'globe'} x={pillX + 14 + iconS / 2} y={cy} size={iconS} color={C.textMuted} strokeWidth={1.6} />
          <SvgText x={urlX} y={cy + fs * 0.36} size={fs} weight={600} anchor="start" color={C.textMuted}>
            {fitLine(url, pillX + pillW - 14 - urlX, fs, 600)}
          </SvgText>
        </g>
      ) : null}
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={C.accent} strokeWidth={3} />
      {a > 0.001 ? <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={C.red} strokeWidth={5} opacity={a} /> : null}
      {illustrativeTag(illustrative, body)}
    </g>
  );
}
