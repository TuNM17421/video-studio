import type { FC } from 'react';

export interface NumberBadgeProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  value: string | number;
  opacity?: number;
  active?: boolean;
  /** Radius. Default 24 — keep equal across siblings. */
  r?: number;
}
export declare const NumberBadge: FC<NumberBadgeProps>;

export interface StatusDotProps {
  x: number;
  y: number;
  opacity?: number;
  active?: boolean;
  /** Default 9. */
  r?: number;
}
export declare const StatusDot: FC<StatusDotProps>;
