import type { FC } from 'react';

export interface CompareSide {
  /** Micro tag above the card, e.g. 'BẢN A'. */
  tag: string;
  title: string;
  /** Up to 3 short muted lines under the card. */
  lines?: readonly string[];
}
export interface CompareSplitProps {
  x: number;
  /** Top of both title cards. */
  y: number;
  /** Default 1520. */
  w?: number;
  /** Zone height; the verdict pill is centered on y + h. Default 420. */
  h?: number;
  left: CompareSide;
  right: CompareSide;
  /** One-line verdict in a pill across the bottom. */
  verdict?: string;
  leftReveal?: number;
  rightReveal?: number;
  verdictReveal?: number;
  opacity?: number;
}
export declare const CompareSplit: FC<CompareSplitProps>;
