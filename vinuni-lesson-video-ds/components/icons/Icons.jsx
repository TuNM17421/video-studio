import React from 'react';
import { C } from '../../lib/tokens.js';

/*
 * Hand-drawn line icons — exact port of the source repo's src/primitives/icons.tsx.
 * 64×64 grid, 3 px round stroke, stroke = currentColor: set `color` on the element.
 * Use them for GENERIC concepts only (document, database, user, alert…). A named technology
 * (Kafka, Kubernetes, vLLM…) gets its official logo instead, never a look-alike glyph.
 */
const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 3 };
const F = { fill: 'currentColor', stroke: 'none' };

export function BulbIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M32 6a18 18 0 0 0-10 33c2 1.5 3 3.5 3 6v3h14v-3c0-2.5 1-4.5 3-6A18 18 0 0 0 32 6Z" />
      <path {...S} d="M25 54h14M27 60h10" />
    </svg>
  );
}

export function CoinIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle {...S} cx="32" cy="32" r="22" />
      <path {...S} d="M32 20v24M25 27c0-4 4-7 7-7s8 2.5 8 6.5-4.5 5.5-8 6.5-8 2.5-8 6.5 4.5 6.5 8 6.5 6.5-2 6.5-6" />
    </svg>
  );
}

export function TrendUpIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M8 46 24 30 34 40 56 14" />
      <path {...S} d="M40 14h16v16" />
    </svg>
  );
}

export function DatabaseIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <ellipse {...S} cx="32" cy="14" rx="20" ry="8" />
      <path {...S} d="M12 14v18c0 4.4 9 8 20 8s20-3.6 20-8V14" />
      <path {...S} d="M12 32v18c0 4.4 9 8 20 8s20-3.6 20-8V32" />
    </svg>
  );
}

export function NeuralNetIcon(props) {
  const nodes = [[12, 20], [12, 44], [32, 12], [32, 32], [32, 52], [52, 24], [52, 42]];
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M16 20 28 12M16 20 28 32M16 44 28 32M16 44 28 52M36 12 48 24M36 32 48 24M36 32 48 42M36 52 48 42" />
      {nodes.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} {...F} cx={cx} cy={cy} r="4" />
      ))}
    </svg>
  );
}

export function ChatBubbleIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M10 14h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H26l-12 10V44h-4a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
      <path {...S} d="M18 26h28M18 34h18" />
    </svg>
  );
}

export function RobotIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <rect {...S} x="14" y="22" width="36" height="26" rx="6" />
      <circle {...F} cx="25" cy="35" r="3" />
      <circle {...F} cx="39" cy="35" r="3" />
      <path {...S} d="M32 22V12M22 12h20M14 32H6M50 32h8M22 54v4M42 54v4" />
    </svg>
  );
}

export function DocumentIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M16 8h22l10 10v38a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2Z" />
      <path {...S} d="M38 8v10h10" />
      <path {...S} d="M22 32h20M22 40h20M22 48h12" />
    </svg>
  );
}

export function EyeIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M4 32s10-16 28-16 28 16 28 16-10 16-28 16S4 32 4 32Z" />
      <circle {...S} cx="32" cy="32" r="8" />
    </svg>
  );
}

export function CalendarXIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <rect {...S} x="8" y="14" width="48" height="42" rx="4" />
      <path {...S} d="M8 26h48M18 8v10M46 8v10" />
      <path {...S} d="M24 38l16 14M40 38 24 52" />
    </svg>
  );
}

export function AlertBubbleIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M10 14h44a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H26l-12 10V44h-4a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4Z" />
      <path {...S} d="M32 22v12" />
      <circle {...F} cx="32" cy="40" r="2.6" />
    </svg>
  );
}

export function ScaleIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M32 8v48M18 56h28M32 14 14 20M32 14l18 6" />
      <path {...S} d="M6 20h16l-8 18a10 10 0 0 1-8-18Z" />
      <path {...S} d="M42 26h16l-8 18a10 10 0 0 1-8-18Z" />
    </svg>
  );
}

export function LayersIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="m32 8 26 14-26 14L6 22Z" />
      <path {...S} d="m6 34 26 14 26-14" />
      <path {...S} d="m6 46 26 14 26-14" />
    </svg>
  );
}

export function SplitPathIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle {...S} cx="12" cy="32" r="6" />
      <circle {...S} cx="52" cy="10" r="6" />
      <circle {...S} cx="52" cy="32" r="6" />
      <circle {...S} cx="52" cy="54" r="6" />
      <path {...S} d="M18 32h10M28 32 46 10M28 32h18M28 32 46 54" />
    </svg>
  );
}

export function EditIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M10 54 14 42 42 14a4 4 0 0 1 6 0l2 2a4 4 0 0 1 0 6L22 50 10 54Z" />
      <path {...S} d="M36 20l8 8" />
    </svg>
  );
}

export function CodeIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <path {...S} d="M22 16 6 32l16 16M42 16l16 16-16 16M38 10 26 54" />
    </svg>
  );
}

export function CheckIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle {...S} cx="32" cy="32" r="26" />
      <path {...S} d="M20 33l8 8 16-18" />
    </svg>
  );
}

export function UsersIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle {...S} cx="22" cy="20" r="8" />
      <circle {...S} cx="44" cy="25" r="7" />
      <path {...S} d="M8 51c0-9.4 6.3-16 14-16s14 6.6 14 16M35 51c0-7.3 5-13.5 11-14.5 6.8 1.1 11 7.2 11 14.5" />
    </svg>
  );
}

export function ScissorsIcon(props) {
  return (
    <svg viewBox="0 0 64 64" {...props}>
      <circle {...S} cx="16" cy="46" r="8" />
      <circle {...S} cx="16" cy="18" r="8" />
      <path {...S} d="M22 24 56 54M22 40 56 10" />
    </svg>
  );
}

export function GearIcon(props) {
  const teeth = [0, 1, 2, 3, 4, 5, 6, 7];
  return (
    <svg viewBox="0 0 64 64" {...props}>
      {teeth.map((i) => (
        <rect key={i} {...F} x="29" y="3" width="6" height="10" rx="2" transform={`rotate(${i * 45} 32 32)`} />
      ))}
      <circle {...S} cx="32" cy="32" r="17" />
      <circle {...S} cx="32" cy="32" r="6" />
    </svg>
  );
}

/** name → icon component. Names are the kebab-case of the source component names. */
export const ICONS = Object.freeze({
  bulb: BulbIcon,
  coin: CoinIcon,
  'trend-up': TrendUpIcon,
  database: DatabaseIcon,
  'neural-net': NeuralNetIcon,
  'chat-bubble': ChatBubbleIcon,
  robot: RobotIcon,
  document: DocumentIcon,
  eye: EyeIcon,
  'calendar-x': CalendarXIcon,
  'alert-bubble': AlertBubbleIcon,
  scale: ScaleIcon,
  layers: LayersIcon,
  'split-path': SplitPathIcon,
  edit: EditIcon,
  code: CodeIcon,
  check: CheckIcon,
  users: UsersIcon,
  scissors: ScissorsIcon,
  gear: GearIcon,
});

export const ICON_NAMES = Object.freeze(Object.keys(ICONS));

/** Place an icon inside a scene SVG, centered on (x, y). */
export function Icon({ name, x, y, size = 48, color = C.accent, opacity = 1 }) {
  const Cmp = ICONS[name];
  if (!Cmp || opacity <= 0.001) return null;
  return (
    <Cmp
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      color={color}
      opacity={opacity < 1 ? opacity : undefined}
      overflow="visible"
    />
  );
}
