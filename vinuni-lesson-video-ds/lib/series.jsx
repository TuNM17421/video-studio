import React from 'react';
import { FrameContext } from './player.jsx';

/**
 * Hard-cut sequence of scenes — the equivalent of Remotion <Series>.
 * sequences: [{ component, duration, authoredDuration?, name? }] in frames.
 * The active scene reads a scene-local frame through useFrame(). `authoredDuration` rescales that
 * frame linearly (like the repo's AuthoredFrameScale), so a scene authored for N frames can play inside
 * a measured narration cue of M frames without touching its beat constants.
 */
export function Series({ sequences, frame }) {
  let start = 0;
  for (let i = 0; i < sequences.length; i++) {
    const s = sequences[i];
    if (frame < start + s.duration) {
      const local = frame - start;
      const f = s.authoredDuration ? (local * s.authoredDuration) / s.duration : local;
      const Scene = s.component;
      return (
        <FrameContext.Provider value={f}>
          <Scene />
        </FrameContext.Provider>
      );
    }
    start += s.duration;
  }
  return null;
}

export const seriesDuration = (sequences) => sequences.reduce((sum, s) => sum + s.duration, 0);

export function seriesStarts(sequences) {
  const out = [];
  let t = 0;
  for (const s of sequences) {
    out.push(t);
    t += s.duration;
  }
  return out;
}
