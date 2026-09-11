import type { FC, ReactNode } from 'react';

export interface GlassBoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Pill label straddling the top edge (uppercase). */
  label?: string;
  opacity?: number;
  /** 0–1 red-soft flash while data passes (× 0.5). */
  active?: number;
  /** Default C.accent. */
  accent?: string;
  /** SVG content drawn inside the machine (layers, grids, bars). */
  children?: ReactNode;
}
export declare const GlassBox: FC<GlassBoxProps>;
