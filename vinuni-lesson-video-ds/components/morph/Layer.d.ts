import type { FC, ReactNode } from 'react';

/** Ba mức đậm nhạt của style biến hình: 100 % · 40 % · 15 %. */
export declare const LAYER: Readonly<{ main: 1; context: number; frame: number }>;
export interface LayerProps {
  level?: 'main' | 'context' | 'frame';
  /** Nhân thêm (để vào / ra mềm). Default 1. */
  fade?: number;
  children?: ReactNode;
}
export declare const Layer: FC<LayerProps>;
