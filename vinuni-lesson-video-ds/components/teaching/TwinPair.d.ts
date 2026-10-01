import type { FC, ReactNode } from 'react';

export interface TwinSide {
  /** 'a' (accent, the baseline) or 'b' (red, where the lesson lands). */
  variant: 'a' | 'b';
  index: 0 | 1;
  /** Top-left and size of THIS side's box — identical for both sides. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** C.accent for a, C.red for b. */
  accent: string;
  label?: string;
  reveal: number;
}

export interface TwinPairProps {
  x: number;
  y: number;
  /** Width of the pair including the gap. */
  w: number;
  h: number;
  /** Default 60. */
  gap?: number;
  a?: { label?: string };
  b?: { label?: string };
  /** One line naming the single difference. Required in practice. */
  diff?: string;
  /** Called once per side; branch ONLY on side.variant, never on geometry. */
  render: (side: TwinSide) => ReactNode;
  aReveal?: number;
  bReveal?: number;
  diffReveal?: number;
  opacity?: number;
}
export declare const TwinPair: FC<TwinPairProps>;
