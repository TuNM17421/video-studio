import React from 'react';
import { C, MONO, ROLE, alpha } from '../../lib/tokens.js';
import { appear, clamp01, pulse } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/**
 * DataTable — an animatable SVG table for lesson scenes (assignment tables, step logs, test plans,
 * allowlists, TRƯỚC / SAU comparisons).
 *
 * Anatomy: optional title (17/700 micro caps, accentStrong) in a 56 px band that also holds the
 * MINH HỌA tag · table frame radius 22, stroke 3 accent, white body · header row bgAlt, labels
 * 17/700 uppercase · body rows 24 px (fontSize) text, 2 px dotInactive rules, long text wraps by
 * `textWidth` inside the column (row height grows) · status cells `{ status, text? }` render as chips:
 * ok → check, green role · blocked → lock, red · pending → hourglass, amber role · untested →
 * "Chưa thử", muted dashed · error → triangle-alert, orange role.
 * Column `tone`: 'muted' (TRƯỚC — muted text, optional `strike`) · 'accent' (accentStrong text, soft
 * blue column band) · 'red' (SAU / chosen — red header, faint red band). `mono` → MONO for tool / code names.
 *
 * States / timing: settled with no `frame` · with `frame`: header appears at `start` (18 f), row i
 * at `start + per·(i+1)` (18 f, 12 px rise) · `highlightRow` = red-soft band + 6 px red left bar ·
 * `highlightCell` = red outline (3 px), pulsing to 5 px at `highlightCell.at` (54 f pulse).
 * `illustrative` defaults to TRUE — table data in a lesson is illustrative.
 * @category table
 */

const PAD_X = 20;
const PAD_Y = 16;
const HEADER_H = 56;
const TITLE_BAND = 56;
/** textWidth under-estimates Vietnamese diacritics a little — wrap / size against a safety factor. */
const EST = 1.1;

export const STATUS_STYLE = Object.freeze({
  ok: { color: ROLE.green, fill: ROLE.greenSoft, icon: 'check', text: 'Đạt' },
  blocked: { color: C.red, fill: C.redSoft, icon: 'lock', text: 'Bị chặn' },
  pending: { color: ROLE.amber, fill: ROLE.amberSoft, icon: 'hourglass', text: 'Chờ duyệt' },
  untested: { color: C.textMuted, fill: C.bg, icon: null, text: 'Chưa thử', dashed: true },
  error: { color: ROLE.orange, fill: ROLE.orangeSoft, icon: 'triangle-alert', text: 'Lỗi' },
});

