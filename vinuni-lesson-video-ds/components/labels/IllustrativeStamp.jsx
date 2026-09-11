import React from 'react';
import { C } from '../../lib/tokens.js';
import { pillWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/** The honesty labels the scripts require, verbatim. */
export const ILLUSTRATIVE_LABELS = Object.freeze([
  'MINH HỌA',
  'TÓM TẮT MINH HỌA',
  'LỖI MINH HỌA',
  'CHƯA CHẠY THẬT',
  'PHƯƠNG ÁN THIẾT KẾ',
  'GIỚI HẠN MINH HỌA',
]);

/**
 * Lab decision (11/09/2026): the "MINH HỌA" card is no longer drawn anywhere — corner tags, component
 * tags and stamps whose label contains "MINH HỌA" render nothing. Other labels (VÍ DỤ, CÂU HỎI,
 * CHƯA CHẠY THẬT, PHƯƠNG ÁN THIẾT KẾ…) still render. Props stay accepted so scenes need no change.
 */
export const isHiddenIllustrativeLabel = (label) => typeof label === 'string' && /MINH HỌA/i.test(label.normalize('NFC'));

/**
 * The standard "MINH HỌA" mark for illustrative data, screens, logs and numbers (SVG).
 * variant 'tag' (default): red-soft pill with red stroke, 17 px bold letter-spaced — the corner tag.
 * 'stamp': rotated outline stamp (−6°) laid over a result / table · 'watermark': large faint diagonal text.
 * anchor: which point of the stamp (x, y) refers to — 'top-left' | 'top-right' | 'center'.
 */
export function IllustrativeStamp({ x, y, label = 'MINH HỌA', variant = 'tag', anchor = 'top-left', opacity = 1, size }) {
  if (opacity <= 0.001 || isHiddenIllustrativeLabel(label)) return null;
  const o = opacity < 1 ? opacity : undefined;
  if (variant === 'watermark') {
    const s = size ?? 96;
    return (
      <g opacity={(opacity ?? 1) * 0.08} transform={`rotate(-18 ${x} ${y})`}>
        <SvgText x={x} y={y + s * 0.36} size={s} weight={700} color={C.red} letterSpacing={s * 0.08}>
          {label}
        </SvgText>
      </g>
    );
  }
  const fs = size ?? (variant === 'stamp' ? 22 : 17);
  const h = variant === 'stamp' ? fs * 2.2 : fs * 2;
  const w = pillWidth(label, fs) + (variant === 'stamp' ? 10 : 0) + label.length * 1.1;
  const x0 = anchor === 'top-right' ? x - w : anchor === 'center' ? x - w / 2 : x;
  const y0 = anchor === 'center' ? y - h / 2 : y;
  if (variant === 'stamp') {
    const cx = x0 + w / 2;
    const cy = y0 + h / 2;
    return (
      <g opacity={o} transform={`rotate(-6 ${cx} ${cy})`}>
        <rect x={x0} y={y0} width={w} height={h} rx={8} fill={C.bg} fillOpacity={0.85} stroke={C.red} strokeWidth={3} />
        <rect x={x0 + 5} y={y0 + 5} width={w - 10} height={h - 10} rx={5} fill="none" stroke={C.red} strokeWidth={1.5} />
        <SvgText x={cx} y={cy + fs * 0.36} size={fs} weight={700} color={C.red} letterSpacing={2}>
          {label}
        </SvgText>
      </g>
    );
  }
  return (
    <g opacity={o}>
      <rect x={x0} y={y0} width={w} height={h} rx={h / 2} fill={C.redSoft} stroke={C.red} strokeWidth={2} />
      <SvgText x={x0 + w / 2} y={y0 + h / 2 + fs * 0.36} size={fs} weight={700} color={C.red} letterSpacing={1.1}>
        {label}
      </SvgText>
    </g>
  );
}

/**
 * Helper for components that take an `illustrative` prop (true | label string | false).
 * Places a tag at the top-right corner of `box` ({x, y, w, h}), 12 px inside, or nothing.
 */
export function illustrativeTag(illustrative, box, opacity = 1) {
  if (!illustrative) return null;
  const label = typeof illustrative === 'string' ? illustrative : 'MINH HỌA';
  if (isHiddenIllustrativeLabel(label)) return null;
  return <IllustrativeStamp x={box.x + box.w - 12} y={box.y + 12} label={label} anchor="top-right" opacity={opacity} />;
}
