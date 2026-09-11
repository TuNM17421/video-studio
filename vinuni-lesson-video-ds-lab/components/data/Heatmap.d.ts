import type { FC } from 'react';

export interface HeatmapProps {
  x: number;
  y: number;
  rows: number;
  cols: number;
  /** 0–1 intensity per cell. */
  value: (row: number, col: number) => number;
  /** Default 34. */
  cell?: number;
  /** Default 4. */
  gap?: number;
  /** One palette color (default C.red) at 8–100 % alpha. */
  color?: string;
  /** 0–1 scales every value. */
  reveal?: number;
  rowLabels?: readonly string[];
  colLabels?: readonly string[];
  /** Default 14. */
  labelSize?: number;
  opacity?: number;
}
export declare const Heatmap: FC<HeatmapProps>;
