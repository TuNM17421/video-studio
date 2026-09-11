import type { FC } from 'react';

export interface HookOverlayProps {
  /** One question, max two lines ("\n" to break). */
  question: string;
  /** Scene frame. */
  frame: number;
  /** Default 150. Returns null from this frame on. */
  duration?: number;
}
/** HTML overlay for SceneFrame `overlay`. Authored content starts at frame − duration. */
export declare const HookOverlay: FC<HookOverlayProps>;
