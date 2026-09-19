import type { FC } from 'react';

export interface MisconceptionSide {
  /** Bold first line (24/700), usually UPPERCASE noun phrase. */
  title: string;
  /** Optional muted explanation line (21/600). */
  sub?: string;
}
export interface MisconceptionCardProps {
  /** Left edge of both cards. */
  x: number;
  /** Top of the belief card; the correction sits 246 px lower (150 card + 96 gap). */
  y: number;
  /** Default 1000. */
  w?: number;
  wrong: MisconceptionSide;
  right: MisconceptionSide;
  /** 0–1 red strike across the belief title. */
  strike?: number;
  /** 0–1 fade of the correction card. Keep 0 until the narration gives it. */
  reveal?: number;
  /** Default 'NHIỀU NGƯỜI NGHĨ'. */
  wrongLabel?: string;
  /** Default 'THỰC RA'. */
  rightLabel?: string;
  opacity?: number;
}
export declare const MisconceptionCard: FC<MisconceptionCardProps>;
