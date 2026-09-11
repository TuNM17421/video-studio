import type { FC } from 'react';

/** Vendored Lucide subset (ISC). */
export type LineIconName =
  | 'app-window' | 'archive' | 'bot' | 'braces' | 'check' | 'circle-help' | 'clipboard-list' | 'clock' | 'cloud'
  | 'database' | 'file-text' | 'folder-open' | 'git-branch' | 'globe' | 'hourglass' | 'inbox' | 'key-round'
  | 'list-checks' | 'lock' | 'lock-open' | 'mail' | 'mouse-pointer' | 'octagon-x' | 'pause' | 'pencil' | 'plug'
  | 'quote' | 'refresh-cw' | 'repeat' | 'search' | 'send' | 'server' | 'shield-alert' | 'shield-check' | 'stamp'
  | 'terminal' | 'triangle-alert' | 'user-check' | 'wrench' | 'x';

export interface LineIconProps {
  name: LineIconName;
  /** Center x (scene px). */
  x: number;
  /** Center y (scene px). */
  y: number;
  /** Rendered size in px. Default 48. */
  size?: number;
  /** A C token. Default C.accent. */
  color?: string;
  opacity?: number;
  /** Stroke on the 24 grid. Default 1.125 (= 3 px on a 64 grid, the hand-drawn set). 1.25 for dense glyphs. */
  strokeWidth?: number;
}
export declare const LineIcon: FC<LineIconProps>;
export declare const LINE_ICONS: Readonly<Record<LineIconName, ReadonlyArray<[string, Record<string, string>]>>>;
export declare const LINE_ICON_NAMES: readonly LineIconName[];
export declare const LINE_ICON_STROKE: 1.125;
