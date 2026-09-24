import type { FC, ReactNode } from 'react';

export interface CameraKey {
  /** Khung hình bắt đầu lia tới mốc này. */
  at: number;
  /** Số khung lia. Default 40. */
  dur?: number;
  /** Điểm trên mặt phẳng sẽ về giữa màn hình. */
  x: number;
  y: number;
  /** Bao nhiêu đơn vị mặt phẳng phủ hết chiều ngang 1920. */
  w: number;
}
export interface CanvasProps {
  frame: number;
  camera: readonly CameraKey[];
  children?: ReactNode;
}
/** Trạng thái camera ở một khung hình. */
export declare function cameraAt(camera: readonly CameraKey[], frame: number): { x: number; y: number; w: number; scale: number };
/** Điểm trên mặt phẳng → điểm trên màn hình ở khung `frame`. */
export declare function toScreen(camera: readonly CameraKey[], frame: number, p: { x: number; y: number }): { x: number; y: number; scale: number };
export declare const Canvas: FC<CanvasProps>;
