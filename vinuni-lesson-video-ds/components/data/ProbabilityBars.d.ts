import type { FC } from 'react';

export interface ProbabilityItem {
  label: string;
  /** Continuous value (percent). Rounded only for display. */
  value: number;
  /** Red = the chosen / highlighted item. */
  highlight?: boolean;
}
export interface ProbabilityBarsProps {
  x: number;
  /** Top of the first bar. */
  y: number;
  items: readonly ProbabilityItem[];
  /** 0–1 grows every bar; values appear as the bars finish. */
  reveal?: number;
  /** Default 360. */
  barW?: number;
  /** Default 43. */
  barH?: number;
  /** Default 76. */
  rowGap?: number;
  /** Default 155. */
  labelW?: number;
  /** Label / value size. Default 30. */
  size?: number;
  /** Day05 pill bars on a dotInactive track (default: Day01 radius 5 on bgAlt). */
  rounded?: boolean;
  showValues?: boolean;
  title?: string;
  footnote?: string;
  /** Scale reference (default: the largest value). Use 100 for percentages. */
  max?: number;
  opacity?: number;
}
export declare const ProbabilityBars: FC<ProbabilityBarsProps>;
