import React from 'react';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';
import { ICONS } from '../icons/Icons.jsx';

/**
 * Chapter break (HTML, full frame, white): red eyebrow · optional icon in a 90 px red-ringed
 * circle · big red number (92 px) · 54 px navy label, left-aligned beside it. Opacity 0→1 over
 * 16 frames, spring damping 14 / stiffness 120. Port of SectionNumberCard in scenes.tsx.
 */
export function SectionCard({ number, label, eyebrow, icon, frame }) {
  const opacity = interpolate(frame, [0, 16], [0, 1], CLAMP);
  const scale = spring({ frame, config: { damping: 14, stiffness: 120 } });
  const IconCmp = icon ? ICONS[icon] : null;
  return (
    <div className="vk-section">
      {eyebrow ? (
        <div className="vk-section__eyebrow" style={{ opacity }}>
          {eyebrow}
        </div>
      ) : null}
      <div className="vk-section__row" style={{ opacity, transform: `scale(${scale})` }}>
        {IconCmp ? (
          <div className="vk-section__icon">
            <IconCmp width="100%" height="100%" />
          </div>
        ) : null}
        <div className="vk-section__text">
          <div className="vk-section__num">{number}</div>
          <div className="vk-section__label">{label}</div>
        </div>
      </div>
    </div>
  );
}
