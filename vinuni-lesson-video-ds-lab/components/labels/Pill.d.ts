import type { FC } from 'react';

export interface PillProps {
  x: number;
  y: number;
  /** Default: estimated from the label. */
  w?: number;
  label: string;
  opacity?: number;
  /** outline → red-soft + red; solid → red fill. */
  active?: boolean;
  /** Default C.accent. */
  accent?: string;
  variant?: 'outline' | 'solid' | 'muted';
  /** Default 50. */
  h?: number;
  /** Default 18. */
  size?: number;
}
export declare const Pill: FC<PillProps>;

export interface ChipProps {
  x: number;
  y: number;
  label: string;
  tone?: 'blue' | 'red' | 'muted';
  /** Default 18. */
  size?: number;
  /** Default 36. */
  h?: number;
  w?: number;
  opacity?: number;
}
export declare const Chip: FC<ChipProps>;
