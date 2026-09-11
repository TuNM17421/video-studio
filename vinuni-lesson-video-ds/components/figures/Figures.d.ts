import type { FC } from 'react';

export interface PersonProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Circle radius. Default 66. */
  r?: number;
  /** Bold label under the circle (e.g. "Học viên"). */
  name?: string;
  /** Muted second label. */
  role?: string;
  /** Red instead of accent. */
  active?: boolean;
  /** Override stroke/figure color (a C token). */
  color?: string;
  opacity?: number;
}
export declare const Person: FC<PersonProps>;

export interface DocumentSheetProps {
  x: number;
  y: number;
  /** Page width (height = 168/215 × w). Default 215. */
  w?: number;
  label?: string;
  detail?: string;
  selected?: boolean;
  /** 0–1 draws the text lines progressively. */
  fill?: number;
  /** Number of text lines. Default 3. */
  lines?: number;
  opacity?: number;
}
export declare const DocumentSheet: FC<DocumentSheetProps>;

export interface FormRow {
  /** Question / field name ("Ai gặp khó?"). */
  label: string;
  /** Filled value; omit for an empty dashed slot (nothing measured yet). */
  value?: string;
}
export interface FormSheetProps {
  x: number;
  y: number;
  w: number;
  /** Uppercase header ("PHIẾU MÔ TẢ"). */
  title?: string;
  rows: readonly FormRow[];
  /** Row height. Default 76. */
  rowH?: number;
  /** Width of the label column. Default 48 % of w. */
  labelW?: number;
  /** Per-row reveal 0–1. */
  reveal?: readonly number[];
  /** Highlighted row index (red-soft). */
  active?: number;
  opacity?: number;
}
export declare const FormSheet: FC<FormSheetProps>;

export interface SpeechBubbleProps {
  x: number;
  y: number;
  w: number;
  /** Body height (tail adds 26). Default 88. */
  h?: number;
  label?: string;
  /** 1–2 centered lines instead of `label`. */
  lines?: readonly string[];
  tone?: 'accent' | 'red';
  tail?: 'left' | 'right';
  /** Default 24. */
  size?: number;
  opacity?: number;
}
export declare const SpeechBubble: FC<SpeechBubbleProps>;

export interface StopwatchProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Default 54. */
  r?: number;
  /** 0–1 = one full turn of the hand (continuous). */
  sweep?: number;
  label?: string;
  /** Default C.red. */
  color?: string;
  /** Red-soft wedge for the elapsed share. Default true. */
  wedge?: boolean;
  opacity?: number;
}
export declare const Stopwatch: FC<StopwatchProps>;
