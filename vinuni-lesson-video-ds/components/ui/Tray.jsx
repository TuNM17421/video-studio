import React from 'react';
import { C, ROLE_OF } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { textWidth } from '../../lib/geometry.js';
import { LineIcon } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

const HEADER = 68;

/** tone → [stroke, soft fill]. Role tones come from ROLE_OF; 'accent' is the default body blue. */
function toneColors(tone) {
  if (tone === 'red') return [C.red, C.redSoft];
  if (ROLE_OF[tone]) return ROLE_OF[tone];
  return [C.accent, C.dotInactive];
}

/**
 * Box of the i-th stacked item inside `tray` ({x, y, w, h}): items stack top-down under the header,
 * `pad` from the tray edges, `gap` apart, each `itemH` tall. Place EmailCard / Card / your own
 * shapes on these boxes (in scene coordinates) and pass them as Tray children — or draw them after it.
 */
export function trayItemBox(tray, i, { itemH = 96, gap = 14, pad = 16 } = {}) {
  return { x: tray.x + pad, y: tray.y + HEADER + pad + i * (itemH + gap), w: tray.w - 2 * pad, h: itemH };
}

/**
 * An inbox tray / column (SVG): the place where items wait — "BẢN NHÁP", "CHỜ DUYỆT", "ĐÃ LƯU", "KHAY ĐẦU VÀO".
 * Anatomy: bgAlt body, 3 px stroke in the tone color, radius 22 · header band (68 px) in the tone's soft
 * fill with a LineIcon (default 'inbox'), the uppercase `label` 17 / 700 and a count badge (tone fill,
 * white number) on the right · children = stacked items (use `trayItemBox(tray, i)` for their boxes).
 * With no children and `count` 0 → a dashed "Trống" placeholder (`emptyLabel`).
 * tone: 'accent' (default) · role tones 'input' | 'process' | 'output' | 'check' | 'action' | 'memory'
 * (outline + header fill only — the kit's ROLE rule) · 'red' (blocked / risk).
 * States: `active` 0–1 → 5 px red outline (an item just landed — drive with pulse()) · `opacity`.
 * Not a data component: no MINH HỌA tag of its own (items inside carry it). Timing: static; animate
 * items in with appear()/Flow and step `count` with revealCount().
 * @category ui
 */
export function Tray({
  x,
  y,
  w,
  h,
  label,
  count,
  icon = 'inbox',
  tone = 'accent',
  active = 0,
  emptyLabel = 'Trống',
  opacity = 1,
  children,
}) {
  const clipId = React.useId().replace(/:/g, '');
  if (opacity <= 0.001) return null;
  const [stroke, soft] = toneColors(tone);
  const a = clamp01(typeof active === 'boolean' ? (active ? 1 : 0) : active);
  const countStr = count == null ? null : String(count);
  const badgeW = countStr ? Math.max(38, textWidth(countStr, 17, 700) + 22) : 0;
  const hasItems = React.Children.count(children) > 0;
  const empty = !hasItems && (count === 0 || count == null);
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <clipPath id={clipId}>
        <rect x={x} y={y} width={w} height={h} rx={22} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} />
      <rect x={x} y={y} width={w} height={HEADER} fill={soft} clipPath={`url(#${clipId})`} />
      <line x1={x} x2={x + w} y1={y + HEADER} y2={y + HEADER} stroke={stroke} strokeOpacity={0.35} strokeWidth={2} />
      {icon ? <LineIcon name={icon} x={x + 40} y={y + HEADER / 2} size={30} color={stroke} /> : null}
      {label ? (
        <SvgText x={x + (icon ? 66 : 24)} y={y + HEADER / 2 + 6} size={17} weight={700} anchor="start" color={stroke} letterSpacing={0.4}>
          {label}
        </SvgText>
      ) : null}
      {countStr ? (
        <g>
          <rect x={x + w - 22 - badgeW} y={y + HEADER / 2 - 17} width={badgeW} height={34} rx={17} fill={stroke} />
          <SvgText x={x + w - 22 - badgeW / 2} y={y + HEADER / 2 + 6} size={17} weight={700} color={C.bg}>
            {countStr}
          </SvgText>
        </g>
      ) : null}
      {empty ? (
        <g>
          <rect x={x + 16} y={y + HEADER + 16} width={w - 32} height={Math.min(96, h - HEADER - 32)} rx={16} fill="none" stroke={stroke} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="12 10" />
          <SvgText x={x + w / 2} y={y + HEADER + 16 + Math.min(96, h - HEADER - 32) / 2 + 7} size={18} weight={600} color={C.textMuted}>
            {emptyLabel}
          </SvgText>
        </g>
      ) : null}
      <g clipPath={`url(#${clipId})`}>{children}</g>
      <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={stroke} strokeWidth={3} />
      {a > 0.001 ? <rect x={x} y={y} width={w} height={h} rx={22} fill="none" stroke={C.red} strokeWidth={5} opacity={a} /> : null}
    </g>
  );
}
