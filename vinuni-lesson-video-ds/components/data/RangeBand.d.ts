import type { FC } from 'react';

export interface RangeBandProps {
  x: number;
  /** Scale line y. */
  y: number;
  /** Default 620. */
  w?: number;
  /** 0–1 point estimate. */
  value: number;
  /** 0–1 band ends. */
  lo: number;
  hi: number;
  /** 0–1 grows the band out from the dot. */
  spread?: number;
  label?: string;
  /** Under the dot, e.g. '72% ± 9'. */
  readout?: string;
  /** Muted end labels under the scale. */
  left?: string;
  right?: string;
  opacity?: number;
}
export declare const RangeBand: FC<RangeBandProps>;
