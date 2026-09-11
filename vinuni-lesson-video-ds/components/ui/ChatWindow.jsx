import React from 'react';
import { C, MONO } from '../../lib/tokens.js';
import { appear } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { graphemes, typeText } from '../../lib/text.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';
import { illustrativeTag } from '../labels/IllustrativeStamp.jsx';

/** textWidth() with a 10 % safety margin — Montserrat 500/600 runs wider than the estimate at 17–20 px. */
export const bubbleTextWidth = (str, size, weight = 600) => textWidth(str, size, weight) * 1.1;

/** Rough monospace width (0.6 em per grapheme) — for MONO text such as tool calls. */
export const monoWidth = (str, size) => graphemes(str).length * size * 0.6;

/**
 * Greedy word-wrap: split `text` into lines no wider than `maxW` px (estimated with textWidth, or
 * `measure(str, size, weight)`). Honours '\n'; a single word wider than maxW is hard-broken by grapheme.
 */
export function wrapTextLines(text, maxW, size = 20, weight = 600, measure = bubbleTextWidth) {
  const out = [];
  const fits = (s) => measure(s, size, weight) <= maxW;
  for (const para of String(text ?? '').normalize('NFC').split('\n')) {
    let line = '';
    for (const word of para.split(/ +/)) {
      if (word === '') continue;
      const next = line ? `${line} ${word}` : word;
      if (fits(next)) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      if (fits(word)) {
        line = word;
        continue;
      }
      // hard-break an over-long word
      let chunk = '';
      for (const g of graphemes(word)) {
        if (chunk && !fits(chunk + g)) {
          out.push(chunk);
          chunk = g;
        } else chunk += g;
      }
      line = chunk;
    }
    out.push(line);
  }
  return out;
}

/** Trim one line with an ellipsis so it fits `maxW` px (grapheme-safe). */
export function fitTextLine(str, maxW, size = 20, weight = 600) {
  const s = String(str ?? '');
  if (bubbleTextWidth(s, size, weight) <= maxW) return s;
  const g = graphemes(s);
  let n = g.length;
  while (n > 0 && bubbleTextWidth(g.slice(0, n).join('') + '…', size, weight) > maxW) n--;
  return n > 0 ? g.slice(0, n).join('') + '…' : '';
}

const HEADER = 64;
const FOOTER = 80;
const GAP = 14;
const PAD = 24;

/** Per-role bubble metrics. */
function metrics(role) {
  if (role === 'system') return { size: 17, lh: 24, px: 16, py: 9, weight: 600 };
  if (role === 'tool') return { size: 17, lh: 25, px: 16, py: 12, weight: 500, iconW: 30 };
  return { size: 20, lh: 28, px: 18, py: 13, weight: 600 };
}

/** Show the first `n` graphemes of wrapped `lines` (lines joined by one separator each). */
function typedLines(lines, n) {
  const shown = [];
  let left = n;
  for (const line of lines) {
    if (left <= 0) break;
    const g = graphemes(line);
    shown.push(g.slice(0, left).join(''));
    left -= g.length + 1;
  }
  return shown;
}

/**
 * A generic, fictional chat-app mock (SVG) — never a real assistant's UI.
 * Anatomy: white window, 3 px accent stroke, radius 22 · bgAlt header (64 px): bot icon in a ring,
 * `title` 20 / 700 and optional `subtitle` · message list (20 px text, line height 28, 14 px gaps):
 * user = accent bubble, white text, right · assistant = bgAlt bubble with hairline, left ·
 * system = centered dotInactive chip, 17 px muted · tool = dashed white bubble, wrench icon, MONO 17 px ·
 * input pill at the bottom (placeholder or `draft`) with an accent send button.
 * Text is word-wrapped to 76 % of the list width (`wrapTextLines`, measured with `bubbleTextWidth` = textWidth × 1.1); the list auto-scrolls so the
 * newest message is visible (smoothly, as messages appear); bubbles pushed past the top fade out.
 * Timing (only when `frame` is given): message i appears at its `at` (appear(), 12 frames, 12 px rise);
 * messages without `at` are visible from the start. The LAST visible assistant message streams in with
 * typeText() from `streamStart` (default: its `at`) at `cps` characters/second, with a steady accent caret
 * while typing (no blink — deterministic). Without `frame` everything renders settled.
 * `revealUpTo` hides messages with index ≥ N (static step-through). `highlightIndex` → 5 px red outline.
 * `illustrative` defaults to TRUE (tag in the header's top-right).
 * @category ui
 */
