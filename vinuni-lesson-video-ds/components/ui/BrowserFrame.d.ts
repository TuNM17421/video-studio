import type { FC, ReactNode } from 'react';
import type { Bounds } from '../flow/Flow';

export interface BrowserFrameProps {
  /** Left edge, scene px. */
  x: number;
  /** Top edge, scene px. */
  y: number;
  /** Width. Under 480 px the title bar goes compact (44 px, no tab title). */
  w: number;
  /** Height, including the 56 px (compact 44 px) title bar. */
  h: number;
  /** Address text in the pill (fictional, e.g. "lms.truong.edu.vn/lop/CLASS-A"). Ellipsized to fit. */
  url?: string;
  /** Optional tab title (17 / 700 accent) between the dots and the address pill; hidden when compact. */
  title?: string;
  /** Lock icon (true, default) or globe icon (false) in the address pill. */
  secure?: boolean;
  /** 0–1 (or boolean): 5 px red outline. Drive with pulse(). */
  active?: number | boolean;
  opacity?: number;
  /** MINH HỌA tag in the body's top-right. DEFAULT TRUE — a mock screen is always illustrative; a string sets another label. */
  illustrative?: boolean | string;
  /** Screen content, drawn in SCENE coordinates and clipped to the window. Lay out with browserContentBox(). */
  children?: ReactNode;
}
export declare const BrowserFrame: FC<BrowserFrameProps>;
/** Body box of a BrowserFrame with this box (below the title bar), inset by `pad` on every side. */
export declare function browserContentBox(box: Bounds, pad?: number): Bounds;
