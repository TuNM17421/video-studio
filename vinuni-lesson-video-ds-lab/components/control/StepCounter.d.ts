import type { FC } from 'react';

export interface StepCounterProps {
  /** Top-left x. */
  x: number;
  /** Top-left y. */
  y: number;
  /** Current count (floored, clamped to 0…max). Drive it from the frame in the scene. Default 0. */
  value?: number;
  /** Number of pips / the limit. Default 3. */
  max?: number;
  /** 17/700 uppercase label top-left. Default 'LƯỢT GỌI CÔNG CỤ'. */
  label?: string;
  /** Top-right tag: true → 'MINH HỌA', or a label such as 'GIỚI HẠN MINH HỌA'. Default false. */
  illustrative?: boolean | string;
  /** Current frame; with `at`, the latest filled pip pops in (popScale). */
  frame?: number;
  /** Frame the latest pip was added. */
  at?: number;
  /** Adds a footer with an amber pause icon + `pausedNote` — the loop waits and the count does not grow. */
  paused?: boolean;
  /** Default 'chờ người dùng — bộ đếm không tăng'. */
  pausedNote?: string;
  /** Card width; default computed from label, tag, pips and note (min 280). Height is 128 (172 when paused). */
  w?: number;
  opacity?: number;
}
/** value ≥ max → 'limit' state: red stroke, red pips and number. */
export declare const StepCounter: FC<StepCounterProps>;
