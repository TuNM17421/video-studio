import React from 'react';
import { C, MONO } from '../../lib/tokens.js';
import { textWidth } from '../../lib/geometry.js';
import { graphemes, staggered } from '../../lib/text.js';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';
import { Chip } from '../labels/Pill.jsx';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { CODE_HEADER_H, CODE_LINE_HEIGHT, CodeCard, CodeLine, MONO_EM, fitLine, tokenizeLine } from './CodeBlock.jsx';

/**
 * Pretty-print a value into line records { text, key, depth, end } (2-space indent, JSON syntax).
 * `key` = the property that starts the line; `end` = index of the line that closes its block
 * (same index for a primitive value) — used to highlight a whole `"messages": [ … ]` block.
 */
export function jsonLines(data) {
  let value = data;
  if (typeof data === 'string') {
    try {
      value = JSON.parse(data);
    } catch {
      return String(data).split('\n').map((text) => ({ text, key: null, depth: 0, end: null }));
    }
  }
  const out = [];
  const emit = (v, depth, key, comma) => {
    const ind = '  '.repeat(depth);
    const kp = key != null ? `${JSON.stringify(key)}: ` : '';
    const c = comma ? ',' : '';
    const idx = out.length;
    if (v !== null && typeof v === 'object') {
      const isArr = Array.isArray(v);
      const entries = isArr ? v.map((x, i) => [null, x, i]) : Object.entries(v).map(([k, x], i) => [k, x, i]);
      if (!entries.length) {
        out.push({ text: `${ind}${kp}${isArr ? '[]' : '{}'}${c}`, key, depth, end: idx });
        return;
      }
      out.push({ text: `${ind}${kp}${isArr ? '[' : '{'}`, key, depth, end: idx });
      entries.forEach(([k, x, i]) => emit(x, depth + 1, k, i < entries.length - 1));
      out.push({ text: `${ind}${isArr ? ']' : '}'}${c}`, key: null, depth, end: null });
      out[idx].end = out.length - 1;
      return;
    }
    out.push({ text: `${ind}${kp}${JSON.stringify(v === undefined ? null : v)}${c}`, key, depth, end: idx });
  };
  emit(value, 0, null, false);
  return out;
}

const hasHeader = (p) => Boolean(p.title || p.illustrative !== false);

/**
 * Layout of a JsonView (pure; shared by the component and jsonLineAnchor).
 * Returns { lines, lh, cw, textX, top, h, glossX, cols } in scene px.
 */
export function jsonLayout(props) {
  const { x, y, w = 760, data, fontSize = 20, glosses = {}, matchId = {}, glossX } = props;
  const lh = Math.round(fontSize * CODE_LINE_HEIGHT);
  const cw = fontSize * MONO_EM;
  const headerH = hasHeader(props) ? CODE_HEADER_H : 0;
  const padY = 16;
  const textX = x + 24;
  const cols = Math.max(8, Math.floor((w - 48) / cw));
  const lines = jsonLines(data).map((l) => {
    const text = fitLine(l.text, cols);
    return { ...l, text, textEnd: textX + graphemes(text).length * cw };
  });
  const top = y + headerH + padY;
  const h = props.h ?? headerH + padY * 2 + lines.length * lh;
  // one gloss column: after the longest glossed line (+ badge) if the chips fit inside, else outside right
  let gx = glossX;
  if (gx == null) {
    const g = lines.filter((l) => l.key != null && glosses[l.key]);
    const maxEnd = Math.max(0, ...g.map((l) => l.textEnd + (matchId[l.key] != null ? 40 : 0)));
    const maxChip = Math.max(0, ...g.map((l) => textWidth(glosses[l.key], 17, 700) + 26));
    gx = maxEnd + 48 + maxChip <= x + w - 16 ? maxEnd + 48 : x + w + 28;
  }
  return { lines, lh, cw, textX, top, h, glossX: gx, cols, headerH };
}

/**
 * Anchor of the first line whose key is `key`, for connecting two JsonViews with a Flow
 * (e.g. tool_use_id in the request ↔ the same id in the tool_result). Pass the SAME props object
 * you give the JsonView. side 'right' (default) = card right edge at the line's center;
 * 'left' = card left edge; 'text' = just after the value text (and badge). Returns null if absent.
 *   const a = jsonLineAnchor(REQ, 'id'), b = jsonLineAnchor(RES, 'tool_use_id', 'right');
 *   <Flow points={[a, { x: a.x + 60, y: a.y }, { x: a.x + 60, y: b.y }, b]} progress={1} />
 */
export function jsonLineAnchor(props, key, side = 'right') {
  const L = jsonLayout(props);
  const i = L.lines.findIndex((l) => l.key === key);
  if (i < 0) return null;
  const y = L.top + i * L.lh + L.lh / 2;
  const w = props.w ?? 760;
  if (side === 'left') return { x: props.x, y };
  if (side === 'text') return { x: L.lines[i].textEnd + ((props.matchId || {})[key] != null ? 44 : 8), y };
  return { x: props.x + w, y };
}

