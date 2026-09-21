import type { FC } from 'react';

export interface Layer {
  /** 18/700 label, e.g. 'LỚP 2 · ỨNG DỤNG'. */
  label: string;
  sub?: string;
}
export interface LayerStackProps {
  x: number;
  /** Top of the first layer; rows are 130 px + 22 px gap. */
  y: number;
  /** Default 800. */
  w?: number;
  layers: readonly Layer[];
  /** Focused layer index; -1 = none. */
  active?: number;
  /** Optional 0–1 per layer to build the stack. */
  reveal?: readonly number[];
  opacity?: number;
}
export declare const LayerStack: FC<LayerStackProps>;
