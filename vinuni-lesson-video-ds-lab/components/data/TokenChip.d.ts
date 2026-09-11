import type { FC } from 'react';

export interface TokenChipProps {
  x: number;
  y: number;
  text: string;
  /** Default 170. */
  w?: number;
  /** Default 80. */
  h?: number;
  /** Default 36. */
  size?: number;
  /** The newly chosen token (red). */
  selected?: boolean;
  /** 0–1 stroke 2→5 px while in focus. */
  active?: number;
  dashed?: boolean;
  muted?: boolean;
  opacity?: number;
}
export declare const TokenChip: FC<TokenChipProps>;
