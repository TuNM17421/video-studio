import React from 'react';
import { C, ROLE_OF, alpha } from '../../lib/tokens.js';
import { clamp01 } from '../../lib/motion.js';
import { anchor, textWidth } from '../../lib/geometry.js';
import { Icon, ICONS } from '../icons/Icons.jsx';
import { LineIcon, LINE_ICONS } from '../icons/LineIcon.jsx';
import { SvgText } from '../text/Text.jsx';

/** tone → [stroke, soft fill]: a ROLE_OF name, a C token name, or a hex. */
function toneOf(tone) {
  if (!tone) return [C.accent, C.dotInactive];
  if (ROLE_OF[tone]) return ROLE_OF[tone];
  if (tone === 'red' || tone === C.red) return [C.red, C.redSoft];
  const hex = C[tone] || tone;
  return [hex, alpha(hex, 0.12)];
}

/** kind → default icon (LineIcon or hand-drawn Icon name) + micro-caps kind label. */
export const ARCH_KINDS = Object.freeze({
  app: { icon: 'app-window', label: 'ỨNG DỤNG' },
  host: { icon: 'app-window', label: 'HOST' },
  client: { icon: 'plug', label: 'CLIENT' },
  server: { icon: 'server', label: 'SERVER' },
  api: { icon: 'braces', label: 'API' },
  service: { icon: 'cloud', label: 'DỊCH VỤ' },
  model: { icon: 'bot', label: 'MÔ HÌNH' },
  database: { icon: 'database', label: 'DỮ LIỆU' },
  user: { icon: 'users', label: 'NGƯỜI DÙNG' },
});

/** Named anchor on the node's box — same as anchor({x,y,w,h}, side, t). */
export function nodePort(props, side, t = 0.5) {
  return anchor({ x: props.x, y: props.y, w: props.w, h: props.h }, side, t);
}

function Glyph({ name, x, y, size, color }) {
  if (LINE_ICONS[name]) return <LineIcon name={name} x={x} y={y} size={size} color={color} />;
  if (ICONS[name]) return <Icon name={name} x={x} y={y} size={size} color={color} />;
  return null;
}

/**
 * ArchitectureNode — one box of a system / architecture diagram (MCP host · client · server, app ↔
 * API, "vùng nhà cung cấp"), typed by `kind` so the icon and micro label are consistent across scenes.
 *
 * Anatomy (node): radius-22 bgAlt card, 3 px tone stroke · top-left icon 30 px + kind label 17/700
 * letter-spaced (HOST, CLIENT, SERVER, API, MÔ HÌNH, DỮ LIỆU…) · centered title 26/700 + optional
 * subtitle 19/500 muted. Short boxes (h < 120) put icon, kind and title on one row.
 * Anatomy (`container`): large radius-28 frame, 3 px tone stroke dashed '12 10' (solid with
 * `dashed={false}`), faint tone tint, header row (icon + kind + title) inside the top-left corner;
 * child nodes are drawn on top — pass them as children or render them after it.
 *
 * States: `active` 0–1 → red-soft overlay + 5 px red stroke (node) / red frame (container), drive with
 * pulse() · `muted` 0–1 → dims to 36 % · `opacity` for reveals. Kinds: app, host, client, server, api,
 * service, model, database, user (override with `icon` / `kindLabel`).
 */
export function ArchitectureNode({
  x,
  y,
  w,
  h,
  kind = 'app',
  title,
  subtitle,
  container = false,
  dashed,
  tone,
  icon,
  kindLabel,
  active = 0,
  muted = 0,
  opacity = 1,
  children,
}) {
  const o = opacity * (1 - clamp01(muted) * 0.64);
  if (o <= 0.001) return null;
  const spec = ARCH_KINDS[kind] ?? ARCH_KINDS.app;
  const glyph = icon ?? spec.icon;
  const klabel = kindLabel ?? spec.label;
  const [stroke, soft] = toneOf(tone);
  const a = clamp01(active);
  const hot = a > 0.45;
  const ink = hot ? C.red : stroke;

  if (container) {
    const isDashed = dashed ?? true;
    const kw = textWidth(klabel, 17, 700) + klabel.length;
    return (
      <g opacity={o < 1 ? o : undefined}>
        <rect x={x} y={y} width={w} height={h} rx={28} fill={alpha(tone ? soft : C.accent, tone ? 0.35 : 0.035)} stroke={stroke} strokeWidth={3} strokeDasharray={isDashed ? '12 10' : undefined} />
        {a > 0.001 ? <rect x={x} y={y} width={w} height={h} rx={28} fill="none" stroke={C.red} strokeWidth={5} opacity={a} /> : null}
        <Glyph name={glyph} x={x + 42} y={y + 38} size={32} color={ink} />
        <SvgText x={x + 68} y={y + 44} size={17} weight={700} anchor="start" color={ink} letterSpacing={1}>
          {klabel}
        </SvgText>
        {title ? (
          <SvgText x={x + 68 + kw + 14} y={y + 45} size={22} weight={700} anchor="start" color={C.text}>
            {title}
          </SvgText>
        ) : null}
        {subtitle ? (
          <SvgText x={x + 68} y={y + 72} size={17} weight={500} anchor="start" color={C.textMuted}>
            {subtitle}
          </SvgText>
        ) : null}
        {children}
      </g>
    );
  }

  const row = h < 120;
  return (
    <g opacity={o < 1 ? o : undefined}>
      <rect x={x} y={y} width={w} height={h} rx={22} fill={C.bgAlt} stroke={stroke} strokeWidth={3} strokeDasharray={dashed ? '12 10' : undefined} />
      {a > 0.001 ? <rect x={x} y={y} width={w} height={h} rx={22} fill={C.redSoft} stroke={C.red} strokeWidth={5} opacity={a * 0.72} /> : null}
      {row ? (
        <>
          <Glyph name={glyph} x={x + 42} y={y + h / 2} size={34} color={ink} />
          <SvgText x={x + 74} y={y + h / 2 - (subtitle ? 20 : 8)} size={17} weight={700} anchor="start" color={ink} letterSpacing={1}>
            {klabel}
          </SvgText>
          <SvgText x={x + 74} y={y + h / 2 + (subtitle ? 8 : 20)} size={24} weight={700} anchor="start" color={C.text}>
            {title}
          </SvgText>
          {subtitle ? (
            <SvgText x={x + 74} y={y + h / 2 + 33} size={17} weight={500} anchor="start" color={C.textMuted}>
              {subtitle}
            </SvgText>
          ) : null}
        </>
      ) : (
        <>
          <Glyph name={glyph} x={x + 40} y={y + 34} size={30} color={ink} />
          <SvgText x={x + 64} y={y + 40} size={17} weight={700} anchor="start" color={ink} letterSpacing={1}>
            {klabel}
          </SvgText>
          <SvgText x={x + w / 2} y={y + 40 + (h - 40) / 2 + (subtitle ? 2 : 14)} size={26} weight={700} color={C.text}>
            {title}
          </SvgText>
          {subtitle ? (
            <SvgText x={x + w / 2} y={y + 40 + (h - 40) / 2 + 32} size={19} weight={500} color={C.textMuted}>
              {subtitle}
            </SvgText>
          ) : null}
        </>
      )}
      {children}
    </g>
  );
}
