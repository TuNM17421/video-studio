import type { FC } from 'react';

export interface MarkProps {
  x: number;
  y: number;
  /** Check default 44, Cross default 42. */
  size?: number;
  /** Default C.red. */
  color?: string;
  /** Default 8. */
  strokeWidth?: number;
  opacity?: number;
}
export declare const Check: FC<MarkProps>;
export declare const Cross: FC<MarkProps>;

export interface BracketProps {
  /** Left end x. */
  x: number;
  /** Top of the bracket (the open side). */
  y: number;
  w: number;
  /** Default 28. */
  h?: number;
  /** 'down' = U groups items above · 'up' = ∩ groups items below. */
  direction?: 'down' | 'up';
  color?: string;
  strokeWidth?: number;
  opacity?: number;
}
export declare const Bracket: FC<BracketProps>;

export interface EnclosureProps {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  /** Default C.red. */
  color?: string;
  opacity?: number;
  /** Label pill x (default x + 36). */
  labelX?: number;
  labelW?: number;
}
export declare const Enclosure: FC<EnclosureProps>;
