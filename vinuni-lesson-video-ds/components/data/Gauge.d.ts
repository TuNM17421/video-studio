import type { FC } from 'react';

export interface GaugeProps {
  cx: number;
  /** Baseline of the half-circle (the arc's two ends). */
  cy: number;
  /** Default 200. */
  r?: number;
  /** 0–1 reading. */
  value: number;
  /** 0–1 red tick. */
  threshold?: number;
  /** Which side of the threshold turns the fill red. Default 'above'. */
  danger?: 'above' | 'below' | 'none';
  /** 18/700 label above the dial. */
  label?: string;
  /** Text inside the arc, derived from `value`. */
  readout?: string;
  /** Muted end labels under the arc ends. */
  min?: string;
  max?: string;
  opacity?: number;
}
export declare const Gauge: FC<GaugeProps>;
