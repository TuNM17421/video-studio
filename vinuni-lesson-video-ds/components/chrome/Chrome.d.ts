import type { FC, ReactNode } from 'react';

/** Red uppercase eyebrow, centered (HTML). Default top 70. */
export declare const Eyebrow: FC<{ children?: ReactNode; top?: number; opacity?: number }>;
/** Brand watermark, top-right (HTML). Default label "VinUni · AI in Action 20K". */
export declare const Watermark: FC<{ label?: string }>;
/** Navy subtitle bar, bottom 96 px (HTML). One line ≤ 78 characters. */
export declare const SubtitleBar: FC<{ text?: string | null }>;
/** Footer "01 / 06 · Tên video" (HTML), sits under the subtitle bar. */
export declare const SceneFooter: FC<{ left?: ReactNode; right?: ReactNode }>;
/** Red-soft tag right-aligned under the divider (SVG). Default right edge 1792, top 228. */
export declare const CornerTag: FC<{ label: string; opacity?: number; right?: number; y?: number }>;
/** Centered SVG header: title (baseline 176) + divider (y 220) + optional corner tag. */
export declare const CenterHeader: FC<{ title?: string; titleSize?: number; tag?: string }>;
/** Editorial 120 px background grid (SVG). */
export declare const EditorialGrid: FC;
/** Editorial left-aligned header (HTML): kicker, title + red accent phrase, subtitle. */
export declare const EditorialHeader: FC<{
  kicker?: string;
  title?: string;
  titleAccent?: string;
  subtitle?: string;
  /** Default 54. */
  titleSize?: number;
  /** Scene frame (drives the soft entrance). */
  frame?: number;
}>;
