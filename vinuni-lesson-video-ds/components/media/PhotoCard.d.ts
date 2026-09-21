import type { FC } from 'react';

export interface PhotoCardProps {
  x: number;
  y: number;
  /** Card width. The picture gets `w - 28` (a 14 px white mat each side). */
  w: number;
  /** Card height. The picture gets what is left after the mat, caption and credit. */
  h: number;
  /** The picture, as a path from the design-system root ("ui_kits/lesson-video/videos/<id>/img/s3.jpg") — from images.js. No http URLs in videos (verify blocks them). */
  src: string;
  /** Required. The credit line, copied verbatim from images.js ("Ảnh: … · Public domain · Wikimedia Commons"). */
  credit: string;
  /** One line under the picture, 20/700 ("Alan Turing, 1951"). */
  caption?: string;
  /** 'contain' (default) never crops the subject · 'cover' fills the frame around `focus`. */
  fit?: 'contain' | 'cover';
  /** 0–1 point of the picture kept in view by 'cover' and zoomed toward by `kenBurns`. Default [0.5, 0.5]. */
  focus?: [number, number];
  /** Intrinsic pixel size (images.js width/height) — makes `focus` exact; without it focus snaps to min/mid/max. */
  imgW?: number;
  imgH?: number;
  /** 0–1 progress of a slow zoom (at most 6 %) toward `focus`. Default 0. */
  kenBurns?: number;
  opacity?: number;
}
export declare const PhotoCard: FC<PhotoCardProps>;
