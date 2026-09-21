import React from 'react';
import { Card, Griffin, NumberBadge, SceneFrame, SvgText } from '../../../../components/index.js';
import { C } from '../../../../lib/tokens.js';
import { appear, cueCaptions, sliceCaptions } from '../../../../lib/index.js';
import { CUES } from './cues.js';
import { TIMELINE } from './timeline.js';

export const EYEBROW = 'VIDEO STUDIO · VIDEO MẪU';
export const VIDEO_LABEL = 'Mẫu · Griffin kể năm bước làm video';

export const cue = (n) => CUES[n - 1];

/** The five production steps of the Studio, in order — the rail every middle scene is built on. */
export const STEPS = ['Kế hoạch', 'Lời & cue', 'Giọng đọc', 'Dựng cảnh', 'Render'];

/*
 * Layout (1920 × 1080, content zone y 250–960):
 *   · RAIL — the five steps across the top of the content zone, y 280–376.
 *   · STAGE — the illustration of the step being told, x 130–1330, y 440–900.
 *   · GUIDE — Griffin standing at the right, feet on y 930.
 */
export const RAIL = { x: 130, y: 280, w: 312, h: 96, gap: 22 };
export const STAGE = { x: 130, y: 440, w: 1200, h: 460 };
export const GUIDE = { x: 1620, y: 930, h: 470 };

const railX = (i) => RAIL.x + i * (RAIL.w + RAIL.gap);

/**
 * The five steps as cards. `active` = index of the step being told (pulses once on arrival); steps before it
 * read as done, steps after it are dimmed. `done` = how many carry a tick (câu 07 ticks them one by one).
 */
export function StepRail({ frame, active = -1, activeAt = 0, done = 0, doneAt = [], opacity = 1 }) {
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {STEPS.map((label, i) => {
        const x = railX(i);
        const isActive = i === active;
        const future = active >= 0 && i > active;
        const tick = i < done ? appear(frame, doneAt[i] ?? 0, 10) : 0;
        return (
          <g key={label}>
            <Card
              x={x}
              y={RAIL.y}
              w={RAIL.w}
              h={RAIL.h}
              label={`BƯỚC ${i + 1}`}
              lines={[label]}
              size={26}
              accent={isActive ? C.red : C.accent}
              active={isActive ? appear(frame, activeAt, 12) : 0}
              muted={future ? 1 : 0}
            />
            {tick > 0.01 ? (
              <g opacity={tick}>
                <circle cx={x + RAIL.w - 30} cy={RAIL.y + 30} r={18} fill={C.accent} />
                <path
                  d={`M ${x + RAIL.w - 39} ${RAIL.y + 30} l 6 7 l 12 -13`}
                  fill="none"
                  stroke={C.bg}
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

/** Griffin as the guide at the right of the frame; pose / mood / prop / hops pass straight through. */
export function Guide({ frame, ...rest }) {
  return <Griffin x={GUIDE.x} y={GUIDE.y} h={GUIDE.h} frame={frame} {...rest} />;
}

/** A numbered row card (a câu cut from the script). */
export function Row({ x, y, w, n, text, opacity = 1 }) {
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <Card x={x} y={y} w={w} h={62} lines={[text]} size={22} />
      <NumberBadge x={x - 34} y={y + 31} value={n} r={20} />
    </g>
  );
}

/** Big words at the left of the stage (opening / closing scenes). */
export function Headline({ lines, frame, at = [], x = 200, y = 560, size = 84 }) {
  return lines.map((l, i) => (
    <SvgText
      key={l.text}
      x={x}
      y={y + i * (size * 1.25)}
      size={i === 0 ? size : size * 0.52}
      weight={i === 0 ? 800 : 700}
      color={l.color ?? (i === 0 ? C.text : C.textMuted)}
      anchor="start"
      opacity={appear(frame, at[i] ?? 0, 14)}
    >
      {l.text}
    </SvgText>
  ));
}

// Captions follow the playback timeline (measured narration once voice.js is bound) and are then mapped
// into the scene's authored frames, because Series hands scenes authored time.
const CAPTIONS = cueCaptions(TIMELINE.map((t) => ({ start: t.start, end: t.end, text: t.text, pause: t.pause })));

export const captionsFor = (n) => {
  const t = TIMELINE[n - 1];
  const k = t.authored / t.duration;
  return sliceCaptions(CAPTIONS, t.start, t.duration).map((c) => ({
    start: Math.round(c.start * k),
    end: c.end === t.duration ? t.authored : Math.round(c.end * k),
    text: c.text,
  }));
};
export const footerFor = (n) => ({ left: VIDEO_LABEL, right: `Câu ${String(n).padStart(2, '0')} / ${CUES.length}` });

/** Common shell: header from the cue, footer, captions. */
export function Scene({ n, frame, children }) {
  const c = cue(n);
  return (
    <SceneFrame frame={frame} eyebrow={EYEBROW} title={c.title} tag={c.tag} footer={footerFor(n)} captions={captionsFor(n)}>
      {children}
    </SceneFrame>
  );
}
