import type { FC } from 'react';

export interface VectorColumnProps {
  x: number;
  y: number;
  values: readonly (string | number)[];
  /** Default 48. */
  cellH?: number;
  /** Default 110. */
  w?: number;
  /** Default 28. */
  size?: number;
  color?: string;
  bracketColor?: string;
  /** Row index drawn in red. */
  highlight?: number;
  /** Muted caption under the vector. */
  label?: string;
  opacity?: number;
}
export declare const VectorColumn: FC<VectorColumnProps>;
