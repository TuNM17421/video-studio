import type { FC } from 'react';

export interface SpotlightRegion {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface SpotlightProps {
  /** The region that stays sharp (scene px). */
  region: SpotlightRegion;
  /** 0–1 veil strength (× 82 %). */
  amount?: number;
  /** Grows the hole around the region. Default 18. */
  pad?: number;
  /** Hole corner radius. Default 26. */
  radius?: number;
  /** Mask id suffix; default derives from the region. */
  id?: string;
}
export declare const Spotlight: FC<SpotlightProps>;
