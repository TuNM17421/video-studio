import React from 'react';
import { C } from '../../lib/tokens.js';
import { appear, fade, popScale } from '../../lib/motion.js';

/**
 * Griffin — the VinUni mascot, as whole-body stickers (bản 1).
 *
 * The art pack has no headless body and no blank head yet, so nothing here is rigged: a pose is one
 * picture, and everything that moves moves the whole picture (enter, breathing, hops, a gentle sway).
 * Expression lives in a round badge next to the head, and props float above it — both swap on beats.
 *
 * The PNGs sit in assets/mascot/griffin/. Their URL is resolved against the bundle (dist/vk.js), so the
 * same scene works from a card, a video player, the Studio's /ds route and the render; `base` overrides it.
 */

const BUNDLE_SRC = (() => {
  if (typeof document === 'undefined') return '';
  const own = document.currentScript?.src;
  if (own) return own;
  const tag = [...document.querySelectorAll('script[src]')].find((s) => /dist\/vk\.js(\?|$)/.test(s.src));
  return tag ? tag.src : '';
})();
const DEFAULT_BASE = BUNDLE_SRC ? new URL('../assets/mascot/griffin/', BUNDLE_SRC).href : 'assets/mascot/griffin/';

/** Ready URL of one Griffin picture: griffinAsset('face_happy') — e.g. an avatar for DialogueCard. */
export const griffinAsset = (name, base = DEFAULT_BASE) => `${base}${name}.png`;

/**
 * Pixel size of each picture (trimmed to the drawing) and where the head sits, as fractions of it:
 * hx/hy = head centre, top = crest. The large poses are 1000 px tall; the four turn-arounds are small
 * (~225 px) and go soft above ~260 px on a 1080 frame.
 */
const POSES = {
  stand: { w: 848, h: 1000, hx: 0.53, hy: 0.3, top: 0.0 },
  sit: { w: 831, h: 1000, hx: 0.5, hy: 0.3, top: 0.0 },
  front: { file: 'body_front', w: 172, h: 226, hx: 0.58, hy: 0.3, top: 0.0 },
  left: { file: 'body_left', w: 171, h: 225, hx: 0.66, hy: 0.28, top: 0.0 },
  right: { file: 'body_right', w: 168, h: 223, hx: 0.34, hy: 0.28, top: 0.0 },
  back: { file: 'body_back', w: 132, h: 220, hx: 0.5, hy: 0.28, top: 0.0 },
};

const FACES = {
  neutral: [153, 215],
  happy: [149, 212],
  wink: [154, 213],
  thinking: [164, 213],
  surprised: [155, 214],
  sad: [152, 210],
  angry: [160, 216],
};

const PROPS = {
  lightbulb: { file: 'lightbulb', w: 51, h: 77 },
  question: { file: 'question_mark', w: 52, h: 62 },
  exclamation: { file: 'exclamation', w: 29, h: 60 },
  sparkle: { file: 'sparkle', w: 66, h: 76 },
  book: { file: 'book', w: 56, h: 93 },
  laptop: { file: 'laptop', w: 129, h: 85 },
  hat: { file: 'graduation_hat', w: 152, h: 98, worn: true },
};

export const GRIFFIN_POSES = Object.keys(POSES);
export const GRIFFIN_MOODS = Object.keys(FACES);
export const GRIFFIN_PROPS = Object.keys(PROPS);

/** `value` is a name, or a list of { at, name } steps (at = scene frame). → [{ at, name }] sorted. */
function steps(value) {
  if (!value) return [];
  if (typeof value === 'string') return [{ at: 0, name: value }];
  return [...value].filter((s) => s && s.name).sort((a, b) => a.at - b.at);
}

/** Opacity of each step: it fades in at its own `at` and out when the next one arrives. */
function stepOpacity(list, i, frame, span) {
  const s = list[i];
  const next = list[i + 1];
  const inOp = s.at <= 0 ? 1 : fade(frame, s.at, span);
  const outOp = next ? 1 - fade(frame, next.at, span) : 1;
  return Math.min(inOp, outOp);
}

