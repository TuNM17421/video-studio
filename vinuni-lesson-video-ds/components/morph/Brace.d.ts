import type { FC } from 'react';

export interface BraceProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  label?: string;
  /** Phía ngoặc nằm so với đoạn. Default 'down'. */
  side?: 'up' | 'down' | 'left' | 'right';
  depth?: number;
  /** 0→1 mở ngoặc ra từ giữa. */
  grow?: number;
  color?: string;
  size?: number;
  gap?: number;
  opacity?: number;
}
export declare const Brace: FC<BraceProps>;
