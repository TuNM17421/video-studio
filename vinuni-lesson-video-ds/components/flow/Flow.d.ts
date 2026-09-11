import type { FC } from 'react';

export interface Point {
  x: number;
  y: number;
}
export interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FlowProps {
  /** Polyline (use anchor() for endpoints, sampleCubic()/sampleQuadratic() for curves). */
  points: readonly Point[];
  /** Scene frame. Travel = linear from `start` to `end`. */
  frame?: number;
  start?: number;
  end?: number;
  /** Explicit 0–1 travel instead of frame/start/end (static diagrams: progress={1}). */
  progress?: number;
  opacity?: number;
  /** Default C.accent; C.red for the chosen / transformed path. */
  color?: string;
  /** Default 5. */
  strokeWidth?: number;
  /** Marching dashed variant (13 11). */
  dashed?: boolean;
  /** Default true. */
  showParticle?: boolean;
  /** dotInactive base track. Default true. */
  drawBase?: boolean;
  /** Arrowhead at the end — fades in once the particle has hidden there (last 14 f when showParticle=false). Default true. */
  arrow?: boolean;
  /** Card bounds the particle must never cross. */
  hideIn?: readonly Bounds[];
  /** Hide distance from ends / bounds in px. Default 18 (dot 9 + halo 4 + card stroke 3 + 2). */
  clearance?: number;
  /** Fade the whole flow in over 18 f from `start`. Default true. */
  fadeIn?: boolean;
}
export declare const Flow: FC<FlowProps>;

export interface ParticleProps {
  x: number;
  y: number;
  color?: string;
  /** Default 9. */
  r?: number;
  /** White halo ring. Default true. */
  halo?: boolean;
  /** Pill label to the right. */
  label?: string;
  opacity?: number;
}
export declare const Particle: FC<ParticleProps>;

export interface StaticPathProps {
  points: readonly Point[];
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
  opacity?: number;
}
export declare const StaticPath: FC<StaticPathProps>;