/** One hop: 16 frames, up and down on a parabola, with a squash on take-off and landing. */
function hopAt(frame, hops, height) {
  let dy = 0;
  let squash = 0;
  for (const at of hops) {
    const t = frame - at;
    if (t >= -4 && t < 0) squash = Math.max(squash, (4 + t) / 4) * 1; // crouch
    if (t >= 0 && t <= 16) dy = Math.min(dy, -4 * (t / 16) * (1 - t / 16) * height);
    if (t > 16 && t <= 22) squash = Math.max(squash, 1 - (t - 16) / 6);
  }
  return { dy, squash };
}

export function Griffin({
  x,
  y,
  h = 440,
  pose = 'stand',
  flip = false,
  frame = 0,
  enter = null,
  motion = 'idle',
  hops = [],
  tilt = 0,
  mood = null,
  prop = null,
  bubbleSide = 'right',
  base = DEFAULT_BASE,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const P = POSES[pose] ?? POSES.stand;
  const w = (h * P.w) / P.h;

  // whole-body motion, all pivoting on the feet (x, y)
  const s = enter === null ? 1 : popScale(frame, enter);
  // before its entrance it still renders (at scale 0), so every picture is loaded by then
  const breathe = motion === 'idle' ? Math.sin((frame / 64) * Math.PI * 2) : 0;
  const sway = motion === 'float' ? Math.sin((frame / 90) * Math.PI * 2) * 2.5 : 0;
  const bob = motion === 'float' ? Math.sin((frame / 45) * Math.PI * 2) * h * 0.012 : 0;
  const hop = hopAt(frame, hops, h * 0.12);
  const sy = (1 + breathe * 0.012 - hop.squash * 0.06) * s;
  const sx = (1 - breathe * 0.004 + hop.squash * 0.04) * s;
  const angle = tilt + sway;

  // head in frame coordinates (ignores the tiny breathing scale)
  const hxFrac = flip ? 1 - P.hx : P.hx;
  const headX = x + (hxFrac - 0.5) * w * s;
  const headY = y + hop.dy + bob - (1 - P.hy) * h * s;
  const topY = y + hop.dy + bob - (1 - P.top) * h * s;
  const lift = hop.dy + bob;

  const moods = steps(mood);
  const props = steps(prop);
  const side = (bubbleSide === 'left') !== flip ? -1 : 1;

  // mood badge: beside the head, a little above it
  const br = Math.max(40, h * 0.15);
  const bx = headX + side * (h * 0.32 + br * 0.4);
  const by = headY - h * 0.2;
  const firstMood = moods[0]?.at ?? 0;
  const badgeScale = moods.length ? (firstMood <= 0 && enter === null ? 1 : popScale(frame, Math.max(firstMood, enter ?? 0))) : 0;

  // props: above the crest, bobbing on their own rhythm
  const ph = Math.max(46, h * 0.16);
  const px = headX - side * h * 0.04;
  const py = topY - ph * 0.75 + Math.sin((frame / 36) * Math.PI * 2) * 5;

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <ellipse cx={x} cy={y + 4} rx={w * 0.34 * s * (1 + lift / (h * 0.5))} ry={h * 0.025 * s} fill={C.text} opacity={0.12 * s} />
      <g transform={`translate(${x} ${y + lift}) rotate(${angle}) scale(${flip ? -sx : sx} ${sy})`}>
        <image href={griffinAsset(P.file || pose, base)} x={-w / 2} y={-h} width={w} height={h} />
      </g>

      {moods.length ? (
        <g transform={`translate(${bx} ${by + lift * 0.6}) scale(${badgeScale})`}>
          {/* tail toward the head */}
          <path
            d={`M ${-side * br * 0.55} ${br * 0.55} L ${-side * br * 1.2} ${br * 0.95} L ${-side * br * 0.2} ${br * 0.8} Z`}
            fill={C.bgAlt}
            stroke={C.accent}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <FaceStack id={`gm-${Math.round(x)}-${Math.round(y)}`} r={br} ring={C.accent} stroke={3} moods={moods} frame={frame} base={base} />
        </g>
      ) : null}

      {props.map((p, i) => {
        const def = PROPS[p.name];
        if (!def) return null;
        const o = stepOpacity(props, i, frame, 8);
        const pop = p.at <= 0 && enter === null ? 1 : popScale(frame, Math.max(p.at, enter ?? 0));
        // a worn prop sits on the head and moves with it; the others float above the crest
        const size = def.worn ? h * 0.36 : ph;
        const pw = def.worn ? size : (size * def.w) / def.h;
        const pH = def.worn ? (size * def.h) / def.w : size;
        const at = def.worn
          ? `translate(${headX} ${headY - h * 0.15}) rotate(${(flip ? 8 : -8) + angle}) scale(${pop})`
          : `translate(${px} ${py}) scale(${pop})`;
        // one twinkle per arrival, then the prop simply stays
        const tw = p.at > 0 ? appear(frame, p.at, 6) * (1 - fade(frame, p.at + 10, 12)) : 0;
        return (
          <g key={`${p.name}-${p.at}`} opacity={o < 1 ? o : undefined} transform={at}>
            {tw > 0.01
              ? [-1, 1].map((d) => (
                  <image
                    key={d}
                    href={griffinAsset('sparkle', base)}
                    x={d * pw * 0.8 - 12}
                    y={-pH * 0.55 - 12 + (d > 0 ? 18 : 0)}
                    width={24 * tw}
                    height={28 * tw}
                    opacity={tw}
                  />
                ))
              : null}
            <image href={griffinAsset(def.file, base)} x={-pw / 2} y={-pH / 2} width={pw} height={pH} />
          </g>
        );
      })}
    </g>
  );
}

