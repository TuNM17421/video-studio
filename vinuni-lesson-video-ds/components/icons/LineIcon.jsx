import React from 'react';
import { C } from '../../lib/tokens.js';
import {
  AppWindow,
  Archive,
  Bot,
  Braces,
  Check,
  CircleHelp,
  ClipboardList,
  Clock,
  Cloud,
  Database,
  FileText,
  FolderOpen,
  GitBranch,
  Globe,
  Hourglass,
  Inbox,
  KeyRound,
  ListChecks,
  Lock,
  LockOpen,
  Mail,
  MousePointer2,
  OctagonX,
  Pause,
  Pencil,
  Plug,
  Quote,
  RefreshCw,
  Repeat,
  Search,
  Send,
  Server,
  ShieldAlert,
  ShieldCheck,
  Stamp,
  Terminal,
  TriangleAlert,
  UserCheck,
  Wrench,
  X,
} from 'lucide';

/**
 * Lucide line icons (ISC) normalised to the kit's icon style: the 24-grid glyph is drawn at
 * stroke 1.125, which equals the hand-drawn set's 3 px stroke on a 64 grid (64 / 24 × 1.125 = 3).
 * Round caps and joins, no fill, stroke = `color`. Same placement API as Icon: centered on (x, y).
 * Vendored subset = the icons the P1/P2 components need; add names here (import + map) when a scene
 * needs another generic concept. Named products get <Brand>, never a look-alike glyph.
 */
export const LINE_ICONS = Object.freeze({
  'app-window': AppWindow,
  archive: Archive,
  bot: Bot,
  braces: Braces,
  check: Check,
  'circle-help': CircleHelp,
  'clipboard-list': ClipboardList,
  clock: Clock,
  cloud: Cloud,
  database: Database,
  'file-text': FileText,
  'folder-open': FolderOpen,
  'git-branch': GitBranch,
  globe: Globe,
  hourglass: Hourglass,
  inbox: Inbox,
  'key-round': KeyRound,
  'list-checks': ListChecks,
  lock: Lock,
  'lock-open': LockOpen,
  mail: Mail,
  'mouse-pointer': MousePointer2,
  'octagon-x': OctagonX,
  pause: Pause,
  pencil: Pencil,
  plug: Plug,
  quote: Quote,
  'refresh-cw': RefreshCw,
  repeat: Repeat,
  search: Search,
  send: Send,
  server: Server,
  'shield-alert': ShieldAlert,
  'shield-check': ShieldCheck,
  stamp: Stamp,
  terminal: Terminal,
  'triangle-alert': TriangleAlert,
  'user-check': UserCheck,
  wrench: Wrench,
  x: X,
});
export const LINE_ICON_NAMES = Object.freeze(Object.keys(LINE_ICONS));

/** Stroke on the 24 grid that matches the hand-drawn set's 3 px on 64. */
export const LINE_ICON_STROKE = 1.125;

/**
 * A Lucide icon placed inside a scene SVG, centered on (x, y).
 * `strokeWidth` is on the 24 grid (default 1.125 ≙ 3 px at 64 px); raise to 1.25 for dense glyphs.
 */
export function LineIcon({ name, x, y, size = 48, color = C.accent, opacity = 1, strokeWidth = LINE_ICON_STROKE }) {
  const node = LINE_ICONS[name];
  if (!node || opacity <= 0.001) return null;
  return (
    <svg
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={opacity < 1 ? opacity : undefined}
      overflow="visible"
    >
      {node.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}
