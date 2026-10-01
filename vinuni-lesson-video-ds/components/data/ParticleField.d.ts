import type { FC } from 'react';

export interface HeatZone {
  x: number;
  /** Default: the vertical middle of the box. */
  y?: number;
  /** Radius of the zone. */
  r: number;
  /** Speed/amplitude multiplier at the centre. Default 1.8. */
  boost?: number;
}

export interface ParticleFieldProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Scene frame — every position is a pure function of (index, frame). */
  frame: number;
  /** Default 60. */
  count?: number;
  /** Changes the whole arrangement without changing anything else. Default 1. */
  seed?: number;
  /** Default 0.9. */
  speed?: number;
  /** Wander amplitude in px. Default 20. */
  wander?: number;
  /** Vertical share of `wander`. Default 0.62; raise it to fill a shallow box. */
  wanderY?: number;
  /** Dot radius. Default 5. */
  r?: number;
  /** Closed polyline: adds net transport (a convection loop) on top of the jiggle. */
  path?: readonly { x: number; y: number }[];
  /** Where the particles are hotter — faster and wider. */
  heat?: HeatZone;
  /** [from, to] along `path` (0–1) where particles read as liquid: `cool`, smaller. */
  coolAt?: readonly [number, number];
  /** Vapor color. Default C.red. */
  hot?: string;
  /** Liquid color. Default C.accent. */
  cool?: string;
  opacity?: number;
}
export declare const ParticleField: FC<ParticleFieldProps>;
