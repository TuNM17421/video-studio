import type { FC } from 'react';

export interface PathTraceProps {
  /** Path data của đường đi. */
  d: string;
  /** Tiến độ 0→1 dọc đường. */
  t?: number;
  /** > 0 thì chấm nhảy từng nấc — đúng hơn cho thuật toán lặp. */
  steps?: number;
  color?: string;
  traceColor?: string;
  width?: number;
  dot?: number;
  /** Chấm mờ ở mỗi nấc đã đi. Default true. */
  showDots?: boolean;
  opacity?: number;
}
export declare const PathTrace: FC<PathTraceProps>;
