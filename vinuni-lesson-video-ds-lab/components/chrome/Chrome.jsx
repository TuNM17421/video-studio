import React from 'react';
import { BRAND, C, LAYOUT } from '../../lib/tokens.js';
import { CLAMP, interpolate } from '../../lib/motion.js';
import { pillWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/** Red uppercase eyebrow, centered at the top (HTML): "NGÀY 05 · THIẾT KẾ SẢN PHẨM AI". */
export function Eyebrow({ children, top = LAYOUT.eyebrowTop, opacity = 1 }) {
  return (
    <div className="vk-eyebrow" style={{ top, opacity: opacity < 1 ? opacity : undefined }}>
      {children}
    </div>
  );
}

/** Persistent brand watermark (HTML, top-right): red dot + "VinUni · AI in Action 20K". */
export function Watermark({ label = BRAND }) {
  return (
    <div className="vk-watermark">
      <span className="vk-watermark__dot" />
      <span className="vk-watermark__text">{label}</span>
    </div>
  );
}

/** Burned-in narration subtitle (HTML): full-width navy bar, 96 px, one line ≤ 78 characters. */
export function SubtitleBar({ text }) {
  if (!text) return null;
  return <div className="vk-subtitle">{text}</div>;
}

/** Scene footer (HTML): "01 / 06 · Tên video" left, optional right. Hidden under the subtitle bar. */
export function SceneFooter({ left, right }) {
  return (
    <div className="vk-footer">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

/** Red-soft tag right-aligned under the divider (SVG): "MINH HỌA", "SO SÁNH", "GLASSBOX". */
export function CornerTag({ label, opacity = 1, right = LAYOUT.tagRight, y = LAYOUT.tagTop }) {
  if (!label || opacity <= 0.001) return null;
  const w = Math.max(184, pillWidth(label, 17) + 6);
  const x = right - w;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={y} width={w} height={42} rx={21} fill={C.redSoft} stroke={C.red} strokeWidth={2} />
      <SvgText x={x + w / 2} y={y + 27} size={17} weight={700} color={C.red}>
        {label}
      </SvgText>
    </g>
  );
}

/** Centered header drawn in the scene SVG: title (baseline 176) + divider (+ corner tag). */
export function CenterHeader({ title, titleSize = LAYOUT.titleSize, tag }) {
  return (
    <g>
      {title ? (
        <SvgText x={960} y={LAYOUT.titleBaseline} size={titleSize} weight={700}>
          {title}
        </SvgText>
      ) : null}
      <path d={`M ${LAYOUT.dividerX0} ${LAYOUT.dividerY} H ${LAYOUT.dividerX1}`} fill="none" stroke={C.dotInactive} strokeWidth={3} />
      {tag ? <CornerTag label={tag} /> : null}
    </g>
  );
}

/** Editorial (Day28) background grid: 120 px step from 80 px, dotInactive 1 px at 38 %. */
export function EditorialGrid() {
  const xs = [];
  const ys = [];
  for (let x = LAYOUT.gridStart; x < 1920; x += LAYOUT.gridStep) xs.push(x);
  for (let y = LAYOUT.gridStart; y < 1080; y += LAYOUT.gridStep) ys.push(y);
  return (
    <g opacity={0.38} stroke={C.dotInactive} strokeWidth={1}>
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} x2={x} y1={0} y2={1080} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} x2={1920} y1={y} y2={y} />
      ))}
    </g>
  );
}

/**
 * Editorial (Day28) header (HTML): left-aligned red kicker, 54 px title with an optional red
 * accent phrase ("Mọi component đều xanh. <Vì sao platform vẫn sai?>"), muted subtitle.
 */
export function EditorialHeader({ kicker, title, titleAccent, subtitle, titleSize = 54, frame = 30 }) {
  const kickerOpacity = interpolate(frame, [0, 16], [0.72, 1], CLAMP);
  const titleOpacity = interpolate(frame, [0, 25], [0.72, 1], CLAMP);
  const subOpacity = interpolate(frame, [10, 28], [0, 1], CLAMP);
  return (
    <>
      {kicker ? (
        <div className="vk-kicker" style={{ opacity: kickerOpacity }}>
          {kicker}
        </div>
      ) : null}
      {title ? (
        <div className="vk-ed-title" style={{ fontSize: titleSize, opacity: titleOpacity }}>
          {title}
          {titleAccent ? (
            <>
              {' '}
              <span className="vk-accent-red">{titleAccent}</span>
            </>
          ) : null}
        </div>
      ) : null}
      {subtitle ? (
        <div className="vk-ed-sub" style={{ opacity: subOpacity }}>
          {subtitle}
        </div>
      ) : null}
    </>
  );
}
