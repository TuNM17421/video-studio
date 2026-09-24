import type { FC } from 'react';
import type { TokenCell } from './TokenRow';

export interface AttentionPoint {
  x: number;
  y: number;
}
export interface AttentionLink {
  /** Chỉ số token ở hàng `from`. */
  from: number;
  /** Chỉ số token ở hàng `to`. */
  to: number;
  /** Trọng số 0–1 — kịch bản đưa, đừng tự sinh. */
  w: number;
  color?: string;
}
export interface AttentionLinesProps {
  from: readonly AttentionPoint[];
  to: readonly AttentionPoint[];
  links: readonly AttentionLink[];
  color?: string;
  /** Màu đường nặng (w ≥ 0.6). Default C.red. */
  strongColor?: string;
  /** Độ cong 0–1. Default 0.45. */
  bend?: number;
  /** Đẩy hai điểm điều khiển xuống — dùng khi hai hàng neo nằm cùng độ cao. Default 0. */
  dip?: number;
  /** Bỏ đường nhẹ hơn mức này. Default 0.08. */
  minWeight?: number;
  /** Chỉ vẽ đường từ một token — hầu như luôn nên dùng. */
  focus?: number;
  /** 0→1 kéo từng đường ra dần. */
  reveal?: number;
  maxWidth?: number;
  opacity?: number;
}
export declare const AttentionLines: FC<AttentionLinesProps>;
/** Neo dưới mỗi ô của một hàng token (đầu trên của đường). */
export declare function anchorsBelow(cells: readonly TokenCell[], pad?: number): AttentionPoint[];
/** Neo trên mỗi ô của một hàng token (đầu dưới của đường). */
export declare function anchorsAbove(cells: readonly TokenCell[], pad?: number): AttentionPoint[];