export function ChatWindow({
  x,
  y,
  w,
  h,
  title = 'Trợ lý học vụ',
  subtitle,
  messages = [],
  frame,
  streamStart,
  cps = 30,
  revealUpTo,
  highlightIndex,
  placeholder = 'Nhập câu hỏi…',
  draft,
  opacity = 1,
  illustrative = true,
}) {
  const clipId = React.useId().replace(/:/g, '');
  if (opacity <= 0.001) return null;
  const areaTop = y + HEADER + 18;
  const areaBottom = y + h - FOOTER;
  const areaH = areaBottom - areaTop;
  const listW = w - 2 * PAD;
  const maxBubble = listW * 0.76;
  const limit = revealUpTo == null ? messages.length : Math.max(0, Math.min(messages.length, revealUpTo));
  const timed = frame != null;

  const vis = messages.map((m, i) => {
    if (i >= limit) return 0;
    if (!timed || m.at == null) return 1;
    return frame >= m.at ? appear(frame, m.at, 12) : 0;
  });
  let streamIdx = -1;
  if (timed) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (vis[i] > 0 && messages[i].role === 'assistant') {
        streamIdx = i;
        break;
      }
    }
    if (streamIdx >= 0 && streamStart == null && messages[streamIdx].at == null) streamIdx = -1;
  }

  const items = messages.map((m, i) => {
    const role = m.role || 'assistant';
    const k = metrics(role);
    const measure = role === 'tool' ? monoWidth : bubbleTextWidth;
    const innerMax = (role === 'system' ? listW - 60 : maxBubble) - 2 * k.px - (k.iconW || 0);
    const full = wrapTextLines(m.text, innerMax, k.size, k.weight, measure);
    let lines = full;
    let caret = false;
    if (i === streamIdx) {
      const start = streamStart ?? m.at ?? 0;
      const shown = typeText(m.text, frame, start, cps);
      const total = graphemes(String(m.text ?? '').normalize('NFC')).length;
      const n = graphemes(shown).length;
      lines = n > 0 ? typedLines(full, n) : [''];
      caret = n < total;
    }
    const textW = Math.max(...full.map((l) => measure(l, k.size, k.weight)), 0);
    const bw = Math.min(textW + 2 * k.px + (k.iconW || 0), role === 'system' ? listW : maxBubble);
    const bh = Math.max(1, lines.length) * k.lh + 2 * k.py - (k.lh - k.size) * 0.6;
    return { m, role, k, lines, caret, bw, bh, measure };
  });

  let acc = 0;
  const tops = items.map((it, i) => {
    const t = acc;
    acc += (it.bh + GAP) * vis[i];
    return t;
  });
  const total = Math.max(0, acc - GAP);
  const scroll = Math.max(0, total - areaH);

  const bubbles = items.map((it, i) => {
    const v = vis[i];
    if (v <= 0.001) return null;
    const { role, k, lines, bw, bh } = it;
    const by = areaTop + tops[i] - scroll + (1 - v) * 12;
    // bubbles scrolled past the top of the list fade out instead of showing a hard cut
    const o = v * Math.max(0, Math.min(1, 1 - (areaTop - by) / (bh * 0.6)));
    if (o <= 0.001) return null;
    const bx = role === 'user' ? x + w - PAD - bw : role === 'system' ? x + (w - bw) / 2 : x + PAD;
    let fill = C.bgAlt;
    let stroke = C.dotInactive;
    let color = C.text;
    let dash;
    let rx = 18;
    if (role === 'user') {
      fill = C.accent;
      stroke = 'none';
      color = C.bg;
    } else if (role === 'system') {
      fill = C.dotInactive;
      stroke = 'none';
      color = C.textMuted;
      rx = bh / 2 > 20 ? 14 : bh / 2;
    } else if (role === 'tool') {
      fill = C.bg;
      stroke = C.accent;
      dash = '8 6';
      color = C.accentStrong;
    }
    const tx = role === 'system' ? bx + bw / 2 : bx + k.px + (k.iconW || 0);
    const ty0 = by + k.py + k.size * 0.86;
    const last = lines[lines.length - 1] ?? '';
    const caretX = bx + k.px + (k.iconW || 0) + (it.role === 'tool' ? monoWidth(last, k.size) : textWidth(last, k.size, k.weight) * 1.06) + 5;
    const caretY = ty0 + (lines.length - 1) * k.lh - k.size * 0.86;
    return (
      <g key={i} opacity={o < 1 ? o : undefined}>
        <rect x={bx} y={by} width={bw} height={bh} rx={rx} fill={fill} stroke={stroke} strokeWidth={stroke === 'none' ? undefined : 2} strokeDasharray={dash} />
        {role === 'tool' ? <LineIcon name="wrench" x={bx + k.px + 10} y={by + k.py + 11} size={20} color={C.accent} strokeWidth={1.5} /> : null}
        <text
          x={tx}
          y={ty0}
          fill={color}
          fontSize={k.size}
          fontWeight={k.weight}
          textAnchor={role === 'system' ? 'middle' : 'start'}
          fontFamily={role === 'tool' ? MONO : undefined}
        >
          {lines.map((line, j) => (
            <tspan key={j} x={tx} dy={j === 0 ? 0 : k.lh}>
              {line}
            </tspan>
          ))}
        </text>
        {it.caret ? <rect x={caretX} y={caretY - 1} width={3} height={k.size + 4} rx={1.5} fill={C.accent} /> : null}
        {highlightIndex === i ? <rect x={bx - 4} y={by - 4} width={bw + 8} height={bh + 8} rx={rx + 4} fill="none" stroke={C.red} strokeWidth={5} /> : null}
      </g>
    );
  });

  const inputY = y + h - FOOTER + 14;
  const inputH = 52;
  const sendR = 19;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <clipPath id={`${clipId}w`}>
        <rect x={x} y={y} width={w} height={h} rx={22} />
      </clipPath>
      <clipPath id={`${clipId}m`}>
        <rect x={x} y={y + HEADER + 2} width={w} height={areaBottom - y - HEADER - 2} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bg} />
      <rect x={x} y={y} width={w} height={HEADER} fill={C.bgAlt} clipPath={`url(#${clipId}w)`} />
      <line x1={x} x2={x + w} y1={y + HEADER} y2={y + HEADER} stroke={C.dotInactive} strokeWidth={2} />
      <circle cx={x + 44} cy={y + HEADER / 2} r={20} fill={C.bg} stroke={C.accent} strokeWidth={2} />
      <LineIcon name="bot" x={x + 44} y={y + HEADER / 2} size={24} color={C.accent} strokeWidth={1.5} />
      <SvgText x={x + 76} y={y + (subtitle ? 29 : 39)} size={20} weight={700} anchor="start">
        {title}
      </SvgText>
      {subtitle ? (
        <SvgText x={x + 76} y={y + 51} size={15} weight={500} anchor="start" color={C.textMuted}>
          {subtitle}
        </SvgText>
      ) : null}
      <g clipPath={`url(#${clipId}m)`}>{bubbles}</g>
      <line x1={x} x2={x + w} y1={areaBottom} y2={areaBottom} stroke={C.dotInactive} strokeWidth={2} />
      <rect x={x + 20} y={inputY} width={w - 40} height={inputH} rx={inputH / 2} fill={C.bg} stroke={C.dotInactive} strokeWidth={2} />
      <SvgText x={x + 44} y={inputY + inputH / 2 + 6} size={18} weight={500} anchor="start" color={draft ? C.text : C.textMuted}>
        {fitTextLine(draft || placeholder, w - 40 - 24 - 2 * sendR - 30, 18, 500)}
      </SvgText>
      <circle cx={x + w - 20 - 6 - sendR} cy={inputY + inputH / 2} r={sendR} fill={C.accent} />
      <LineIcon name="send" x={x + w - 20 - 6 - sendR - 1} y={inputY + inputH / 2 + 1} size={20} color={C.bg} strokeWidth={1.6} />
      <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={C.accent} strokeWidth={3} />
      {illustrativeTag(illustrative, { x, y, w, h: HEADER })}
    </g>
  );
}
