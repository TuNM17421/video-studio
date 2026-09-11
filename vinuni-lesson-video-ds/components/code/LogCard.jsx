import React from 'react';
import { C, MONO, alpha } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { graphemes, staggered } from '../../lib/text.js';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';
import { Chip } from '../labels/Pill.jsx';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { CODE_HEADER_H, CodeCard, MONO_EM } from './CodeBlock.jsx';

/** level → status mark. Palette only: neutral steps in accent, problems in red. */
export const LOG_LEVELS = Object.freeze({
  info: { icon: null, color: C.accent },
  ok: { icon: 'check', color: C.accent },
  warn: { icon: 'triangle-alert', color: C.red },
  error: { icon: 'octagon-x', color: C.red },
  blocked: { icon: 'lock', color: C.red },
});

function fitText(str, maxW, size, weight) {
  const s = String(str ?? '');
  if (textWidth(s, size, weight) <= maxW) return s;
  const g = graphemes(s);
  let n = g.length;
  while (n > 1 && textWidth(g.slice(0, n).join('') + '…', size, weight) > maxW) n -= 1;
  return g.slice(0, n).join('') + '…';
}

/**
 * Execution / audit log card (SVG) — "nhật ký thực thi", "bản ghi sự kiện" of an agent run.
 * Anatomy: code card (bgAlt, radius 20, dotInactive 2) · header 58 px (clipboard-list icon + title 17/700
 * uppercase accent, default "NHẬT KÝ THỰC THI"; MINH HỌA tag — default ON, logs are mock) · optional
 * `columns` header row ([time, actor, event, status] labels, 15/700 muted uppercase — the 4-column table) · rows `rowH` (56): status mark (info dot ·
 * ok check · warn triangle-alert · error octagon-x · blocked lock, red for problems) · mono timestamp 20 ·
 * ACTOR 17/700 accentStrong · text 22/500 (cut with "…") · optional right `status` Chip (red on warn/error/blocked).
 * States: `blocked` rows get a faint red-soft fill; `highlightIndex` → red-soft band + red left marker,
 * other rows dim to 45 %; `empty` (or no rows) → dashed card with circle-help icon + "Chưa có bản ghi".
 * Timing: pass `frame` → rows reveal every `per` frames (default 12) from `start`, each fades + rises 8 px
 * over 12 f. Omit `frame` = settled.
 */
