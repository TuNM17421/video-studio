import type { FC } from 'react';

export interface CursorWaypoint {
  /** Tip position, scene px. */
  x: number;
  y: number;
  /** Frame the tip arrives here (increasing along the path). Repeat a point to hold. */
  at: number;
  /** true → click when arriving (at `at`); a number → click at that frame. Plays the dip + ripple. */
  click?: boolean | number;
}

export interface CursorProps {
  /** Waypoints; the tip eases (EASE.inOut) between consecutive ones. */
  path?: readonly CursorWaypoint[];
  /** Scene frame. Omit → settled on the last waypoint, no ripple. */
  frame?: number;
  /** Static tip position when there is no `path`. */
  x?: number;
  y?: number;
  /** Arrow height in px. Default 40. */
  size?: number;
  /** Ripple color. Default C.red (the action). */
  color?: string;
  opacity?: number;
}
export declare const Cursor: FC<CursorProps>;
/** Tip position at `frame` along `path` (holds before the first / after the last waypoint). */
export declare function cursorPosition(path: readonly CursorWaypoint[], frame?: number): { x: number; y: number };
