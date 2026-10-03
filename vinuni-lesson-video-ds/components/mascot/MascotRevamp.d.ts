import type { FC } from 'react';
import type { MascotSpot } from './Mascot';

/** Nét mặt: mắt, lông mày, miệng và dấu hiệu nổi quanh đầu. */
export type LexceEmotion = 'idle' | 'wave' | 'happy' | 'excited' | 'sad' | 'surprised' | 'thinking' | 'serious' | 'sleepy' | 'love' | 'talking';

/** Dáng người độc lập với emotion. Mọi pose (trừ leanFoot) giữ trục đứng của artwork đã duyệt. */
export type LexcePose =
  | 'stand' | 'idle' | 'leanFoot' | 'handsDown'
  | 'wave' | 'waveRight' | 'bigWave'
  | 'point' | 'pointLeft' | 'pointUp' | 'pointDown'
  | 'teach' | 'present' | 'leanIn' | 'read' | 'sketch'
  | 'cheer' | 'clap' | 'hop' | 'shrug'
  | 'think' | 'curious' | 'nod'
  | 'lookUp' | 'lookDown' | 'lookLeft' | 'lookRight' | 'profileLeft' | 'profileRight' | 'peek';

export interface MascotRevampProps {
  emotion?: LexceEmotion;
  /** Dáng người. Bỏ trống thì dùng `stand` đã duyệt; emotion chỉ đổi nét mặt. */
  pose?: LexcePose | null;
  at?: MascotSpot | null;
  /** Artwork height in scene pixels; native vector viewBox is 1122×1402. */
  size?: number | null;
  x?: number | null;
  y?: number | null;
  facing?: 'left' | 'right' | null;
  /** Leave null for an exact still. Motion is a pure function of the frame. */
  frame?: number | null;
  talking?: boolean;
  /**
   * Dịch ánh nhìn ngang −1…+1 trong khuôn mặt chính diện; không tạo góc profile thật.
   */
  look?: number | null;
  /** Tên pose cũ, giữ cho cue đã viết trước 14/09/2026. Dùng `pose` cho cue mới. */
  gesture?: 'point' | 'teach' | null;
  enter?: boolean;
  opacity?: number;
}

/** Metadata của pose. Các trường rig cũ giữ tương thích; bản render sạch chỉ dùng
 * `bodyTilt` cho `leanFoot` và `look` cho hướng mắt. */
export interface LexcePoseSpec {
  liftL?: number;
  liftR?: number;
  look?: number;
  nod?: number;
  tilt?: number;
  bodyTilt?: number;
  raisedFoot?: boolean;
  lift?: number;
  swing?: { part: 'armL' | 'armR' | 'head' | 'both'; amp: number; period: number };
}

export declare const LEXCE_EMOTIONS: readonly LexceEmotion[];
/** Tên mọi pose, đúng thứ tự bày trong gallery. */
export declare const LEXCE_POSES: readonly LexcePose[];
export declare const POSE_SPEC: Readonly<Record<LexcePose, LexcePoseSpec>>;
export declare const MascotRevamp: FC<MascotRevampProps>;
