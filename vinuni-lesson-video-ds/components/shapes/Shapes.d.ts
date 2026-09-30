import type { FC } from 'react';

interface Timed {
  /** Frame hiện tại của scene. Mọi chuyển động suy ra từ đây. */
  frame?: number;
  /** Frame bắt đầu diễn, tính trong scene. Default 0. */
  from?: number;
}

export interface DrawPathProps extends Timed {
  /** Chuỗi `d` của SVG path. */
  d: string;
  /** Số frame để vẽ xong nét. Default 24. */
  duration?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  strokeLinecap?: 'butt' | 'round' | 'square';
  opacity?: number;
}

export interface CalloutProps extends Timed {
  /** Toạ độ ĐỈNH ĐUÔI — điểm mà bong bóng trỏ tới. */
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  fill?: string;
  stroke?: string;
  ink?: string;
  fontSize?: number;
  /** Lệch đuôi so với mép trái hộp. Bỏ trống thì đuôi ở giữa. */
  pointerLeftOffset?: number | null;
}

export interface PieProps extends Timed {
  /** Tâm hình tròn. */
  x: number;
  y: number;
  radius?: number;
  /** Tỉ lệ 0..1 sẽ quét tới. */
  value?: number;
  duration?: number;
  fill?: string;
  track?: string;
  label?: string | null;
  /** Mực của nhãn giữa hình. Bỏ trống → `readableInk(fill)`: trắng trên nền tối, navy trên nền sáng
   *  (nhãn nằm ĐÈ lên lát đã tô, navy trên accent xanh thì chìm). */
  ink?: string;
}

export interface SparkProps extends Timed {
  x: number;
  y: number;
  /** Nửa cạnh hộp bao của tia. `makeSpark` nhận width/height, không nhận số cánh. */
  radius?: number;
  fill?: string;
  /** Độ cong lõm giữa bốn cánh. Default 1. */
  edgeRoundness?: number;
}

/** Nét tự vẽ ra theo frame (`evolvePath` của @remotion/paths). */
export declare const DrawPath: FC<DrawPathProps>;
/** Bong bóng chú thích có đuôi trỏ vào một điểm (`makeCallout`). */
export declare const Callout: FC<CalloutProps>;
/** Vòng tròn tỉ lệ quét dần (`makePie`). */
export declare const Pie: FC<PieProps>;
/** Tia nhấn cho khoảnh khắc "à ra thế" (`makeSpark`). */
export declare const Spark: FC<SparkProps>;

export interface MorphProps extends Timed {
  /** Path lúc đầu. */
  a: string;
  /** Path lúc cuối. `interpolatePath` tự chuẩn hoá hai path về cùng số lệnh. */
  b: string;
  duration?: number;
  x?: number;
  y?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface TracerProps extends Timed {
  /** Đường mà chấm chạy dọc theo. */
  d: string;
  duration?: number;
  radius?: number;
  fill?: string;
  /** Khác 0 thì vẽ vệt mờ phần đã đi qua. */
  trail?: number;
  opacity?: number;
}

export interface ArrowProps extends Timed {
  /** Toạ độ ĐUÔI mũi tên. */
  x: number;
  y: number;
  length?: number;
  /** Hướng chỉ, độ. 0 = sang phải. */
  angle?: number;
  duration?: number;
  thickness?: number;
  fill?: string;
  opacity?: number;
}

/** Một hình biến dần thành hình khác (`interpolatePath`). */
export declare const Morph: FC<MorphProps>;
/** Chấm chạy dọc path, quay theo hướng đi (`getPointAtLength` + `getTangentAtLength`). */
export declare const Tracer: FC<TracerProps>;
/** Mũi tên mọc dài ra theo frame (`makeArrow`). */
export declare const Arrow: FC<ArrowProps>;
