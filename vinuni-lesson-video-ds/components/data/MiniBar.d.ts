import type { FC } from 'react';

export interface MiniBarProps {
  x: number;
  y: number;
  w: number;
  /** 0–1. */
  value: number;
  label?: string;
  /** Default C.accent. */
  accent?: string;
  opacity?: number;
  /** Default 18. */
  h?: number;
}
export declare const MiniBar: FC<MiniBarProps>;
