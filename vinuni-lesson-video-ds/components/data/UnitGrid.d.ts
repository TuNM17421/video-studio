import type { FC } from 'react';

export interface UnitGridProps {
  x: number;
  y: number;
  /** Default 10. */
  cols?: number;
  /** Default 6. */
  rows?: number;
  /** Cell side. Default 54. */
  cell?: number;
  /** Default 12. */
  gap?: number;
  /** Filled cells, continuous (the boundary cell fades by its fraction). */
  filled: number;
  /** Fill + caption color. Default C.red. */
  color?: string;
  caption?: string;
  opacity?: number;
}
export declare const UnitGrid: FC<UnitGridProps>;
