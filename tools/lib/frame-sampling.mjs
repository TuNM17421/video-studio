/**
 * Where a render samples the scene clock.
 *
 * Scenes are authored in whole frames at 30 fps — that is the unit of cues.js, voice.js, timeline.js and
 * spokenAt(), and nothing here changes it. An output frame rate above 30 only samples that same clock more
 * densely: at 60 fps the render asks the player for 40, 40.5, 41… and gets the picture in between, because
 * every motion helper is a continuous function of the frame (interpolate is arithmetic; spring splits its
 * input into whole + rest) and the player no longer rounds.
 *
 * Kept apart from render.mjs because an off-by-one here is invisible: the file still plays, it is just
 * short or long by a frame, and the audio-length check works in source frames so it would not notice.
 */

/**
 * @param {number} from   first source frame (inclusive)
 * @param {number} to     last source frame (exclusive) — the same half-open range render.mjs already uses
 * @param {number} outFps output frame rate
 * @param {number} srcFps authoring frame rate (lib/tokens.js FPS)
 * @returns {{ step: number, shots: number, sourceFrame: (i: number) => number }}
 */
export function frameSampling(from, to, outFps, srcFps) {
  if (!(srcFps > 0)) throw new Error('frameSampling: srcFps phải > 0');
  if (!(outFps > 0)) throw new Error('frameSampling: outFps phải > 0');
  const step = srcFps / outFps;
  // Round, not ceil: at 60 fps a 1133-frame scene is exactly 2266 shots, and the last one (1132.5) still
  // falls inside the range. Ceil would add a shot past `to` on any rate that does not divide evenly.
  const shots = Math.max(0, Math.round((to - from) / step));
  return { step, shots, sourceFrame: (i) => from + i * step };
}
