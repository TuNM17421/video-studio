import type { FC } from 'react';

export interface MatrixCell {
  label: string;
  sub?: string;
}
export interface Matrix2x2Props {
  /** Left edge of the grid (leave ~220 px left of it for row labels). */
  x: number;
  y: number;
  /** Side of the square. Default 480. */
  size?: number;
  /** [left column, right column] labels under the grid. */
  axisX?: readonly string[];
  /** [top row, bottom row] labels left of the grid. */
  axisY?: readonly string[];
  /** Reading order: top-left, top-right, bottom-left, bottom-right. */
  cells?: readonly MatrixCell[];
  /** Highlighted cell index; -1 = none. */
  highlight?: number;
  /** Optional 0–1 per cell. */
  reveal?: readonly number[];
  opacity?: number;
}
export declare const Matrix2x2: FC<Matrix2x2Props>;
