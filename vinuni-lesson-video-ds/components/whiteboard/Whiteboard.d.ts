import type { FC } from 'react';

interface MarkBase {
  /** Unique, stable id — also the seed of the stroke's wobble (same id → same stroke every frame). */
  id: string;
  /** Video frame the marker starts this mark. */
  at: number;
  /** Frames to draw it. Default: text ≈ 32 characters/s, shapes by kind (defaultDur). */
  dur?: number;
  /** Default C.text (navy). Board ink: C.text, C.accent, C.red. */
  color?: string;
  /** false = appears without the marker (panel frames, guides). */
  pen?: boolean;
  opacity?: number;
}
/** Names in DOODLES (components/whiteboard/doodles.js) — Lucide line icons redrawn by hand. */
export type DoodleName = string;

export type WhiteboardMark =
  | (MarkBase & { kind: 'text'; x: number; y: number; text?: string; lines?: string[]; size?: number; lineHeight?: number; anchor?: 'start' | 'middle' | 'end'; outline?: boolean })
  | (MarkBase & { kind: 'line' | 'arrow'; points: { x: number; y: number }[]; width?: number; dash?: string; head?: number })
  | (MarkBase & { kind: 'box'; x: number; y: number; w: number; h: number; fill?: string; width?: number })
  // fill: a color token, or 'hachure' for marker shading (box, loop, cloud; hachureGap?, hachureColor?)
  | (MarkBase & { kind: 'loop'; cx: number; cy: number; rx: number; ry: number; width?: number })
  | (MarkBase & { kind: 'underline'; x1: number; x2: number; y: number; width?: number })
  | (MarkBase & { kind: 'person'; x: number; y: number; s?: number; width?: number })
  | (MarkBase & { kind: 'check' | 'cross'; x: number; y: number; s?: number; width?: number })
  | (MarkBase & { kind: 'doodle'; name: DoodleName; x: number; y: number; size?: number; rotate?: number; width?: number })
  | (MarkBase & { kind: 'cloud'; x: number; y: number; w: number; h: number; fill?: string; width?: number })
  | (MarkBase & { kind: 'trail'; points: { x: number; y: number }[]; dash?: string; width?: number })
  | (MarkBase & { kind: 'highlight'; x: number; y: number; w: number; h: number })
  | (MarkBase & { kind: 'erase'; x: number; y: number; w: number; h: number });

export interface CameraKey {
  /** Frame the move starts. */
  at: number;
  /** Frames the move takes (default 40). */
  dur?: number;
  /** Board point placed at the screen's content centre (960, 550). */
  x: number;
  y: number;
  /** Board units across the 1920-px screen (1920 = 1:1, larger = zoomed out). */
  w: number;
}

export interface WhiteboardProps {
  frame: number;
  marks: WhiteboardMark[];
  camera?: CameraKey[];
  /** Show the marker (default true). */
  pen?: boolean;
}
export declare const Whiteboard: FC<WhiteboardProps>;
export declare function defaultDur(mark: WhiteboardMark): number;
export declare function cameraAt(camera: CameraKey[] | undefined, frame: number): { x: number; y: number; w: number };
export declare function markPath(mark: WhiteboardMark): string | null;
/** Board-space box a mark covers. */
export declare function markBounds(mark: WhiteboardMark): { x0: number; y0: number; x1: number; y1: number };
/** Screen point of a board point at `frame` (+ the camera scale). */
export declare function toScreen(camera: CameraKey[] | undefined, frame: number, p: { x: number; y: number }): { x: number; y: number; scale: number };
