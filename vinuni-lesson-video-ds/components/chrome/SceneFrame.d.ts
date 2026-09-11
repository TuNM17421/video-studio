import type { FC, ReactNode } from 'react';

/** Scene-local caption page in frames. */
export interface Caption {
  start: number;
  end: number;
  /** ≤ 78 characters, one line. */
  text: string;
}
export declare function activeCaption(captions: readonly Caption[] | undefined, frame: number): Caption | null;

export interface SceneFrameProps {
  /** Scene-local frame (from useFrame()). Needed for captions and editorial entrance. */
  frame?: number;
  /** 'center' (canonical) | 'editorial' (Day28). Default 'center'. */
  variant?: 'center' | 'editorial';
  /** center: "NGÀY 0N · CHỦ ĐỀ NGÀY". */
  eyebrow?: string;
  title?: string;
  /** Default 50 (center) / 54 (editorial). */
  titleSize?: number;
  /** center: corner tag, e.g. "MINH HỌA". */
  tag?: string;
  /** editorial: red uppercase kicker. */
  kicker?: string;
  /** editorial: red phrase appended to the title. */
  titleAccent?: string;
  /** editorial: muted line under the title. */
  subtitle?: string;
  footer?: string | { left?: ReactNode; right?: ReactNode };
  captions?: readonly Caption[];
  /** Explicit caption text (overrides `captions`). */
  caption?: string | null;
  /** Default C.bg. */
  background?: string;
  /** false = no header chrome (title cards). Default true. */
  header?: boolean;
  /** Default true. */
  watermark?: boolean;
  /** HTML layer above the SVG (recap rows, question cards, hook, title cards). */
  overlay?: ReactNode;
  /** SVG children in the 1920×1080 viewBox. */
  children?: ReactNode;
}
export declare const SceneFrame: FC<SceneFrameProps>;
