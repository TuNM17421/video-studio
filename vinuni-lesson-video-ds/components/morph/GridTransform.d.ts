import type { FC } from 'react';

/** Ma trận 2×2 theo CỘT: [[a, c], [b, d]] — cột một là chỗ î đáp xuống, cột hai là ĵ. */
export type Matrix2 = readonly [readonly [number, number], readonly [number, number]];
export interface GridTransformProps {
  /** Gốc toạ độ trên cảnh. */
  o: { x: number; y: number };
  m?: Matrix2;
  /** 0 = lưới gốc, 1 = đã biến đổi hết. */
  t?: number;
  /** Cạnh một ô lưới, px. Default 90. */
  unit?: number;
  /** Số ô mỗi phía. Default 5. */
  span?: number;
  color?: string;
  /** Giữ lưới gốc mờ phía sau (15 %). Default true — bỏ đi là mất một nửa ý nghĩa. */
  ghost?: boolean;
  ghostColor?: string;
  /** Vẽ hai vector cơ sở î (đỏ) và ĵ (xanh đậm). */
  vectors?: boolean;
  width?: number;
  /** Cắt lưới gọn trong một ô — lưới bị kéo sẽ tràn khỏi khung nếu không có. */
  clip?: { x: number; y: number; w: number; h: number; r?: number };
  /** Khoá riêng khi có nhiều GridTransform trong một cảnh (dùng cho clipPath id). */
  id?: string;
  opacity?: number;
}
/** Ma trận ở thời điểm t (nội suy từ đơn vị tới m). */
export declare function matrixAt(m: Matrix2, t: number): number[][];
/** Điểm lưới (u, v) → điểm màn hình. */
export declare function gridPoint(o: { x: number; y: number }, mt: number[][], unit: number, u: number, v: number): { x: number; y: number };
export declare const GridTransform: FC<GridTransformProps>;
