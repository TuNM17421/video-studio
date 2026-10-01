import type { FC } from 'react';

export interface Metric {
  /** Short noun, no unit ("Nóng nhất", "FPS"). */
  label: string;
  /** The reading as the script says it, unit included ("39,0 °C"). */
  value: string;
  /** true → the value is red: the one number the narration names. */
  accent?: boolean;
  /** A ratio the script states ("×2"), shown as a red pill. */
  delta?: string;
}

export interface MetricRowProps {
  x: number;
  y: number;
  w: number;
  /** Default 108. */
  h?: number;
  /** 1–3 readings. */
  items: readonly Metric[];
  /** Value type size. Default 36. */
  size?: number;
  /** Red rail down the left edge: this is the case the lesson lands on. */
  lead?: boolean;
  /** Default C.bgAlt. */
  fill?: string;
  opacity?: number;
  /** 0–1. */
  reveal?: number;
}
export declare const MetricRow: FC<MetricRowProps>;
