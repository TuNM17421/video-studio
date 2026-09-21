import React, { useId } from 'react';
import { C } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { dsUrl } from '../../lib/assets.js';
import { SvgText } from '../text/Text.jsx';
import { IllustrativeStamp } from '../labels/IllustrativeStamp.jsx';

const PAD = 14; //          white mat between the card edge and the picture
const CAPTION = 20; //      caption 20/700
const CREDIT = 14; //       credit 14/600 muted
const CREDIT_LH = 20;
const KEN_BURNS_MAX = 0.06; // at most 6 % zoom over the whole move

/** Greedy word wrap of `text` into lines ≤ `room` px at `size` (estimate; Montserrat 600 runs ≈ textWidth(700) + 5 %). */
const W600 = (s, size) => textWidth(s, size, 700) * 1.05;
function wrap(text, room, size) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && W600(next, size) > room) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** SVG can only anchor at min / mid / max — the nearest one to a 0–1 focus. */
const ALIGN = (v) => (v < 1 / 3 ? 'Min' : v > 2 / 3 ? 'Max' : 'Mid');

/**
 * PhotoCard — a documentary picture approved by the video editor (images.js): a historical photo, a
 * real object, a paper figure shown as published. Anatomy: white card (radius 22, 3 px dotInactive
 * stroke) · the picture on a 14 px white mat, clipped to radius 12, on a bgAlt field (visible where
 * `contain` letterboxes) · optional caption 20/700 · the credit line 14/600 muted, word-wrapped and never
 * cut (a long one takes room from the picture) — always drawn, the card is not allowed without one · optional tag pill top-right
 * ("ẢNH TƯ LIỆU"). `fit` 'contain' (default) never crops the subject; 'cover' fills the frame and keeps
 * `focus` in view — pass `imgW`/`imgH` (from images.js) for an exact focus, otherwise it snaps to
 * min/mid/max. `kenBurns` 0–1 is a slow zoom (≤ 6 %) toward `focus`, driven by the scene. The picture
 * is never filtered, tinted or given a fake-vintage frame. Static apart from `kenBurns` / `opacity`.
 * @category media
 */
export function PhotoCard({
  x,
  y,
  w,
  h,
  src,
  credit,
  caption,
  fit = 'contain',
  focus = [0.5, 0.5],
  imgW,
  imgH,
  kenBurns = 0,
  tag,
  opacity = 1,
}) {
  const clipId = `pc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (opacity <= 0.001) return null;
  const href = dsUrl(src);
  const room = w - 2 * PAD;
  const creditLines = wrap(credit || '', room, CREDIT);
  const footer = (caption ? CAPTION + 14 : 0) + creditLines.length * CREDIT_LH + 14;
  const ax = x + PAD;
  const ay = y + PAD;
  const aw = room;
  const ah = Math.max(40, h - 2 * PAD - footer);
  const [fx, fy] = [clamp01(focus[0]), clamp01(focus[1])];

  // Place the picture. With intrinsic dimensions the geometry is exact (any focus); without them SVG's
  // preserveAspectRatio does it, snapping the focus to min/mid/max.
  let img;
  if (imgW > 0 && imgH > 0) {
    const s = fit === 'cover' ? Math.max(aw / imgW, ah / imgH) : Math.min(aw / imgW, ah / imgH);
    const dw = imgW * s;
    const dh = imgH * s;
    const dx = ax + (aw - dw) * (fit === 'cover' ? fx : 0.5);
    const dy = ay + (ah - dh) * (fit === 'cover' ? fy : 0.5);
    img = <image href={href} x={dx} y={dy} width={dw} height={dh} preserveAspectRatio="none" />;
  } else {
    const par = `x${ALIGN(fx)}Y${ALIGN(fy)} ${fit === 'cover' ? 'slice' : 'meet'}`;
    img = <image href={href} x={ax} y={ay} width={aw} height={ah} preserveAspectRatio={fit === 'cover' ? par : 'xMidYMid meet'} />;
  }
  const k = 1 + KEN_BURNS_MAX * clamp01(kenBurns);
  const ox = ax + aw * fx;
  const oy = ay + ah * fy;
  const zoom = k > 1 ? `translate(${ox} ${oy}) scale(${k}) translate(${-ox} ${-oy})` : undefined;

  const textTop = ay + ah + 14;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={clipId}>
          <rect x={ax} y={ay} width={aw} height={ah} rx={12} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bg} stroke={C.dotInactive} strokeWidth={3} />
      <g clipPath={`url(#${clipId})`}>
        <rect x={ax} y={ay} width={aw} height={ah} fill={C.bgAlt} />
        {src ? <g transform={zoom}>{img}</g> : null}
      </g>
      {caption ? (
        <SvgText x={ax} y={textTop + CAPTION * 0.8} size={CAPTION} weight={700} anchor="start" color={C.text}>
          {caption}
        </SvgText>
      ) : null}
      {creditLines.map((ln, i) => (
        <SvgText key={i} x={ax} y={textTop + (caption ? CAPTION + 14 : 0) + CREDIT * 0.8 + i * CREDIT_LH} size={CREDIT} weight={600} anchor="start" color={C.textMuted}>
          {ln}
        </SvgText>
      ))}
      {tag ? <IllustrativeStamp x={x + w - PAD - 6} y={y + PAD + 6} label={typeof tag === 'string' ? tag : 'ẢNH TƯ LIỆU'} anchor="top-right" size={15} /> : null}
    </g>
  );
}
