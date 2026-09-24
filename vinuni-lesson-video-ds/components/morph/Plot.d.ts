import type { FC } from 'react';

export interface PlotBox {
  o: { x: number; y: number };
  w: number;
  h: number;
  from: number;
  to: number;
  min?: number;
  max?: number;
}
/** (x, y) của hàm → điểm trên cảnh. */
export declare function plotPoint(box: PlotBox, x: number, y: number): { x: number; y: number };
export interface PlotProps extends Partial<PlotBox> {
  o: { x: number; y: number };
  fn: (x: number) => number;
  samples?: number;
  color?: string;
  /** Tô vùng dưới đường. */
  fill?: boolean;
  fillOpacity?: number;
  width?: number;
  /** 0→1 vẽ đường từ trái sang. */
  reveal?: number;
  opacity?: number;
}
export declare const Plot: FC<PlotProps>;
