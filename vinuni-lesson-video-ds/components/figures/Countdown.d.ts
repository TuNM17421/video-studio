import type { FC } from 'react';

export interface CountdownProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Outer radius. Default 96. */
  r?: number;
  /** How long the pause lasts, in seconds. Default 30. */
  seconds?: number;
  /** Scene frame — the ring and the number are derived from it, never from real time. Default 0. */
  frame?: number;
  /** Frames per second, to turn `frame` into seconds. Default 30. */
  fps?: number;
  /** Ring and number color. Default C.red. */
  color?: string;
  /** The unspent part of the ring behind the arc. Default C.dotInactive. */
  track?: string;
  /** Caption under the ring, e.g. "giây để suy nghĩ". */
  label?: string;
  opacity?: number;
}

export declare const Countdown: FC<CountdownProps>;
