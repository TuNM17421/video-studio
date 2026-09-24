import type { FC } from 'react';

export interface ValueReadoutProps {
  x: number;
  y: number;
  /** Số LIÊN TỤC, nối thẳng từ hình học đang chạy. Làm tròn chỉ khi vẽ. */
  value: number;
  label?: string;
  /** Số chữ số thập phân. Default 2. Dấu thập phân là dấu phẩy. */
  decimals?: number;
  size?: number;
  labelSize?: number;
  color?: string;
  labelColor?: string;
  anchor?: 'start' | 'middle' | 'end';
  suffix?: string;
  opacity?: number;
}
export declare const ValueReadout: FC<ValueReadoutProps>;
