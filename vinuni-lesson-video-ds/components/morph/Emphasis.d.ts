import type { FC, ReactNode } from 'react';

export interface EmphasisProps {
  /** indicate = phình + đổi màu · flash = toả tia · circumscribe = đường bao chạy quanh. */
  kind?: 'indicate' | 'flash' | 'circumscribe';
  box: { x: number; y: number; w: number; h: number };
  /** DỐC 0→1 chạy suốt nhịp nhấn (linearProgress). KHÔNG truyền pulse(): nó đã là 0→1→0, chồng thêm chuông thì đỉnh nhịp thành 0. */
  t?: number;
  color?: string;
  rays?: number;
  opacity?: number;
  children?: ReactNode;
}
export declare const Emphasis: FC<EmphasisProps>;
