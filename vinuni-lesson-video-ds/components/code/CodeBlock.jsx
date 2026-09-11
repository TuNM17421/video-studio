import React from 'react';
import { C, MONO, alpha } from '../../lib/tokens.js';
import { appear, clamp01 } from '../../lib/motion.js';
import { graphemes, typeText } from '../../lib/text.js';
import { illustrativeTag, isHiddenIllustrativeLabel } from '../labels/IllustrativeStamp.jsx';
import { Chip } from '../labels/Pill.jsx';
import { pillWidth } from '../../lib/geometry.js';

/* ------------------------------------------------------------------ shared code styling */

/** Mono advance width in em (ui-monospace / SF Mono / Menlo / DejaVu Sans Mono ≈ 0.6). */
export const MONO_EM = 0.602;
/** Code line height factor (line box = fontSize × 1.45). */
export const CODE_LINE_HEIGHT = 1.45;

/**
 * Syntax color mapping — palette only, restrained (a code card is one diagram object, not an IDE):
 *  key / keyword → accentStrong 700 · string → accent 600 · number / true / false / null → red 600
 *  function name → text 700 · punctuation → textMuted 500 · comment → textMuted 500 at 80 %
 *  plain identifiers → text 500.
 */
export const CODE_COLORS = Object.freeze({
  key: { color: C.accentStrong, weight: 700 },
  keyword: { color: C.accentStrong, weight: 700 },
  string: { color: C.accent, weight: 600 },
  number: { color: C.red, weight: 600 },
  literal: { color: C.red, weight: 600 },
  fn: { color: C.text, weight: 700 },
  punct: { color: C.textMuted, weight: 500 },
  comment: { color: C.textMuted, weight: 500, opacity: 0.8 },
  plain: { color: C.text, weight: 500 },
});

const KEYWORDS = {
  js: 'const let var function return if else for while of in new await async import from export default class extends try catch throw typeof',
  python: 'def return if elif else for while in not and or import from as class try except raise with lambda pass async await',
  shell: 'curl echo export cd ls cat python node npm pip sudo grep',
  json: '',
};
const LITERALS = new Set(['true', 'false', 'null', 'undefined', 'None', 'True', 'False']);
const kwSets = Object.fromEntries(Object.entries(KEYWORDS).map(([k, v]) => [k, new Set(v.split(' ').filter(Boolean))]));
const langKey = (language) => {
  const l = String(language || 'js').toLowerCase();
  if (l === 'json') return 'json';
  if (l === 'py' || l === 'python') return 'python';
  if (l === 'sh' || l === 'bash' || l === 'shell' || l === 'zsh') return 'shell';
  return 'js';
};

/**
 * Tiny deterministic tokenizer for ONE line of code → [{ text, type }] (types = keys of CODE_COLORS).
 * JSON: strings followed by ':' are keys. js/ts: // comments · python/shell: # comments.
 * Strings ('…', "…", `…`), numbers, keywords, literals, function names (word before '('), punctuation.
 */
