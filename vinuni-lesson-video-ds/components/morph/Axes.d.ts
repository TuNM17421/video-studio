import type { FC } from 'react';

export interface AxesProps {
  /** Gốc toạ độ trên cảnh. */
  o: { x: number; y: number };
  /** Nửa chiều dài trục ngang. Default 420. */
  x?: number;
  /** Chiều dài trục dọc lên trên / xuống dưới. */
  yUp?: number;
  yDown?: number;
  /** Số vạch chia mỗi bên. 0 = không vạch. */
  ticks?: number;
  grid?: boolean;
  color?: string;
  /** Default LAYER.frame (15 %). */
  opacity?: number;
}
export declare const Axes: FC<AxesProps>;
