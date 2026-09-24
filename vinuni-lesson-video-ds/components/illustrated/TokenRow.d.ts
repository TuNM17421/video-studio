import type { FC } from 'react';

export interface TokenCell {
  text: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Tâm ô — neo để nối AttentionLines. */
  cx: number;
  cy: number;
}
export interface TokenRowLayout {
  x: number;
  y: number;
  tokens: readonly (string | { text: string })[];
  size?: number;
  padX?: number;
  gap?: number;
  rowGap?: number;
  /** Bề rộng tối đa trước khi xuống dòng. Default 1600. */
  maxW?: number;
}
/** Vị trí từng viên token — dùng cho AttentionLines và để đặt VectorStrip ngay dưới một token. */
export declare function tokenLayout(props: TokenRowLayout): TokenCell[];

export interface TokenRowProps extends TokenRowLayout {
  /** Số token đã hiện. Default: tất cả. */
  shown?: number;
  /** Phần hiện dở (0–1) của token thứ `shown`. */
  enter?: number;
  /** Chỉ số token tô đỏ. */
  highlight?: number;
  color?: string;
  /** Viết chỉ số dưới mỗi token. */
  ids?: boolean;
  opacity?: number;
}
export declare const TokenRow: FC<TokenRowProps>;