/**
 * Structured JSON viewer (SVG) for API payloads: a JS object (or JSON string) pretty-printed with
 * 2-space indent in the code card style (bgAlt, radius 20, dotInactive 2), mono lines with the kit's
 * palette-only syntax colors (keys accentStrong 700 · strings accent · numbers/true/null red · punctuation muted).
 * Anatomy: header 58 px (braces icon + title 17/700 uppercase accent, MINH HỌA tag — default ON, these are
 * mock payloads) · lines at fontSize 20 × 1.45 · long lines cut with "…".
 * States: `highlightKeys` → the key's line (or its whole object/array block) gets a red-soft band + red
 * left marker; `glosses` { key: 'chú thích' } → Vietnamese Chip in one column right of the lines, thin
 * dashed leader from the line end (red chip on highlighted keys, blue otherwise); `matchId` { key: n } →
 * a numbered red badge after the value so two views pair visually (connect with Flow via jsonLineAnchor).
 * Timing: pass `frame` → lines reveal one by one every `per` frames (default 4) from `start`, each fading
 * over 10 f; glosses/badges follow their line by 8 f. Omit `frame` = settled.
 */
export function JsonView(props) {
  const {
    x,
    y,
    w = 760,
    fontSize = 20,
    highlightKeys = [],
    glosses = {},
    matchId = {},
    frame,
    start = 0,
    per = 4,
    title,
    illustrative = true,
    opacity = 1,
  } = props;
  if (opacity <= 0.001) return null;
  const L = jsonLayout(props);
  const { lines, lh, top, h, glossX, headerH } = L;
  const hlKeys = new Set(highlightKeys);
  const hlRows = new Set();
  lines.forEach((l, i) => {
    if (l.key != null && hlKeys.has(l.key)) for (let k = i; k <= (l.end ?? i); k++) hlRows.add(k);
  });
  const rev = (i, delay = 0) => (frame == null ? 1 : staggered(i, frame, start + delay, per, 10));

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <CodeCard x={x} y={y} w={w} h={h} />
      {headerH ? (
        <>
          {title ? (
            <>
              <LineIcon name="braces" x={x + 38} y={y + 29} size={26} color={C.accent} />
              <SvgText x={x + 62} y={y + 35} size={17} weight={700} anchor="start" color={C.accent}>
                {title}
              </SvgText>
            </>
          ) : null}
          <line x1={x} x2={x + w} y1={y + headerH} y2={y + headerH} stroke={C.dotInactive} strokeWidth={2} />
        </>
      ) : null}
      {lines.map((l, i) => {
        const o = rev(i);
        if (o <= 0.001) return null;
        const bandY = top + i * lh;
        const base = bandY + lh / 2 + fontSize * 0.35;
        const isHl = hlRows.has(i);
        return (
          <g key={i} opacity={o < 1 ? o : undefined}>
            {isHl ? (
              <>
                <rect x={x + 2} y={bandY} width={w - 4} height={lh} fill={C.redSoft} />
                <rect x={x + 2} y={bandY} width={6} height={lh} fill={C.red} />
              </>
            ) : null}
            <CodeLine x={L.textX} y={base} fontSize={fontSize} tokens={tokenizeLine(l.text, 'json')} />
          </g>
        );
      })}
      {lines.map((l, i) => {
        if (l.key == null) return null;
        const n = matchId[l.key];
        const gloss = glosses[l.key];
        if (n == null && !gloss) return null;
        const o = rev(i, 8);
        if (o <= 0.001) return null;
        const cy = top + i * lh + lh / 2;
        const bx = l.textEnd + 22;
        const hot = hlKeys.has(l.key);
        const leadX0 = (n != null ? bx + 20 : l.textEnd + 10);
        const chipW = gloss ? Math.round(textWidth(gloss, 17, 700) + 26) : 0;
        return (
          <g key={`a${i}`} opacity={o < 1 ? o : undefined}>
            {n != null ? (
              <>
                <circle cx={bx} cy={cy} r={14} fill={C.red} />
                <SvgText x={bx} y={cy + 6} size={16} weight={700} color={C.bg}>
                  {String(n)}
                </SvgText>
              </>
            ) : null}
            {gloss ? (
              <>
                <circle cx={leadX0 + 4} cy={cy} r={4} fill={hot ? C.red : C.accent} />
                <line x1={leadX0 + 8} x2={glossX - 6} y1={cy} y2={cy} stroke={hot ? C.red : C.accent} strokeOpacity={0.55} strokeWidth={2} strokeDasharray="4 6" />
                <Chip x={glossX} y={cy - 17} h={34} w={chipW} size={17} label={gloss} tone={hot ? 'red' : 'blue'} />
              </>
            ) : null}
          </g>
        );
      })}
      {illustrativeTag(illustrative, { x, y, w, h })}
    </g>
  );
}

/** Auto height of a JsonView for the given props. */
export function jsonViewHeight(props) {
  return jsonLayout(props).h;
}
