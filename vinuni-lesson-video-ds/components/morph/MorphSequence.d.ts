import type { FC } from 'react';

export interface MorphState {
  /** Khung hình bắt đầu chuyển sang trạng thái này. */
  at: number;
  /** Số khung chuyển. Default 60. */
  dur?: number;
  /** Path khép kín. Không khai thì giữ hình của trạng thái trước. */
  shape?: string;
  fill?: string;
  fillOpacity?: number;
  stroke?: string;
  strokeWidth?: number;
}
export interface MorphSequenceProps {
  frame: number;
  /** Trạng thái sau thừa kế thuộc tính không khai của trạng thái trước. */
  states: readonly MorphState[];
  opacity?: number;
  /** Mặc định ease-in-out. */
  ease?: (t: number) => number;
}
/** Danh sách trạng thái đã điền đủ thuộc tính — dùng cho kiểm tra và công cụ. */
export declare function resolveStates(states: readonly MorphState[]): Required<Omit<MorphState, 'dur'>>[];
export declare const MorphSequence: FC<MorphSequenceProps>;
