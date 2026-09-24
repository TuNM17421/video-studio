import type { FC } from 'react';

/** Một giá trị giữ nguyên, hoặc cặp [đầu, cuối] để nội suy theo `t`. */
export type MorphValue<T> = T | readonly [T, T];
export interface MorphProps {
  /** Path khép kín (components/morph/shapes.js). */
  from: string;
  to: string;
  /** 0–1. */
  t?: number;
  fill?: MorphValue<string>;
  fillOpacity?: MorphValue<number>;
  stroke?: MorphValue<string>;
  strokeWidth?: MorphValue<number>;
  opacity?: number;
}
export declare const Morph: FC<MorphProps>;