/** Greedy word wrap by estimated Montserrat width; honours explicit '\n'. */
export function wrapText(str, maxW, size, weight = 600) {
  const out = [];
  for (const para of String(str).split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (line && textWidth(next, size, weight) > maxW) {
        out.push(line);
        line = w;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

const isStatus = (v) => v != null && typeof v === 'object' && typeof v.status === 'string';

/** Pure layout: column x/widths, wrapped cells, row y/heights and total height. */
export function dataTableLayout({ x = 0, y = 0, w = 1600, columns = [], rows = [], fontSize = 24, title, illustrative = true }) {
  const lh = Math.round(fontSize * 1.36);
  const sum = columns.reduce((s, c) => s + (c.w ?? 1), 0) || 1;
  const cols = [];
  let cx = x;
  for (const c of columns) {
    const cw = ((c.w ?? 1) / sum) * w;
    cols.push({ ...c, x: cx, w: cw });
    cx += cw;
  }
  const top = y + (title || illustrative ? TITLE_BAND : 0);
  let ry = top + HEADER_H;
  const bodyRows = rows.map((row) => {
    const cells = cols.map((c, ci) => {
      const v = row[c.key];
      if (isStatus(v)) return { status: v, lines: [] };
      const weight = c.weight ?? (ci === 0 ? 700 : 600);
      const lines = v == null || v === '' ? [] : wrapText(String(v), (c.w - 2 * PAD_X) / EST, fontSize, weight);
      return { lines, weight };
    });
    const nLines = Math.max(1, ...cells.map((c) => c.lines.length));
    const h = Math.max(fontSize >= 22 ? 68 : 60, nLines * lh + 2 * PAD_Y);
    const r = { y: ry, h, cells };
    ry += h;
    return r;
  });
  return { cols, top, headerH: HEADER_H, rows: bodyRows, bottom: ry, h: ry - y, lh };
}

function StatusChip({ x, y, align, status, maxW, size = 18 }) {
  const st = STATUS_STYLE[status.status] || STATUS_STYLE.untested;
  const label = status.text ?? st.text;
  let fs = size;
  const iconW = st.icon ? 30 : 0;
  let cw = textWidth(label, fs, 700) * EST + 32 + iconW;
  if (cw > maxW) {
    fs = 16;
    cw = Math.min(maxW, textWidth(label, fs, 700) * EST + 28 + iconW);
  }
  const h = 40;
  const x0 = align === 'center' ? x - cw / 2 : align === 'right' ? x - cw : x;
  return (
    <g>
      <rect
        x={x0}
        y={y - h / 2}
        width={cw}
        height={h}
        rx={h / 2}
        fill={st.fill}
        stroke={st.color}
        strokeWidth={2}
        strokeDasharray={st.dashed ? '6 5' : undefined}
      />
      {st.icon ? <LineIcon name={st.icon} x={x0 + 14 + 11} y={y} size={22} color={st.color} strokeWidth={2} /> : null}
      <SvgText x={x0 + iconW + (cw - iconW) / 2 - (st.icon ? 3 : 0)} y={y + fs * 0.36} size={fs} weight={700} color={st.color}>
        {label}
      </SvgText>
    </g>
  );
}

export function DataTable(props) {
  const {
    x = 0,
    y = 0,
    w = 1600,
    columns = [],
    rows = [],
    frame,
    start = 0,
    per = 12,
    highlightRow,
    highlightCell,
    title,
    fontSize = 24,
    illustrative = true,
    opacity = 1,
  } = props;
  if (opacity <= 0.001) return null;
  const L = dataTableLayout({ ...props, x, y, w, fontSize, illustrative });
  const animated = frame != null;
  const headO = animated ? appear(frame, typeof start === 'function' ? start(-1) : start, 18) : 1;
  const rowO = (i) => (animated ? appear(frame, typeof start === 'function' ? start(i) : start + per * (i + 1), 18) : 1);
  const hiRows = highlightRow == null ? [] : Array.isArray(highlightRow) ? highlightRow : [highlightRow];
  const top = L.top;
  const bottom = L.bottom;
  const lastVisible = animated ? rows.reduce((m, _, i) => (rowO(i) > 0.001 ? i : m), -1) : rows.length - 1;
  const frameBottom = lastVisible >= 0 ? L.rows[lastVisible].y + L.rows[lastVisible].h : top + L.headerH;
  const R = 22;
  const headerPath = `M ${x} ${top + L.headerH} L ${x} ${top + R} Q ${x} ${top} ${x + R} ${top} L ${x + w - R} ${top} Q ${x + w} ${top} ${x + w} ${top + R} L ${x + w} ${top + L.headerH} Z`;
  const clipId = `dt-clip-${Math.round(x)}-${Math.round(y)}-${Math.round(w)}`;

  const toneText = (c) => (c.tone === 'muted' ? C.textMuted : c.tone === 'accent' ? C.accentStrong : C.text);
  const toneHead = (c) => (c.tone === 'muted' ? C.textMuted : c.tone === 'red' ? C.red : C.accentStrong);
  const textX = (c) => (c.align === 'center' ? c.x + c.w / 2 : c.align === 'right' ? c.x + c.w - PAD_X : c.x + PAD_X);
  const anchorOf = (c) => (c.align === 'center' ? 'middle' : c.align === 'right' ? 'end' : 'start');

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={top} width={w} height={frameBottom - top} rx={R} />
        </clipPath>
      </defs>
      {title ? (
        <SvgText x={x + 4} y={y + 30} size={17} weight={700} anchor="start" color={C.accentStrong} letterSpacing={1} opacity={headO}>
          {title}
        </SvgText>
      ) : null}
      <g opacity={headO < 1 ? headO : undefined}>
        <rect x={x} y={top} width={w} height={frameBottom - top} rx={R} fill={C.bg} />
        <g clipPath={`url(#${clipId})`}>
          {/* column tone bands */}
          {L.cols.map((c) =>
            c.tone === 'accent' || c.tone === 'red' ? (
              <rect key={`band-${c.key}`} x={c.x} y={top} width={c.w} height={frameBottom - top} fill={c.tone === 'red' ? alpha('red', 0.05) : alpha('dotInactive', 0.55)} />
            ) : null,
          )}
          <path d={headerPath} fill={C.bgAlt} />
          {/* highlighted rows */}
          {L.rows.map((r, i) =>
            hiRows.includes(i) && rowO(i) > 0.001 ? (
              <g key={`hi-${i}`} opacity={rowO(i) < 1 ? rowO(i) : undefined}>
                <rect x={x} y={r.y} width={w} height={r.h} fill={C.redSoft} />
                <rect x={x} y={r.y} width={6} height={r.h} fill={C.red} />
              </g>
            ) : null,
          )}
        </g>
        {L.cols.map((c) => (
          <SvgText key={`h-${c.key}`} x={textX(c)} y={top + L.headerH / 2 + 6} size={17} weight={700} anchor={anchorOf(c)} color={toneHead(c)} letterSpacing={0.8}>
            {String(c.label ?? '').toUpperCase()}
          </SvgText>
        ))}
        <line x1={x} x2={x + w} y1={top + L.headerH} y2={top + L.headerH} stroke={C.accent} strokeWidth={2} />
      </g>
      {/* body */}
      {L.rows.map((r, i) => {
        const o = rowO(i);
        if (o <= 0.001) return null;
        const dy = (1 - o) * 12;
        const hot = hiRows.includes(i);
        return (
          <g key={`r-${i}`} opacity={o < 1 ? o : undefined} transform={dy ? `translate(0 ${dy})` : undefined}>
            {i > 0 ? <line x1={x + 3} x2={x + w - 3} y1={r.y} y2={r.y} stroke={C.dotInactive} strokeWidth={2} /> : null}
            {L.cols.map((c, ci) => {
              const cell = r.cells[ci];
              const midY = r.y + r.h / 2;
              if (cell.status) {
                return <StatusChip key={c.key} x={c.align === 'center' ? c.x + c.w / 2 : textX(c)} y={midY} align={c.align ?? 'left'} status={cell.status} maxW={c.w - 2 * PAD_X} />;
              }
              if (!cell.lines.length) return null;
              const y0 = midY - ((cell.lines.length - 1) * L.lh) / 2 + fontSize * 0.36;
              const color = hot && ci === 0 ? C.red : toneText(c);
              return (
                <g key={c.key}>
                  <text x={textX(c)} y={y0} fontSize={fontSize} fontWeight={cell.weight} fill={color} textAnchor={anchorOf(c)} fontFamily={c.mono ? MONO : undefined}>
                    {cell.lines.map((ln, li) => (
                      <tspan key={li} x={textX(c)} dy={li === 0 ? 0 : L.lh}>
                        {ln}
                      </tspan>
                    ))}
                  </text>
                  {c.strike
                    ? cell.lines.map((ln, li) => {
                        const tw = textWidth(ln, fontSize, cell.weight);
                        const lx = c.align === 'center' ? textX(c) - tw / 2 : c.align === 'right' ? textX(c) - tw : textX(c);
                        const ly = y0 + li * L.lh - fontSize * 0.33;
                        return <line key={`s${li}`} x1={lx} x2={lx + tw} y1={ly} y2={ly} stroke={C.textMuted} strokeWidth={2} />;
                      })
                    : null}
                </g>
              );
            })}
          </g>
        );
      })}
      {/* frame on top */}
      <rect x={x} y={top} width={w} height={frameBottom - top} rx={R} fill="none" stroke={C.accent} strokeWidth={3} opacity={headO < 1 ? headO : undefined} />
      {/* highlighted cell */}
      {highlightCell
        ? (() => {
            const ri = highlightCell.row;
            const col = L.cols.find((c) => c.key === highlightCell.key);
            const r = L.rows[ri];
            if (!col || !r) return null;
            const o = rowO(ri);
            if (o <= 0.001) return null;
            const p = animated && highlightCell.at != null ? pulse(frame, highlightCell.at) : 0;
            const inset = 6;
            return (
              <g opacity={o < 1 ? o : undefined}>
                {p > 0.001 ? (
                  <rect x={col.x + inset - 4} y={r.y + inset - 4} width={col.w - 2 * inset + 8} height={r.h - 2 * inset + 8} rx={16} fill="none" stroke={alpha('red', 0.24)} strokeWidth={6 * p} />
                ) : null}
                <rect x={col.x + inset} y={r.y + inset} width={col.w - 2 * inset} height={r.h - 2 * inset} rx={12} fill="none" stroke={C.red} strokeWidth={3 + 2 * clamp01(p)} />
              </g>
            );
          })()
        : null}
      {illustrativeTag(illustrative, { x, y, w, h: bottom - y }, headO)}
    </g>
  );
}
