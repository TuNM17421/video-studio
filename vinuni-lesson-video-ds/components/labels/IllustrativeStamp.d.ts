import type { FC, ReactNode } from 'react';

export type IllustrativeLabel =
  | 'MINH HỌA' | 'TÓM TẮT MINH HỌA' | 'LỖI MINH HỌA' | 'CHƯA CHẠY THẬT' | 'PHƯƠNG ÁN THIẾT KẾ' | 'GIỚI HẠN MINH HỌA';

export interface IllustrativeStampProps {
  x: number;
  y: number;
  /** Default 'MINH HỌA'. Use one of ILLUSTRATIVE_LABELS. */
  label?: IllustrativeLabel | string;
  /** 'tag' = corner pill (default) · 'stamp' = rotated outline stamp over a result · 'watermark' = large faint diagonal text. */
  variant?: 'tag' | 'stamp' | 'watermark';
  /** Which point of the stamp (x, y) is. Default 'top-left'. */
  anchor?: 'top-left' | 'top-right' | 'center';
  /** Font size. Defaults: tag 17 · stamp 22 · watermark 96. */
  size?: number;
  opacity?: number;
}
export declare const IllustrativeStamp: FC<IllustrativeStampProps>;
export declare const ILLUSTRATIVE_LABELS: readonly IllustrativeLabel[];
/** For components with an `illustrative` prop: tag at the top-right of `box`, or null. */
export declare function illustrativeTag(
  illustrative: boolean | string | undefined,
  box: { x: number; y: number; w: number; h: number },
  opacity?: number,
): ReactNode;

/** Lab (11/09/2026): true for labels containing "MINH HỌA" — those are never drawn (CornerTag, stamps, component tags). */
export declare function isHiddenIllustrativeLabel(label: unknown): boolean;
