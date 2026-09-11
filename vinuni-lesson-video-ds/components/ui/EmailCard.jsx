import React from 'react';
import { C, ROLE } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';
import { fitTextLine } from './ChatWindow.jsx';

/** Status tone → [fill, text]. 'waiting' = amber role, 'done' = green role (outline/soft-fill use only). */
const TONES = {
  muted: [C.dotInactive, C.textMuted],
  blue: [C.dotInactive, C.accentStrong],
  waiting: [ROLE.amberSoft, ROLE.amber],
  done: [ROLE.greenSoft, ROLE.green],
  blocked: [C.redSoft, C.red],
};
/** Known status labels → tone. */
const STATUS_TONE = { 'BẢN NHÁP': 'muted', 'CHỜ DUYỆT': 'waiting', 'ĐÃ GỬI': 'done', 'BỊ CHẶN': 'blocked' };

/** Placeholder bar widths (fractions of the body width) — fixed, never random. */
const BARS = [0.94, 0.86, 0.9, 0.58];

/** Suggested height for an EmailCard with `n` body lines and an optional attachment. */
export const emailCardHeight = (n = 3, attachment = false) => 222 + n * 28 + (attachment ? 52 : 0);

/**
 * A generic email / draft mock (SVG) — never a real mail client's look.
 * Anatomy: white card, 3 px accent stroke, radius 22 (dash 12 10 when `dashed`, e.g. a draft) ·
 * top row: mail icon + status chip (17 / 700; 'BẢN NHÁP' muted · 'CHỜ DUYỆT' amber · 'ĐÃ GỬI' green ·
 * 'BỊ CHẶN' red; other labels → `statusTone`) · "Từ" / "Đến" rows (17 / 700 muted key, 18 / 600 value) ·
 * subject 21 / 700 · hairline divider · body: `lines` = strings (18 / 500 muted, one line each,
 * ellipsized) or a number → that many placeholder bars · optional `attachment` chip (file icon + name).
 * States: `active` 0–1 → red-soft overlay + 5 px red stroke (like Card) · `opacity` for entrances.
 * `illustrative` defaults to TRUE (mock content) — tag top-right. Height: see `emailCardHeight(n, attachment)`.
 * Timing: static; move it with a transform / Flow in the scene.
 * @category ui
 */
export function EmailCard({
  x,
  y,
  w,
  h,
  from = 'tro-ly@truong.edu.vn',
  to = 'hs017@truong.edu.vn',
  subject,
  lines = 3,
  status,
  statusTone,
  attachment,
  dashed = false,
  active = 0,
  opacity = 1,
  illustrative = true,
}) {
  if (opacity <= 0.001) return null;
  const a = clamp01(typeof active === 'boolean' ? (active ? 1 : 0) : active);
  const height = h ?? emailCardHeight(typeof lines === 'number' ? lines : lines.length, !!attachment);
  const pad = 24;
  const innerW = w - 2 * pad;
  const hot = a > 0.45;
  const tone = TONES[statusTone || STATUS_TONE[status] || 'blue'];
  const chipW = status ? Math.round(textWidth(status, 17, 700) * 1.05 + 28) : 0;
  const rowY = y + 22;
  const keyW = 64;
  const fieldY = y + 96;
  const subjY = fieldY + 64;
  const divY = subjY + 20;
  const bodyY = divY + 22;
  const body = typeof lines === 'number' ? Array.from({ length: lines }, () => null) : lines;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={height} rx={22} fill={C.bg} stroke={C.accent} strokeWidth={3} strokeDasharray={dashed ? '12 10' : undefined} />
      {a > 0.001 ? <rect x={x} y={y} width={w} height={height} rx={22} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={a * 0.72} /> : null}
      <LineIcon name="mail" x={x + pad + 15} y={rowY + 17} size={30} color={hot ? C.red : C.accent} />
      {status ? (
        <g>
          <rect x={x + pad + 44} y={rowY} width={chipW} height={34} rx={14} fill={tone[0]} />
          <SvgText x={x + pad + 44 + chipW / 2} y={rowY + 17 + 6} size={17} weight={700} color={tone[1]}>
            {status}
          </SvgText>
        </g>
      ) : null}
      {[
        ['Từ', from],
        ['Đến', to],
      ].map(([k, v], i) => (
        <g key={k}>
          <SvgText x={x + pad} y={fieldY + i * 30} size={17} weight={700} anchor="start" color={C.textMuted}>
            {k}
          </SvgText>
          <SvgText x={x + pad + keyW} y={fieldY + i * 30} size={18} weight={600} anchor="start">
            {fitTextLine(v, innerW - keyW, 18, 600)}
          </SvgText>
        </g>
      ))}
      {subject ? (
        <SvgText x={x + pad} y={subjY + 12} size={21} weight={700} anchor="start" color={hot ? C.red : C.text}>
          {fitTextLine(subject, innerW, 21, 700)}
        </SvgText>
      ) : null}
      <line x1={x + pad} x2={x + w - pad} y1={divY + 6} y2={divY + 6} stroke={C.dotInactive} strokeWidth={2} />
      {body.map((line, i) =>
        line == null ? (
          <rect key={i} x={x + pad} y={bodyY + i * 28 + 4} width={innerW * BARS[i % BARS.length]} height={12} rx={6} fill={C.dotInactive} />
        ) : (
          <SvgText key={i} x={x + pad} y={bodyY + i * 28 + 16} size={18} weight={500} anchor="start" color={C.textMuted}>
            {fitTextLine(line, innerW, 18, 500)}
          </SvgText>
        ),
      )}
      {attachment ? (
        <g>
          <rect
            x={x + pad}
            y={y + height - 22 - 38}
            width={Math.min(innerW, textWidth(attachment, 16, 600) * 1.1 + 56)}
            height={38}
            rx={12}
            fill={C.bgAlt}
            stroke={C.dotInactive}
            strokeWidth={2}
          />
          <LineIcon name="file-text" x={x + pad + 22} y={y + height - 22 - 19} size={22} color={C.accent} strokeWidth={1.5} />
          <SvgText x={x + pad + 40} y={y + height - 22 - 13} size={16} weight={600} anchor="start">
            {fitTextLine(attachment, innerW - 56, 16, 600)}
          </SvgText>
        </g>
      ) : null}
      {illustrativeTag(illustrative, { x, y, w, h: height })}
    </g>
  );
}
