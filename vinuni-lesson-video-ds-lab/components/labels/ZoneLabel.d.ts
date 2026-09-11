import type { FC } from 'react';

export interface ZoneLabelProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Uppercase lane / zone name. */
  label: string;
  /** Default C.accent; C.red for governance / risk zones. */
  color?: string;
  opacity?: number;
  /** Default 16. */
  size?: number;
}
export declare const ZoneLabel: FC<ZoneLabelProps>;
