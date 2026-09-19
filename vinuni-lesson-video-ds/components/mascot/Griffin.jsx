import React from 'react';
import { C } from '../../lib/tokens.js';
import { appear, fade, popScale } from '../../lib/motion.js';
import { MOOD_LABELS, PIC_H, POSES, PROPS } from './griffinPoses.js';

/**
 * Griffin — the VinUni mascot (bản 2: whole-body pictures, one per pose × mood).
 *
 * Every pose is drawn with some of the seven moods — the four sets with all of them, the gestures so far
 * with one. Which exist is in griffinPoses.js, generated with the pictures by tools/griffin-assets.py; a
 * mood a pose does not have falls back to that pose's default picture. Within a pose the pictures were
 * registered onto each other (scale + shift, legs weighted) and share one canvas, so a mood change swaps
 * the picture in place. They are still separate drawings, not a
 * rig: a crossfade would show two outlines, so every change is a hard cut hidden under a small squash —
 * which reads as the mascot reacting.
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

/** Ready URL of one Griffin picture: griffinAsset('face-happy') is a square avatar for DialogueCard. */
export const griffinAsset = (name, base = DEFAULT_BASE) => `${base}${name}.png`;

/** Mood names; `angry` is kept as an alias of `stern` (bản 1 called it that). */
const MOODS = Object.keys(MOOD_LABELS);
const moodName = (m) => (m === 'angry' ? 'stern' : MOODS.includes(m) ? m : 'neutral');

export const GRIFFIN_POSES = Object.keys(POSES);
export const GRIFFIN_MOODS = MOODS;
/** The moods each pose is drawn with: { stand: ['neutral', …], wave: ['neutral'], … }. */
export const GRIFFIN_POSE_MOODS = Object.fromEntries(Object.entries(POSES).map(([k, v]) => [k, v.moods]));
export const GRIFFIN_PROPS = Object.keys(PROPS);

/** `value` is a name, or a list of { at, name } steps (at = scene frame). → [{ at, name }] sorted. */
function steps(value) {
  if (!value) return [];
  if (typeof value === 'string') return [{ at: 0, name: value }];
  return [...value].filter((s) => s && s.name).sort((a, b) => a.at - b.at);
}

/** The step in force at `frame` (the first one before any has started). */
const current = (list, frame) => list.reduce((cur, s) => (s.at <= frame ? s : cur), list[0]);

/** Opacity of each prop step: it fades in at its own `at`, and clears fast (4 frames) when the next one
 *  pops in — two props overlapping for long read as one muddled shape. */
function stepOpacity(list, i, frame, span) {
  const s = list[i];
  const next = list[i + 1];
  const inOp = s.at <= 0 ? 1 : fade(frame, s.at, span);
  const outOp = next ? 1 - fade(frame, next.at, 4) : 1;
  return Math.min(inOp, outOp);
}

/** The picture for a pose + mood; a mood the pose is not drawn with falls back to its default (first). */
function pictureOf(pose, mood) {
  const drawn = POSES[pose].moods;
  const m = moodName(mood);
  return `${pose}-${drawn.includes(m) ? m : drawn[0]}`;
}

/** Squash 0→1→0 over 8 frames after each cut: it hides the swap and reads as a reaction. */
function squashAt(frame, cuts) {
  let q = 0;
  for (const at of cuts) {
    const t = frame - at;
    if (t >= 0 && t < 8) q = Math.max(q, Math.sin((t / 8) * Math.PI));
  }
  return q;
}

