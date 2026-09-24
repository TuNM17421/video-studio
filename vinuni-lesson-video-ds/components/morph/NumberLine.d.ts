import type { FC } from 'react';

export interface NumberLineBox {
  o: { x: number; y: number };
  length: number;
  from: number;
  to: number;
}
/** Giá trị → điểm trên cảnh. Đây mới là phần quan trọng của component này. */
export declare function numberToPoint(box: NumberLineBox, v: number): { x: number; y: number };
export interface NumberLineProps extends Partial<NumberLineBox> {
  o: { x: number; y: number };
  step?: number;
  decimals?: number;
  label?: string;
  size?: number;
  color?: string;
  tick?: number;
  /** Default LAYER.frame. */
  opacity?: number;
  labelOpacity?: number;
}
export declare const NumberLine: FC<NumberLineProps>;
