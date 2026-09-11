import type { FC, ReactNode } from 'react';

export type BoundaryTone = 'accent' | 'red' | 'input' | 'process' | 'reasoning' | 'output' | 'check' | 'action' | 'memory';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface PermissionBoundaryProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Uppercase badge label on the top edge. Default 'PHẠM VI QUYỀN'; e.g. 'CHỈ ĐỌC'. '' hides the badge. */
  label?: string;
  /** Stroke / badge color: 'accent' (default), 'red' (risky zone) or a ROLE_OF key ('output', 'check', …). */
  tone?: BoundaryTone;
  /** true (default) → lock icon in the badge · false → lock-open (permission granted). */
  locked?: boolean;
  opacity?: number;
  /** Top-right MINH HỌA tag (true or a custom label). Default false — the zone is structural. */
  illustrative?: boolean | string;
  /** Boxes of items drawn OUTSIDE the zone by the caller; each gets a red BlockedBadge on its top-right corner. */
  blocked?: readonly Box[];
  /** Badge left x. Default x + 36. */
  labelX?: number;
  /** Items inside the zone (Cards, Pills…), drawn above the tint and below the badge. */
  children?: ReactNode;
}
export declare const PermissionBoundary: FC<PermissionBoundaryProps>;

export interface BlockedBadgeProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Disc diameter. Default 44. */
  size?: number;
  opacity?: number;
}
/** 44 px red-soft disc with a red cross — "not allowed". */
export declare const BlockedBadge: FC<BlockedBadgeProps>;
/** tone → stroke color. */
export declare function toneColor(tone?: BoundaryTone | string): string;
