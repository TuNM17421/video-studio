import type { FC } from 'react';

/**
 * Tám pose của LEXCE — mascot chính thức của VinUniversity, nhân vật dẫn chuyện DUY NHẤT.
 *
 * Thêm pose = thêm một dòng vào `POSE_SPEC` trong Mascot.jsx rồi bổ sung tên vào union này. Đừng
 * chép một khối artwork riêng cho pose mới, và đừng thêm nhân vật thứ hai: pose `formal` (chim mặc
 * vest) cùng nhân vật giáo sư đã phải xoá ngày 14/09/2026 vì đúng hai lỗi đó.
 */
export type MascotPose =
  | 'idle' | 'point' | 'wave' | 'teach'
  | 'happy' | 'sad' | 'excited' | 'serious';

/** Chỗ đứng có sẵn cho mascot trên canvas 1920×1080. */
export type MascotSpot =
  | 'corner' | 'cornerLeft'
  | 'costarRight' | 'costarLeft'
  | 'peekBottom' | 'center';

/** Hiệu ứng cảm xúc nổi bên đầu mascot. */
export type MascotEmote = 'surprise' | 'question' | 'idea' | 'sweat';

export interface MascotProps {
  pose?: MascotPose;
  /** Chỗ đứng dựng sẵn; đặt `at` thì khỏi tự tính x/y/size/facing. */
  at?: MascotSpot | null;
  /** Artwork height in scene pixels. Default 220; width scales from the 200:220 viewBox. */
  size?: number | null;
  /** Top-left x in SVG scene coordinates. Default 0. */
  x?: number | null;
  /** Top-left y in SVG scene coordinates. Default 0. */
  y?: number | null;
  /** Lật artwork sang hướng khác. Bỏ trống thì lấy theo `at`. */
  facing?: 'left' | 'right' | null;
  emote?: MascotEmote | null;
  /** Frame (trong scene) mà emote bắt đầu hiện. */
  emoteFrom?: number;
  /** Animate through a frame-derived value. Default 1. */
  opacity?: number;
  /** Frame hiện tại của scene. Bỏ trống thì mascot đứng yên (an toàn cho card tĩnh). */
  frame?: number | null;
  /** Trượt vào bằng spring trong ~0,5 s đầu rồi nhập vào nhịp đứng yên. */
  enter?: boolean;
}
export declare const Mascot: FC<MascotProps>;

export declare const MASCOT_SPOTS: Readonly<Record<MascotSpot, { x: number; y: number; size: number; facing: 'left' | 'right' }>>;

/** Tên mọi pose, đúng thứ tự bày trong gallery. */
export declare const MASCOT_POSES: readonly MascotPose[];

/** Nhịp đứng yên tại một frame: nghiêng, nhún, và có đang chớp mắt không. */
export declare function mascotIdle(frame: number): { sway: number; bob: number; blinking: boolean };
