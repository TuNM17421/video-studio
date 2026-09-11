import React from 'react';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';
import { iconComponent } from '../icons/Icons.jsx';

/**
 * Brand title card (HTML, full frame, white): red eyebrow · icon in a 120 px bgAlt circle
 * (spring pop) · 62 px title · 140×6 red bar. The whole block fades in over 18 frames and
 * settles with a damping-200 spring 0.94→1. Port of BrandTitleScene in lightScene.tsx.
 */
export function BrandTitle({ eyebrow, title, icon = 'neural-net', frame }) {
  const opacity = interpolate(frame, [0, 18], [0, 1], CLAMP);
  const scale = spring({ frame, config: { damping: 200 }, from: 0.94, to: 1 });
  const iconScale = spring({ frame, config: { damping: 12 } });
  const IconCmp = iconComponent(icon);
  return (
    <div className="vk-center">
      <div className="vk-center__inner" style={{ opacity, transform: `scale(${scale})` }}>
        {eyebrow ? <div className="vk-center__eyebrow">{eyebrow}</div> : null}
        {IconCmp ? (
          <div className="vk-brand__icon" style={{ transform: `scale(${iconScale})` }}>
            <IconCmp width="100%" height="100%" />
          </div>
        ) : null}
        <div className="vk-brand__title">{title}</div>
        <div className="vk-brand__bar" />
      </div>
    </div>
  );
}
