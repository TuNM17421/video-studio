import React from 'react';
import { CLAMP, EASE, interpolate } from '../../lib/motion.js';

/**
 * Opening hook question (HTML overlay, 150 frames) laid over scene 1 — the hook is PART of the
 * first scene, and authored content starts only after it clears (content frame = frame − 150).
 *   8→28  question fades in and rises 18 px (out ease)
 *   30→58 red underline draws 0→184 px (in-out)
 *   116→132 question exits (exit ease) · 134→149 white backdrop fades to reveal the scene
 * 72 px bold, −1.2 px tracking, max two lines (use "\n"). Port of D28HookIntro.
 */
export function HookOverlay({ question, frame, duration = 150 }) {
  if (frame >= duration) return null;
  const backdrop = interpolate(frame, [duration - 16, duration - 1], [1, 0], { ...CLAMP, easing: EASE.exit });
  const enter = interpolate(frame, [8, 28], [0, 1], { ...CLAMP, easing: EASE.out });
  const exit = interpolate(frame, [duration - 34, duration - 18], [1, 0], { ...CLAMP, easing: EASE.exit });
  const rise = interpolate(frame, [8, 28], [18, 0], { ...CLAMP, easing: EASE.out });
  const line = interpolate(frame, [30, 58], [0, 184], { ...CLAMP, easing: EASE.draw });
  return (
    <div className="vk-hook">
      <div className="vk-hook__bg" style={{ opacity: backdrop }} />
      <div className="vk-hook__inner" style={{ opacity: enter * exit, transform: `translateY(${rise}px)` }}>
        <div className="vk-hook__q">{question}</div>
        <div className="vk-hook__line" style={{ width: line }} />
      </div>
    </div>
  );
}
