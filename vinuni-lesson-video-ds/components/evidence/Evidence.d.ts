import type { FC } from 'react';

/** Khung đỏ khoanh một vùng của ảnh. Toạ độ TƯƠNG ĐỐI 0..1 so với tấm ảnh. */
export interface EvidenceMark {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EvidenceProps {
  /** Frame hiện tại của scene. Bắt buộc để có chuyển động. Default 0. */
  frame?: number;
  /** Đường dẫn ảnh chụp nguồn. CHỈ dùng cho nguồn CÓ THẬT — xem Evidence.prompt.md. */
  href: string;
  /** Dòng chú thích nguồn, hiện ngang, không nghiêng theo ảnh. */
  caption?: string;
  /** Chữ trong con dấu, ví dụ "NGUỒN THẬT". Bỏ trống thì không vẽ dấu. */
  stamp?: string | null;
  /** Các khung đỏ khoanh dòng quan trọng, vẽ dần theo frame. */
  marks?: EvidenceMark[];
  /** Vị trí và kích thước tấm ảnh trên canvas 1920×1080. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  /** Độ nghiêng của giấy (độ). Giữ nhỏ. Default -1.4. */
  tilt?: number;
}

export declare const Evidence: FC<EvidenceProps>;

/** Nền nâu đặt sau Evidence cho ảnh nổi lên. */
export declare const EvidenceBoard: FC<Record<string, never>>;