/**
 * The face pictures are whole heads (crest on top, scarf below), so they are drawn larger than the ring
 * and clipped to it, eyes and beak at the centre. Every step renders — hidden ones at opacity 0 — so a
 * picture is already loaded when its beat arrives.
 */
function FaceStack({ id, r, ring, stroke, moods, frame, base }) {
  const fh = r * 2.2;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <circle r={r - stroke / 2} />
        </clipPath>
      </defs>
      <circle r={r} fill={C.bgAlt} />
      <g clipPath={`url(#${id})`}>
        {moods.map((m, i) => {
          const name = FACES[m.name] ? m.name : 'neutral';
          const fw = (fh * FACES[name][0]) / FACES[name][1];
          const o = stepOpacity(moods, i, frame, 8);
          return (
            <image
              key={`${m.name}-${m.at}`}
              href={griffinAsset(`face_${name}`, base)}
              x={-fw / 2}
              y={-fh * 0.55 + r * 0.08}
              width={fw}
              height={fh}
              opacity={o < 1 ? o : undefined}
            />
          );
        })}
      </g>
      <circle r={r} fill="none" stroke={ring} strokeWidth={stroke} />
    </>
  );
}

/** GriffinBadge — just the face in a round frame: a reaction mark, or a speaker face beside a line. */
export function GriffinBadge({ x, y, r = 56, mood = 'neutral', frame = 0, enter = null, tone = 'accent', base = DEFAULT_BASE, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const s = enter === null ? 1 : popScale(frame, enter);
  // before its entrance it still renders (at scale 0), so every picture is loaded by then
  const moods = steps(mood);
  const ring = { accent: C.accent, strong: C.accentStrong, red: C.red, muted: C.textMuted }[tone] ?? C.accent;
  return (
    <g opacity={opacity < 1 ? opacity : undefined} transform={`translate(${x} ${y}) scale(${s})`}>
      <FaceStack id={`gb-${Math.round(x)}-${Math.round(y)}`} r={r} ring={ring} stroke={4} moods={moods} frame={frame} base={base} />
    </g>
  );
}
