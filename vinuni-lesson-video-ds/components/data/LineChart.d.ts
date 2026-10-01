import type { FC } from 'react';

export interface LineSeries {
  label: string;
  /** Data-unit points, sorted by x. Give this or `sample`. */
  points?: readonly { x: number; y: number }[];
  /** y at x, evaluated `samples` times — close it over the frame for a live trace. */
  sample?: (x: number) => number;
  /** Live value printed at the head dot. */
  readout?: (y: number) => string;
  /** Default C.accent; use C.red for the series the narration lands on. */
  accent?: string;
  dashed?: boolean;
}

export interface LineChartProps {
  /** Top-left of the plot box. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** One or two series. */
  series: readonly LineSeries[];
  xRange?: readonly [number, number];
  yRange?: readonly [number, number];
  xTicks?: readonly number[];
  yTicks?: readonly number[];
  /** Unit appended to the LAST x label ("20 phút"). */
  xTickLabel?: string;
  /** How many times a `sample` series is evaluated. Default 120. */
  samples?: number;
  /** Dashed thresholds that explain the shape of the curve. */
  rules?: readonly { y: number; label?: string; accent?: string }[];
  /** 0–1: draws left to right, head dot rides the end. */
  progress?: number;
  /** Default true when there is more than one series. */
  legend?: boolean;
  opacity?: number;
}
export declare const LineChart: FC<LineChartProps>;
