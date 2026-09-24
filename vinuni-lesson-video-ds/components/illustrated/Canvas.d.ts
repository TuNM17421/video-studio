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

export interface CanvasZone {
  id: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Khung hình đầu của khoảng cụm này PHẢI đọc được. Default 0. */
  from?: number;
  /** Khung hình cuối của khoảng đó. Default hết video. */
  to?: number;
}
/** Vùng màn hình được phép: dưới eyebrow, trên thanh phụ đề. */
export declare const CANVAS_SAFE: { x0: number; y0: number; x1: number; y1: number };
/** Soát mặt phẳng: cụm nào bị chrome đè khi camera lia/zoom. tools/verify.mjs gọi qua `meta.canvas`. */
export declare function checkCanvas(
  input: { zones?: readonly CanvasZone[]; camera?: readonly CameraKey[] },
  opts?: { duration?: number; step?: number },
): { problems: string[]; warnings: string[] };

