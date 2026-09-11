import type { FC } from 'react';

export type GateState = 'open' | 'blocked' | 'error' | 'pending';

export interface GateProps {
  /** Center x of the post (scene px). */
  x: number;
  /** Center y of the post — put it ON the connector's y. */
  y: number;
  /** Post length along its long axis. Default 164 (thickness is fixed at 64). */
  h?: number;
  /** 17/700 uppercase label drawn 34 px below the post, in the state hue: "CỔNG QUYỀN", "CỔNG DUYỆT". */
  label?: string;
  /** open = green + lock-open · blocked = red + lock + red-soft fill · error = orange + triangle-alert · pending = amber + hourglass. Default 'blocked'. */
  state?: GateState;
  /** Current frame; with `at` drives the arrival pulse. Omit for the settled gate. */
  frame?: number;
  /** Frame a particle / item arrives at the gate → 54-frame pulse (stroke 3→5 + halo). */
  at?: number;
  opacity?: number;
  /** 'vertical' (default, sits across a horizontal connector) · 'horizontal' (across a vertical connector). */
  orientation?: 'vertical' | 'horizontal';
}
export declare const Gate: FC<GateProps>;

export interface GateGeometry {
  x: number;
  y: number;
  h?: number;
  orientation?: 'vertical' | 'horizontal';
}
/** The post rectangle ({x, y, w, h}) of a gate placed at center (x, y). */
export declare function gateBox(gate: GateGeometry): { x: number; y: number; w: number; h: number };
/** Connector end point on a gate side, `gap` px (default 10) outside the stroke. Use as the last Flow point to stop a particle at the gate. */
export declare function gateStop(gate: GateGeometry, side?: 'left' | 'right' | 'top' | 'bottom', gap?: number): { x: number; y: number };
/** state → [stroke, softFill, LineIcon name]. */
export declare const GATE_STATES: Readonly<Record<GateState, readonly [string, string, string]>>;
