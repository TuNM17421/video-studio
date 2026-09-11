import type { FC } from 'react';

export interface RecapItem {
  /** Uppercase strong-blue title column (short). */
  title: string;
  /** Bold body, ≤ 2 lines. */
  body: string;
}
export interface RecapProps {
  /** 3–5 items. */
  items: readonly RecapItem[];
  frame: number;
  /** Reveal frame per item. */
  reveals: readonly number[];
  /** One closing line (≤ ~90 characters). */
  closing?: string;
  /** Default: last reveal + 60. */
  closingAt?: number;
  /** Default 262. */
  top?: number;
  /** Default 140. */
  gap?: number;
  /** Default 116. */
  rowH?: number;
  railX?: number;
  cardX?: number;
  cardW?: number;
}
/** HTML overlay inside a SceneFrame (below the centered header). */
export declare const Recap: FC<RecapProps>;