export function tokenizeLine(line, language = 'js') {
  const lang = langKey(language);
  const kw = kwSets[lang];
  const out = [];
  const push = (text, type) => {
    const last = out[out.length - 1];
    if (last && last.type === type && (type === 'plain' || type === 'punct')) last.text += text;
    else out.push({ text, type });
  };
  const s = String(line);
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    const rest = s.slice(i);
    if ((lang === 'js' || lang === 'json') && rest.startsWith('//')) {
      push(rest, 'comment');
      break;
    }
    if ((lang === 'python' || lang === 'shell') && ch === '#' && (i === 0 || /\s/.test(s[i - 1]))) {
      push(rest, 'comment');
      break;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      let j = i + 1;
      while (j < s.length && s[j] !== ch) j += s[j] === '\\' ? 2 : 1;
      const str = s.slice(i, Math.min(j + 1, s.length));
      const after = s.slice(i + str.length);
      push(str, lang === 'json' && /^\s*:/.test(after) ? 'key' : 'string');
      i += str.length;
      continue;
    }
    const num = /^-?\d+(\.\d+)?([eE][+-]?\d+)?/.exec(rest);
    if (num && (i === 0 || !/[\w$]/.test(s[i - 1])) && (ch !== '-' || lang === 'json')) {
      push(num[0], 'number');
      i += num[0].length;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(rest);
    if (word) {
      const w = word[0];
      const next = s.slice(i + w.length);
      let type = 'plain';
      if (LITERALS.has(w)) type = 'literal';
      else if (kw.has(w)) type = 'keyword';
      else if (/^\s*\(/.test(next)) type = 'fn';
      else if (lang !== 'json' && /^\s*:/.test(next) && lang === 'js' && !/\?\s*$/.test(s.slice(0, i))) type = 'key';
      push(w, type);
      i += w.length;
      continue;
    }
    push(ch, /[{}[\]().,:;=+\-*/<>!&|%?]/.test(ch) ? 'punct' : 'plain');
    i += 1;
  }
  return out;
}

/** Cut a line to `cols` graphemes (ellipsis at the end) so it never overflows its card. */
export function fitLine(line, cols) {
  const g = graphemes(line);
  if (g.length <= cols) return g.join('');
  return g.slice(0, Math.max(0, cols - 1)).join('') + '…';
}

/** Tokens clipped to the first `n` UTF-16 units of the line (n is always a grapheme boundary). */
function clipTokens(tokens, n) {
  if (n == null) return tokens;
  const out = [];
  let used = 0;
  for (const t of tokens) {
    if (used >= n) break;
    const take = t.text.slice(0, n - used);
    out.push({ ...t, text: take });
    used += take.length;
  }
  return out;
}

/** One <text> of mono tokens starting at (x, baseline). */
export function CodeLine({ x, y, tokens, fontSize, opacity = 1 }) {
  if (!tokens.length) return null;
  return (
    <text x={x} y={y} fontFamily={MONO} fontSize={fontSize} xmlSpace="preserve" style={{ whiteSpace: 'pre' }} opacity={opacity < 1 ? opacity : undefined}>
      {tokens.map((t, i) => {
        const st = CODE_COLORS[t.type] || CODE_COLORS.plain;
        return (
          <tspan key={i} fill={st.color} fontWeight={st.weight} fillOpacity={st.opacity}>
            {t.text}
          </tspan>
        );
      })}
    </text>
  );
}

/** The code card body shared by CodeBlock / JsonView / LogCard: bgAlt, radius 20, dotInactive 2 stroke. */
export function CodeCard({ x, y, w, h, dashed = false }) {
  return (
    <rect x={x} y={y} width={w} height={h} rx={20} fill={C.bgAlt} stroke={C.dotInactive} strokeWidth={2} strokeDasharray={dashed ? '12 10' : undefined} />
  );
}

/** Width of the corner MINH HỌA tag (mirror of IllustrativeStamp 'tag'), for reserving header space. */
export function illustrativeTagWidth(illustrative) {
  if (!illustrative) return 0;
  const label = typeof illustrative === 'string' ? illustrative : 'MINH HỌA';
  if (isHiddenIllustrativeLabel(label)) return 0;
  return pillWidth(label, 17) + label.length * 1.1;
}

export const CODE_HEADER_H = 58;

/**
 * Lesson code card (SVG): a snippet in monospace with restrained, palette-only syntax colors.
 * Anatomy: bgAlt card (radius 20, dotInactive 2 stroke) · optional header bar 58 px (filename in mono
 * 19 textMuted + language Chip, MINH HỌA tag top-right, 2 px divider) · optional line-number gutter
 * (mono, textMuted 55 %) · lines at fontSize (default 22) × 1.45 line height, cut with "…" at the card edge.
 * States: `highlight` [line numbers, 1-based] → red-soft band + 6 px red left marker (`tone="accent"`:
 * accent-tint band + accent marker); other lines dim to 38 % (`dim={false}` to keep them). `highlightAt`
 * fades the band + dim in over 18 f. Typing: pass `frame` (+ `start`, `cps`, default 30 chars/s) →
 * the whole text types grapheme-safe via typeText, red caret at the end while typing. Omit `frame` = settled.
 * Height: auto = header + 18 px padding × 2 + lines × lineHeight (or pass `h`).
 */
export function CodeBlock({
  x,
  y,
  w = 900,
  h,
  code = '',
  language = 'js',
  title,
  highlight = [],
  tone = 'red',
  dim = true,
  highlightAt,
  frame,
  start = 0,
  cps = 30,
  fontSize = 22,
  lineNumbers = true,
  illustrative = false,
  showLanguage = true,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const lines = String(code).replace(/\n$/, '').split('\n');
  const lh = Math.round(fontSize * CODE_LINE_HEIGHT);
  const cw = fontSize * MONO_EM;
  const hasHeader = Boolean(title || (showLanguage && language) || illustrative);
  const headerH = hasHeader ? CODE_HEADER_H : 0;
  const padY = 18;
  const H = h ?? headerH + padY * 2 + lines.length * lh;
  const gutterW = lineNumbers ? String(lines.length).length * cw + 30 : 0;
  const textX = x + 24 + gutterW;
  const cols = Math.max(4, Math.floor((x + w - 20 - textX) / cw));
  const shown = lines.map((l) => fitLine(l, cols));

  // typing over the whole text (grapheme-safe); settled when frame is undefined
  const full = shown.join('\n');
  const typing = frame != null;
  const visible = typing ? typeText(full, frame, start, cps) : full;
  const visLines = visible.split('\n');
  const done = visible.length >= full.length;

  const hl = new Set(highlight);
  const hlO = hl.size ? (highlightAt != null && frame != null ? appear(frame, highlightAt, 18) : 1) : 0;
  const markColor = tone === 'accent' ? C.accent : C.red;
  const bandFill = tone === 'accent' ? alpha('accent', 0.12) : C.redSoft;
  const top = y + headerH + padY;

  let caret = null;
  if (typing && !done) {
    const li = visLines.length - 1;
    const cx = textX + graphemes(visLines[li]).length * cw + 2;
    caret = <rect x={cx} y={top + li * lh + (lh - fontSize * 1.15) / 2} width={3} height={fontSize * 1.15} fill={C.red} />;
  }

  const langLabel = String(language || '').toUpperCase();
  const langW = langLabel ? Math.round(langLabel.length * 10.5 + 26) : 0;
  const tagW = illustrativeTagWidth(illustrative);

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <CodeCard x={x} y={y} w={w} h={H} />
      {hasHeader ? (
        <>
          {title ? (
            <text x={x + 24} y={y + 36} fontFamily={MONO} fontSize={19} fontWeight={600} fill={C.textMuted}>
              {title}
            </text>
          ) : null}
          {showLanguage && langLabel ? (
            <Chip x={x + w - 16 - (tagW ? tagW + 12 : 0) - langW} y={y + 13} w={langW} h={32} size={15} label={langLabel} tone="blue" />
          ) : null}
          <line x1={x} x2={x + w} y1={y + headerH} y2={y + headerH} stroke={C.dotInactive} strokeWidth={2} />
        </>
      ) : null}
      {shown.map((line, i) => {
        const vis = visLines[i];
        if (vis == null) return null;
        const isHl = hl.has(i + 1);
        const bandY = top + i * lh;
        const base = bandY + lh / 2 + fontSize * 0.35;
        const lineO = hl.size && dim && !isHl ? 1 - 0.62 * clamp01(hlO) : 1;
        return (
          <g key={i}>
            {isHl && hlO > 0.001 ? (
              <g opacity={hlO < 1 ? hlO : undefined}>
                <rect x={x + 2} y={bandY} width={w - 4} height={lh} fill={bandFill} />
                <rect x={x + 2} y={bandY} width={6} height={lh} fill={markColor} />
              </g>
            ) : null}
            {lineNumbers ? (
              <text x={x + 24 + gutterW - 22} y={base} fontFamily={MONO} fontSize={fontSize * 0.86} fontWeight={500} textAnchor="end" fill={isHl && hlO > 0.5 ? markColor : C.textMuted} fillOpacity={isHl && hlO > 0.5 ? 1 : 0.55} opacity={lineO < 1 ? lineO : undefined}>
                {i + 1}
              </text>
            ) : null}
            <CodeLine x={textX} y={base} fontSize={fontSize} tokens={clipTokens(tokenizeLine(line, language), vis.length)} opacity={lineO} />
          </g>
        );
      })}
      {caret}
      {illustrativeTag(illustrative, { x, y, w, h: H })}
    </g>
  );
}

/** Auto height of a CodeBlock for the given props (for layout / connectors). */
export function codeBlockHeight({ code = '', fontSize = 22, title, language = 'js', illustrative = false, showLanguage = true }) {
  const n = String(code).replace(/\n$/, '').split('\n').length;
  const hasHeader = Boolean(title || (showLanguage && language) || illustrative);
  return (hasHeader ? CODE_HEADER_H : 0) + 36 + n * Math.round(fontSize * CODE_LINE_HEIGHT);
}
