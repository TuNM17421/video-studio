import type { FC } from 'react';

export interface TimelineItem {
  /** Under the rail, e.g. '2017'. */
  year: string;
  /** Above the rail (24/700), short. */
  label: string;
  /** The milestone being discussed (red, larger dot). */
  current?: boolean;
}
export interface TimelineProps {
  x: number;
  /** Rail y. Labels sit 48 px above, years 62 px below. */
  y: number;
  /** Default 1480. */
  w?: number;
  items: readonly TimelineItem[];
  /** 0–1 fill; a milestone lights when the fill reaches it. */
  progress?: number;
  opacity?: number;
}
export declare const Timeline: FC<TimelineProps>;
