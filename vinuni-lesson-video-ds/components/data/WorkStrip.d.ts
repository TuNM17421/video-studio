import type { FC } from 'react';

export interface WorkCell {
  /** done = the machine really did it · skip = it was skipped · pending = not yet. */
  state: 'done' | 'skip' | 'pending';
  /** Short caption inside the cell ("GPU", "AI"). */
  label?: string;
}

export interface WorkStripProps {
  x: number;
  y: number;
  w: number;
  /** Up to 24 cells, in order. */
  cells: readonly WorkCell[];
  /** Default 56. */
  cellH?: number;
  /** Default 16. */
  gap?: number;
  /** Line above the row saying what one cell is. */
  caption?: string;
  /** Cell text size. Default 17. */
  size?: number;
  /** 0–1: fills the row left to right. */
  reveal?: number;
  opacity?: number;
}
export declare const WorkStrip: FC<WorkStripProps>;
