import React from 'react';
import { C } from '../../lib/tokens.js';
import { appear } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/**
 * DialogueCard — one character's line in a conversation video, revealed word by word on the real voice.
 *
 * The text on screen IS the narration: pass `words` from `spokenWords(n)` (lib/speech.js) and every word
 * appears at the frame it is actually said. Writing a shortened caption by hand is what makes screen and
 * voice drift apart, so this component does not accept one.
 */

const TONES = {
  accent: C.accent,
  strong: C.accentStrong,
  red: C.red,
  muted: C.textMuted,
};

/**
 * textWidth() is a box-sizing estimate, and for Vietnamese at weight 600 it reads 7–13 % LOW (measured
 * against getComputedTextLength in Montserrat). Wrapping on the raw estimate pushes the last word of a row
 * past the card edge, so the break is computed against a width shrunk by this margin. Do not "fix"
 * textWidth itself — every box in the design system is sized with it.
 */
const WIDTH_SAFETY = 1.15;

/** Greedy wrap of the words into rows that stay inside `w` once really drawn. */
export function wrapWords(words, w, size, weight = 600) {
  const limit = w / WIDTH_SAFETY;
  const rows = [[]];
  let width = 0;
  const space = textWidth(' ', size, weight);
  for (const word of words) {
    const wordW = textWidth(word.text, size, weight);
    const next = rows[rows.length - 1].length ? width + space + wordW : wordW;
    if (next > limit && rows[rows.length - 1].length) {
      rows.push([word]);
      width = wordW;
    } else {
      rows[rows.length - 1].push(word);
      width = next;
    }
  }
  return rows;
}

export function DialogueCard({
  x,
  y,
  w = 640,
  side = 'left',
  speaker,
  avatar,
  words = [],
  frame = Infinity,
  tone = 'accent',
  size = 26,
  lineHeight = 38,
  opacity = 1,
}) {
  if (opacity <= 0.001 || !words.length) return null;
  const c = TONES[tone] ?? TONES.accent;
  const padX = 26;
  const padY = 22;
  const rows = wrapWords(words, w - padX * 2, size);
  const h = padY * 2 + rows.length * lineHeight;
  const nameSize = 19;
  // The face sits outside the card, on the speaker's own side, so the card keeps its full width for text.
  const faceR = 46;
  const faceGap = 20;
  const faceX = side === 'left' ? x - faceGap - faceR : x + w + faceGap + faceR;
  const faceY = y + h - faceR;
  // The tail sits under the card on the speaker's own side, so who is talking reads at a glance.
  const tailX = side === 'left' ? x + 46 : x + w - 46;
  const tipX = side === 'left' ? x + 20 : x + w - 20;
  const r = 20;

  const clipId = `dlg-face-${side}-${Math.round(x)}-${Math.round(y)}`;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {avatar ? (
        <g>
          <defs>
            <clipPath id={clipId}>
              <circle cx={faceX} cy={faceY} r={faceR} />
            </clipPath>
          </defs>
          <image
            href={avatar}
            x={faceX - faceR}
            y={faceY - faceR}
            width={faceR * 2}
            height={faceR * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
          />
          <circle cx={faceX} cy={faceY} r={faceR} fill="none" stroke={c} strokeWidth={4} />
        </g>
      ) : null}
      <SvgText
        x={side === 'left' ? x + padX : x + w - padX}
        y={y - 12}
        size={nameSize}
        weight={700}
        color={c}
        anchor={side === 'left' ? 'start' : 'end'}
      >
        {speaker}
      </SvgText>
      <path
        d={
          side === 'left'
            ? `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${tailX} L ${tipX} ${y + h + 22} L ${tailX - 26} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
            : `M ${x + r} ${y} H ${x + w - r} Q ${x + w} ${y} ${x + w} ${y + r} V ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} H ${tailX + 26} L ${tipX} ${y + h + 22} L ${tailX} ${y + h} H ${x + r} Q ${x} ${y + h} ${x} ${y + h - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
        }
        fill={C.bgAlt}
        stroke={c}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {rows.map((row, ri) => (
        // One <text> per row with a <tspan> per word: the browser does the spacing, so nothing depends on
        // an estimate. Positioning words one by one with textWidth() compounds its error and jams them
        // together. xml:space keeps the separators, since SVG would otherwise collapse them.
        <text
          key={`row-${ri}`}
          x={x + padX}
          y={y + padY + ri * lineHeight + size}
          fill={C.text}
          fontSize={size}
          fontWeight={600}
          textAnchor="start"
          xmlSpace="preserve"
        >
          {row.map((word, wi) => (
            <tspan key={`${ri}-${wi}-${word.text}`} opacity={appear(frame, word.frame, 7)}>
              {wi ? ' ' : ''}
              {word.text}
            </tspan>
          ))}
        </text>
      ))}
    </g>
  );
}
