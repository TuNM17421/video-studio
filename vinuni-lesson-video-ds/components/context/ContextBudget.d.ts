import type { FC } from 'react';

export type BudgetTone = 'accent' | 'system' | 'purple' | 'green' | 'orange' | 'amber' | 'red' | 'muted';

export interface BudgetSegment {
  /** Uppercase part name ("LỊCH SỬ"). */
  label: string;
  /** Size of the part in tokens (illustrative). */
  tokens: number;
  /** Hue of the segment (soft fill + stroke + label). Default 'accent'. */
  tone?: BudgetTone;
}
export interface ContextBudgetProps {
  /** Bar left. */
  x: number;
  /** Bar top. Title row + MINH HỌA tag sit 56–96 px above. */
  y: number;
  /** Width of the LIMIT (track). Overflow draws beyond x+w — reserve overflow + ≈280 px. */
  w: number;
  /** Bar height. Default 76. */
  h?: number;
  /** Parts, filled left to right in this order. */
  segments: readonly BudgetSegment[];
  /** Context limit in tokens (e.g. 8000). Default = sum of segments. */
  limit?: number;
  /** Scene frame; segment i fills over [start + i·per, start + (i+1)·per]. Omit = settled. */
  frame?: number;
  /** Default 0. */
  start?: number;
  /** Frames per segment. Default 18. */
  per?: number;
  /** false → no numbers anywhere, proportions only ("không gắn số đo giả"). Default true. */
  showNumbers?: boolean;
  /** Writes "8.500 − 8.000 = 500" under the bar. Default false. */
  showSum?: boolean;
  /** Uppercase title above the bar, left. */
  title?: string;
  /** Default 'GIỚI HẠN'. */
  limitLabel?: string;
  /** Default 'PHẦN DƯ'. */
  overflowLabel?: string;
  /** Default 'bị cắt'. */
  overflowNote?: string;
  /** MINH HỌA tag (true | label, e.g. 'GIỚI HẠN MINH HỌA'). Default TRUE — token counts are illustrative. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const ContextBudget: FC<ContextBudgetProps>;
export declare const BUDGET_TONES: Readonly<Record<BudgetTone, readonly [string, string]>>;
