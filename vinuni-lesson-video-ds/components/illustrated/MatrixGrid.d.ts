import type { FC } from 'react';

export interface MatrixGridProps {
  x: number;
  y: number;
  /** values[hàng][cột], trong [-domain, domain]. */
  values: readonly (readonly number[])[];
  cell?: number;
  gap?: number;
  domain?: number;
  color?: string;
  negColor?: string;
  rowLabels?: readonly string[];
  colLabels?: readonly string[];
  labelSize?: number;
  label?: string;
  /** Viết số trong ô — chỉ khi kịch bản có số thật. */
  showValues?: boolean;
  size?: number;
  /** Tô sáng một hàng (các ô khác mờ đi) — chỉ ra hàng đang được nhân. */
  highlightRow?: number;
  /** Tô sáng một cột. */
  highlightCol?: number;
  brackets?: boolean;
  /** 0→1 mở dần theo hàng. */
  reveal?: number;
  opacity?: number;
}
export declare const MatrixGrid: FC<MatrixGridProps>;
