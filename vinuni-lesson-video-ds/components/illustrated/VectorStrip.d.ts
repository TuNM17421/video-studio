import type { FC } from 'react';

export interface VectorStripProps {
  x: number;
  y: number;
  /** Mỗi chiều một ô; giá trị trong [-domain, domain]. Âm tô đỏ, dương tô mực chính. */
  values: readonly number[];
  cell?: number;
  /** Chiều cao dải. Default 56. */
  h?: number;
  gap?: number;
  /** Giá trị tuyệt đối lớn nhất. Default 1. */
  domain?: number;
  color?: string;
  negColor?: string;
  /** Ngoặc vuông hai đầu. Default true. */
  brackets?: boolean;
  label?: string;
  /** Viết số trong ô — chỉ khi kịch bản có số thật. */
  showValues?: boolean;
  size?: number;
  highlight?: number;
  /** 0→1 mở dần từ trái. */
  reveal?: number;
  opacity?: number;
}
export declare const VectorStrip: FC<VectorStripProps>;
