import type { FC, ReactNode } from 'react';
import type { Bounds } from '../flow/Flow';

export type PhoneFrameVariant = 'plain' | 'chat' | 'camera';

export interface PhoneFrameProps {
  /** Left edge, scene px. */
  x: number;
  /** Top edge, scene px. */
  y: number;
  /** Width. Under 300 px the status bar goes compact (40 px, no `appName` label). Default 320. */
  w?: number;
  /** Height, including the status bar. Default 693 (≈ 9:19.5, an iPhone-like ratio). */
  h?: number;
  /** Fictional app name shown centered in the status bar (bold). Hidden when compact. Never a real product name. */
  appName?: string;
  /** Status-bar clock text. Default "9:41". */
  time?: string;
  /** Bottom decoration, drawn OVER children after they're clipped in. Default 'plain' (home indicator only). */
  variant?: PhoneFrameVariant;
  opacity?: number;
  /** MINH HỌA tag in the content box's top-right. DEFAULT TRUE — a mock screen is always illustrative; a string sets another label. */
  illustrative?: boolean | string;
  /** Screen content, drawn in SCENE coordinates and clipped to the phone. Lay out with phoneContentBox(). */
  children?: ReactNode;
}
export declare const PhoneFrame: FC<PhoneFrameProps>;
/**
 * Body box of a PhoneFrame with this box (below the status bar only — a `variant` bottom bar is
 * drawn OVER children afterward), inset by `pad` on every side.
 */
export declare function phoneContentBox(box: Bounds, pad?: number): Bounds;
