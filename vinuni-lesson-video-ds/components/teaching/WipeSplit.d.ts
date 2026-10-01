import type { FC, ReactNode } from 'react';

export interface WipeSplitProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0–1 position of the divider. Animate 0→1 for a running wipe. Default 0.5. */
  at?: number;
  /** Name of what causes the change ("AI"), on a solid red pill riding the divider. */
  label?: string;
  /** Pill top. Default: vertically centred in the stage. */
  labelY?: number;
  /** Drawn clipped to x < split. */
  left?: ReactNode;
  /** Drawn clipped to x ≥ split. */
  right?: ReactNode;
  /** Caption top-left; hidden once the divider leaves no room. */
  leftLabel?: string;
  /** Caption top-right. */
  rightLabel?: string;
  /** Stage box. Default true. */
  frame?: boolean;
  opacity?: number;
}
export declare const WipeSplit: FC<WipeSplitProps>;
