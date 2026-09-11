import type { FC, ReactNode } from 'react';

export type Anchor = 'start' | 'middle' | 'end';

export interface SvgTextProps {
  x: number;
  /** Baseline y (scene px). */
  y: number;
  children?: ReactNode;
  /** px. Default 25. */
  size?: number;
  /** A C token. Default C.text. */
  color?: string;
  /** 500 | 600 | 700. Default 600. */
  weight?: number;
  /** Default 'middle'. */
  anchor?: Anchor;
  opacity?: number;
  letterSpacing?: number;
  baseline?: string;
  /** Pass MONO for code. Default: inherits Montserrat. */
  family?: string;
}
export declare const SvgText: FC<SvgTextProps>;

export interface MultilineProps {
  x: number;
  /** Vertical middle of the whole block. */
  y: number;
  lines: readonly string[];
  /** Default 24. */
  size?: number;
  /** Default 33. */
  lineHeight?: number;
  color?: string;
  /** Default 600. */
  weight?: number;
  /** Weight for the first line (cards use 700). */
  firstWeight?: number;
  anchor?: Anchor;
  opacity?: number;
}
export declare const Multiline: FC<MultilineProps>;

export interface RichSpan {
  text: string;
  color?: string;
  weight?: number;
}
export interface RichTextProps {
  x: number;
  y: number;
  spans: readonly RichSpan[];
  /** Default 32. */
  size?: number;
  weight?: number;
  color?: string;
  anchor?: Anchor;
  opacity?: number;
}
export declare const RichText: FC<RichTextProps>;
