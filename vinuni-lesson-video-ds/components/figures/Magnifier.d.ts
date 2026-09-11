import type { FC, ReactNode } from 'react';

export interface MagnifierWaypoint {
  x: number;
  y: number;
  /** Frame the lens reaches this point. */
  at: number;
}
export interface MagnifierProps {
  /** Lens center (when no `path`). */
  x?: number;
  y?: number;
  /** Waypoints; with `frame` the lens glides between them (eased, holds at the ends). Default = last point. */
  path?: readonly MagnifierWaypoint[];
  /** Lens radius. Default 70. */
  r?: number;
  /** Magnification of `children` inside the lens. Default 1.8. */
  zoom?: number;
  frame?: number;
  /** Lens + handle color. Default C.accent; C.red = "found it". */
  color?: string;
  /** The same SVG that is drawn underneath (scene coords) — re-drawn clipped + scaled inside the lens. */
  children?: ReactNode;
  opacity?: number;
}
export declare const Magnifier: FC<MagnifierProps>;
/** Lens center at `frame` along `path`. */
export declare function magnifierAt(path: readonly MagnifierWaypoint[], frame?: number): { x: number; y: number };
