import React from 'react';
import { CLAMP, interpolate } from '../../lib/motion.js';

/**
 * Recap rail (HTML overlay inside a SceneFrame): numbered red rings on a vertical rail whose red
 * fill grows as rows reveal; each row is a bgAlt card (3 px accentStrong stroke, radius 22) with
 * an uppercase strong-blue title column and a bold body. Rows slide 44 px from the right and fade
 * over 24–30 frames at `reveals[i]`. Optional closing line in a red-outlined box.
 * Port of D28RecapScene, re-seated under the centered header (content starts at y 262).
 */
export function Recap({ items, frame, reveals, closing, closingAt, top = 262, gap = 140, rowH = 116, railX = 150, cardX = 200, cardW = 1540 }) {
  const first = reveals[0] ?? 0;
  const last = reveals[reveals.length - 1] ?? first;
  const railProgress = interpolate(frame, [first, last + 50], [0, 1], CLAMP);
  const railTop = top + rowH / 2;
  const railH = gap * Math.max(0, items.length - 1);
  const closeAt = closingAt ?? last + 60;
  const closeOpacity = interpolate(frame, [closeAt, closeAt + 28], [0, 1], CLAMP);
  const closeRise = interpolate(frame, [closeAt, closeAt + 28], [24, 0], CLAMP);
  return (
    <>
      <div className="vk-recap__rail" style={{ left: railX - 3, top: railTop, height: railH }} />
      <div className="vk-recap__rail vk-recap__rail--fill" style={{ left: railX - 3, top: railTop, height: railH * railProgress }} />
      {items.map((item, i) => {
        const at = reveals[i] ?? first;
        const opacity = interpolate(frame, [at, at + 24], [0, 1], CLAMP);
        const slide = interpolate(frame, [at, at + 30], [44, 0], CLAMP);
        const scale = interpolate(frame, [at, at + 24], [0.82, 1], CLAMP);
        const rowTop = top + gap * i;
        return (
          <React.Fragment key={item.title}>
            <div className="vk-recap__card" style={{ left: cardX + slide, top: rowTop, width: cardW, height: rowH, opacity }}>
              <div className="vk-recap__title">{item.title}</div>
              <div className="vk-recap__body">{item.body}</div>
            </div>
            {/* Opaque disc under the fading badge so the rail never shows through it. */}
            <div className="vk-recap__num-bg" style={{ left: railX, top: rowTop + rowH / 2, opacity: opacity > 0.001 ? 1 : 0, transform: `translate(-50%, -50%) scale(${scale})` }} />
            <div className="vk-recap__num" style={{ left: railX, top: rowTop + rowH / 2, opacity, transform: `translate(-50%, -50%) scale(${scale})` }}>
              {String(i + 1).padStart(2, '0')}
            </div>
          </React.Fragment>
        );
      })}
      {closing ? (
        <div className="vk-recap__closing" style={{ top: top + gap * items.length + 6, opacity: closeOpacity, transform: `translate(-50%, ${closeRise}px)` }}>
          {closing}
        </div>
      ) : null}
    </>
  );
}
