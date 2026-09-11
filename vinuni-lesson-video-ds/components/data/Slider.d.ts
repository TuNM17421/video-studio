import type { FC } from 'react';

export interface SliderProps {
  x1: number;
  x2: number;
  y: number;
  /** 0–1 knob position. Everything it controls must reshape from the same value. */
  value: number;
  /** Muted extreme labels, drawn on the track line 34 px outside each end. */
  left?: string;
  right?: string;
  /** Red caption under the track. */
  title?: string;
  /** Default C.red. */
  color?: string;
  opacity?: number;
}
export declare const Slider: FC<SliderProps>;
