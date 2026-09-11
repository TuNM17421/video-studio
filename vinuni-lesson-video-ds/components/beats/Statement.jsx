import React from 'react';
import { CLAMP, interpolate, spring } from '../../lib/motion.js';
import { iconComponent } from '../icons/Icons.jsx';

/**
 * Closing statement (HTML, full frame on bgAlt): red eyebrow · icon in a 100 px white circle
 * with a 3 px red ring and soft shadow · one or two sentences at 40 px / 500 / 1.5.
 * Port of ClosingStatementScene in Day01-345-LlmTransformerCost.tsx.
 */
export function Statement({ eyebrow, text, icon = 'chat-bubble', frame }) {
  const opacity = interpolate(frame, [0, 18], [0, 1], CLAMP);
  const scale = spring({ frame, config: { damping: 200 }, from: 0.94, to: 1 });
  const IconCmp = icon ? iconComponent(icon) : null;
  return (
    <div className="vk-statement">
      <div className="vk-statement__inner" style={{ opacity, transform: `scale(${scale})` }}>
        {eyebrow ? <div className="vk-center__eyebrow">{eyebrow}</div> : null}
        {IconCmp ? (
          <div className="vk-statement__icon">
            <IconCmp width="100%" height="100%" />
          </div>
        ) : null}
        <div className="vk-statement__text">{text}</div>
      </div>
    </div>
  );
}