/** One hop: 16 frames, up and down on a parabola, with a squash on take-off and landing. */
function hopAt(frame, hops, height) {
  let dy = 0;
  let squash = 0;
  for (const at of hops) {
    const t = frame - at;
    if (t >= -4 && t < 0) squash = Math.max(squash, (4 + t) / 4);
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
  mood = 'neutral',
  flip = false,
  frame = 0,
  enter = null,
  motion = 'idle',
  hops = [],
  tilt = 0,
  prop = null,
  base = DEFAULT_BASE,
  opacity = 1,
}) {
  if (opacity <= 0.001) return null;
  const poses = steps(pose).filter((p) => POSES[p.name]);
  const moods = steps(mood);
  if (!poses.length) poses.push({ at: 0, name: 'stand' });
  if (!moods.length) moods.push({ at: 0, name: 'neutral' });
  const nowPose = current(poses, frame).name;
  const nowMood = current(moods, frame).name;
  const P = POSES[nowPose];
  const w = (h * P.w) / PIC_H;

  // whole-body motion, all pivoting on the feet (x, y); before its entrance it still renders at scale 0
  const s = enter === null ? 1 : popScale(frame, enter);
  const walking = P.walk && motion !== 'none';
  const breathe = motion === 'idle' && !walking ? Math.sin((frame / 64) * Math.PI * 2) : 0;
  const sway =
    motion === 'float' ? Math.sin((frame / 90) * Math.PI * 2) * 2.5 : walking ? Math.sin((frame / 14) * Math.PI * 2) * 2 : 0;
  const bob =
    motion === 'float'
      ? Math.sin((frame / 45) * Math.PI * 2) * h * 0.012
      : walking
        ? -Math.abs(Math.sin((frame / 14) * Math.PI)) * h * 0.025
        : 0;
  const hop = hopAt(frame, hops, h * 0.12);
  // a cut is any step where the picture really changes (a mood the pose lacks changes nothing)
  const pictureAt = (f) => pictureOf(current(poses, f).name, current(moods, f).name);
  const cuts = [...poses, ...moods].map((c) => c.at).filter((at) => at > 0 && pictureAt(at) !== pictureAt(at - 1));
  const q = squashAt(frame, cuts);
  const sy = (1 + breathe * 0.012 - hop.squash * 0.06 - q * 0.05) * s;
  const sx = (1 - breathe * 0.004 + hop.squash * 0.04 + q * 0.03) * s;
  const angle = tilt + sway;
  const lift = hop.dy + bob;

  // head centre and crest top in frame coordinates (ignores the small breathing scale)
  const hxFrac = flip ? 1 - P.hx : P.hx;
  const headX = x + (hxFrac - 0.5) * w * s;
  const topY = y + lift - h * s;

  // Every picture this Griffin will ever show is in the page from frame 0 (1 px, invisible), so the
  // render never paints a frame on which the next picture has not loaded yet.
  const all = new Set();
  for (const p of poses) for (const m of moods) all.add(pictureOf(p.name, m.name));
  const shown = pictureOf(nowPose, nowMood);

  const props = steps(prop);
  const ph = Math.max(46, h * 0.16);
  // floating props hang beside the crest, up and to the facing side of the head (not on top of it, where
  // they read as a hat); flip mirrors the side
  const px = headX + (flip ? -1 : 1) * h * 0.21;
  const py = topY + h * 0.03 + Math.sin((frame / 36) * Math.PI * 2) * 5;

  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      {[...all].map((name) =>
        name === shown ? null : <image key={name} href={griffinAsset(name, base)} x={x} y={y} width={1} height={1} opacity={0} />,
      )}
      <ellipse cx={x} cy={y + 4} rx={w * 0.34 * s * (1 + lift / (h * 0.5))} ry={h * 0.025 * s} fill={C.text} opacity={0.12 * s} />
      <g transform={`translate(${x} ${y + lift}) rotate(${angle}) scale(${flip ? -sx : sx} ${sy})`}>
        <image href={griffinAsset(shown, base)} x={-w / 2} y={-h} width={w} height={h} />
      </g>

      {props.map((p, i) => {
        const def = PROPS[p.name];
        if (!def) return null;
        const o = stepOpacity(props, i, frame, 8);
        const pop = p.at <= 0 && enter === null ? 1 : popScale(frame, Math.max(p.at, enter ?? 0));
        const pH = ph * (def.k ?? 1);
        const pw = (pH * def.w) / def.h;
        // one twinkle per arrival, then the prop simply stays
        const tw = p.at > 0 ? appear(frame, p.at, 6) * (1 - fade(frame, p.at + 10, 12)) : 0;
        return (
          <g key={`${p.name}-${p.at}`} opacity={o < 1 ? o : undefined} transform={`translate(${px} ${py}) scale(${pop})`}>
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
 * GriffinBadge — the face in a round frame: a reaction mark beside an idea. The heads are the pack's own
 * face drawings (badge-<mood>.png, ~150×210 px — sharp up to r ≈ 100); mood changes cut with a small pop.
 * A square avatar for DialogueCard is face-<mood>.png instead, cut from the `stand` set.
 */
export function GriffinBadge({ x, y, r = 56, mood = 'neutral', frame = 0, enter = null, tone = 'accent', base = DEFAULT_BASE, opacity = 1 }) {
  if (opacity <= 0.001) return null;
  const s = enter === null ? 1 : popScale(frame, enter);
  const moods = steps(mood);
  if (!moods.length) moods.push({ at: 0, name: 'neutral' });
  const now = moodName(current(moods, frame).name);
  const q = squashAt(frame, moods.map((m) => m.at).filter((at) => at > 0));
  const ring = { accent: C.accent, strong: C.accentStrong, red: C.red, muted: C.textMuted }[tone] ?? C.accent;
  const id = `gb-${Math.round(x)}-${Math.round(y)}`;
  const names = [...new Set(moods.map((m) => moodName(m.name)))];
  // the heads are drawn larger than the ring and clipped to it (crest on top, scarf below), eyes and beak
  // at the centre; the box keeps their ~0.72 aspect and the image fits inside it
  const fh = r * 2.0;
  const fw = fh * 0.74;
  return (
    <g opacity={opacity < 1 ? opacity : undefined} transform={`translate(${x} ${y}) scale(${s * (1 + q * 0.06)})`}>
      <defs>
        <clipPath id={id}>
          <circle r={r - 2} />
        </clipPath>
      </defs>
      <circle r={r} fill={C.bgAlt} />
      <g clipPath={`url(#${id})`}>
        {names.map((name) => (
          <image
            key={name}
            href={griffinAsset(`badge-${name}`, base)}
            x={-fw / 2}
            y={-fh * 0.47}
            width={fw}
            height={fh}
            opacity={name === now ? undefined : 0}
          />
        ))}
      </g>
      <circle r={r} fill="none" stroke={ring} strokeWidth={4} />
    </g>
  );
}
