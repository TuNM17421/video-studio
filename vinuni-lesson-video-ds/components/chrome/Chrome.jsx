import React from 'react';
import { isHiddenIllustrativeLabel } from '../labels/IllustrativeStamp.jsx';
import { BRAND, C } from '../../lib/tokens.js';
import { useFormat, useLayout } from '../../lib/player.jsx';
import { CLAMP, interpolate } from '../../lib/motion.js';
import { pillWidth } from '../../lib/geometry.js';
import { SvgText } from '../text/Text.jsx';

/** Red uppercase eyebrow, centered at the top (HTML): "NGÀY 05 · THIẾT KẾ SẢN PHẨM AI". */
export function Eyebrow({ children, top, opacity = 1 }) {
  const L = useLayout();
  return (
    <div className="vk-eyebrow" style={{ top: top ?? L.eyebrowTop, opacity: opacity < 1 ? opacity : undefined }}>
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
export function CornerTag({ label, opacity = 1, right, y }) {
  const L = useLayout();
  // Lab: the "MINH HỌA" corner card is not drawn (see isHiddenIllustrativeLabel); other tags are.
  if (!label || opacity <= 0.001 || isHiddenIllustrativeLabel(label)) return null;
  const w = Math.max(184, pillWidth(label, 17) + 6);
  const x = (right ?? L.tagRight) - w;
  const top = y ?? L.tagTop;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <rect x={x} y={top} width={w} height={42} rx={21} fill={C.redSoft} stroke={C.red} strokeWidth={2} />
      <SvgText x={x + w / 2} y={top + 27} size={17} weight={700} color={C.red}>
        {label}
      </SvgText>
    </g>
  );
}

/** Centered header drawn in the scene SVG: title (baseline 176) + divider (+ corner tag). */
export function CenterHeader({ title, titleSize, tag }) {
  const F = useFormat();
  const L = F.layout;
  return (
    <g>
      {title ? (
        <SvgText x={F.width / 2} y={L.titleBaseline} size={titleSize ?? L.titleSize} weight={700}>
          {title}
        </SvgText>
      ) : null}
      <path d={`M ${L.dividerX0} ${L.dividerY} H ${L.dividerX1}`} fill="none" stroke={C.dotInactive} strokeWidth={3} />
      {tag ? <CornerTag label={tag} /> : null}
    </g>
  );
}

/** Editorial (Day28) background grid: 120 px step from 80 px, dotInactive 1 px at 38 %. */
export function EditorialGrid() {
  const F = useFormat();
  const { gridStart, gridStep } = F.layout;
  const xs = [];
  const ys = [];
  for (let x = gridStart; x < F.width; x += gridStep) xs.push(x);
  for (let y = gridStart; y < F.height; y += gridStep) ys.push(y);
  return (
    <g opacity={0.38} stroke={C.dotInactive} strokeWidth={1}>
      {xs.map((x) => (
        <line key={`x${x}`} x1={x} x2={x} y1={0} y2={F.height} />
      ))}
      {ys.map((y) => (
        <line key={`y${y}`} x1={0} x2={F.width} y1={y} y2={y} />
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