export function LogCard({
  x,
  y,
  w = 1000,
  rows = [],
  title = 'NHẬT KÝ THỰC THI',
  columns,
  frame,
  start = 0,
  per = 12,
  highlightIndex,
  dim = true,
  empty = false,
  emptyLabel = 'Chưa có bản ghi',
  rowH = 56,
  actorW,
  illustrative = true,
  opacity = 1,
  h: hProp,
}) {
  if (opacity <= 0.001) return null;
  const isEmpty = empty || rows.length === 0;
  const headerH = title || illustrative ? CODE_HEADER_H : 0;
  const colH = columns && !isEmpty ? 42 : 0;
  const padY = 8;
  const bodyH = isEmpty ? 190 : rows.length * rowH;
  const h = hProp ?? headerH + colH + padY * 2 + bodyH;
  const top = y + headerH + colH + padY;

  const timeFs = 20;
  const cw = timeFs * MONO_EM;
  const timeLen = Math.max(0, ...rows.map((r) => graphemes(r.time ?? '').length));
  const xIcon = x + 40;
  const xTime = x + 72;
  const xActor = xTime + (timeLen ? timeLen * cw + 24 : 0);
  const aW = actorW ?? Math.max(0, ...rows.map((r) => (r.actor ? textWidth(String(r.actor).toUpperCase(), 17, 700) * 1.08 + 32 : 0)));
  const xText = xActor + aW;
  const hasHl = highlightIndex != null && highlightIndex >= 0;

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <CodeCard x={x} y={y} w={w} h={h} dashed={isEmpty} />
      {headerH ? (
        <>
          {title ? (
            <>
              <LineIcon name="clipboard-list" x={x + 38} y={y + 29} size={26} color={C.accent} />
              <SvgText x={x + 62} y={y + 35} size={17} weight={700} anchor="start" color={C.accent}>
                {title}
              </SvgText>
            </>
          ) : null}
          <line x1={x} x2={x + w} y1={y + headerH} y2={y + headerH} stroke={C.dotInactive} strokeWidth={2} />
        </>
      ) : null}
      {colH ? (
        <g>
          {[xTime, xActor, xText].map((cx, i) =>
            columns[i] ? (
              <SvgText key={i} x={cx} y={y + headerH + 28} size={15} weight={700} anchor="start" color={C.textMuted} letterSpacing={0.6}>
                {columns[i]}
              </SvgText>
            ) : null,
          )}
          {columns[3] ? (
            <SvgText x={x + w - 24} y={y + headerH + 28} size={15} weight={700} anchor="end" color={C.textMuted} letterSpacing={0.6}>
              {columns[3]}
            </SvgText>
          ) : null}
          <line x1={x + 16} x2={x + w - 16} y1={y + headerH + colH} y2={y + headerH + colH} stroke={C.dotInactive} strokeWidth={2} />
        </g>
      ) : null}
      {isEmpty ? (
        <g>
          <LineIcon name="circle-help" x={x + w / 2} y={top + 70} size={64} color={C.accent} />
          <SvgText x={x + w / 2} y={top + 150} size={24} weight={600} color={C.textMuted}>
            {emptyLabel}
          </SvgText>
        </g>
      ) : (
        rows.map((r, i) => {
          const p = frame == null ? 1 : staggered(i, frame, start, per, 12);
          if (p <= 0.001) return null;
          const lv = LOG_LEVELS[r.level] || LOG_LEVELS.info;
          const ry = top + i * rowH + (1 - p) * 8;
          const cy = ry + rowH / 2;
          const isHl = hasHl && i === highlightIndex;
          const o = p * (hasHl && dim && !isHl ? 0.45 : 1);
          const statusW = r.status ? Math.round(textWidth(r.status, 15, 700) + 24) : 0;
          const textMax = x + w - 24 - (statusW ? statusW + 20 : 0) - xText;
          const problem = lv.color === C.red;
          return (
            <g key={i} opacity={o < 1 ? o : undefined}>
              {isHl ? (
                <>
                  <rect x={x + 2} y={ry} width={w - 4} height={rowH} fill={C.redSoft} />
                  <rect x={x + 2} y={ry} width={6} height={rowH} fill={C.red} />
                </>
              ) : r.level === 'blocked' ? (
                <rect x={x + 2} y={ry} width={w - 4} height={rowH} fill={alpha('redSoft', 0.6)} />
              ) : null}
              {i > 0 && !isHl ? <line x1={x + 16} x2={x + w - 16} y1={ry} y2={ry} stroke={C.dotInactive} strokeWidth={2} /> : null}
              {lv.icon ? (
                <LineIcon name={lv.icon} x={xIcon} y={cy} size={28} color={lv.color} strokeWidth={1.5} />
              ) : (
                <circle cx={xIcon} cy={cy} r={6} fill={lv.color} />
              )}
              {r.time ? (
                <text x={xTime} y={cy + 7} fontFamily={MONO} fontSize={timeFs} fontWeight={500} fill={C.textMuted}>
                  {r.time}
                </text>
              ) : null}
              {r.actor ? (
                <SvgText x={xActor} y={cy + 6} size={17} weight={700} anchor="start" color={C.accentStrong}>
                  {String(r.actor).toUpperCase()}
                </SvgText>
              ) : null}
              <SvgText x={xText} y={cy + 8} size={22} weight={500} anchor="start" color={C.text}>
                {fitText(r.text, textMax, 22, 500)}
              </SvgText>
              {r.status ? (
                <Chip x={x + w - 24 - statusW} y={cy - 16} w={statusW} h={32} size={15} label={r.status} tone={problem ? 'red' : 'blue'} />
              ) : null}
            </g>
          );
        })
      )}
      {illustrativeTag(illustrative, { x, y, w, h })}
    </g>
  );
}

/** Auto height of a LogCard for the given props. */
export function logCardHeight({ rows = [], title = 'NHẬT KÝ THỰC THI', columns, empty = false, rowH = 56, illustrative = true }) {
  const isEmpty = empty || rows.length === 0;
  return (title || illustrative ? CODE_HEADER_H : 0) + (columns && !isEmpty ? 42 : 0) + 16 + (isEmpty ? 190 : rows.length * rowH);
}
