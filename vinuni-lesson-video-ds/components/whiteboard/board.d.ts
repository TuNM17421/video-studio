import type { CameraKey, WhiteboardMark } from './Whiteboard';

type Point = { x: number; y: number };
type Rect = { x: number; y: number; w: number; h: number };

export interface Board {
  /** Every mark in drawing order (pass to <Whiteboard marks>). */
  marks: WhiteboardMark[];
  /** Camera keys (pass to <Whiteboard camera>). */
  camera: CameraKey[];
  /** Beats that ran more than `lateAfter` frames late because the marker was busy. */
  lag: { id: string; late: number }[];
  /** Video frame câu n starts. */
  start(n: number): number;
  /** Video frame `off` frames (default −6) from when `phrase` is said in câu n. */
  say(n: number, phrase: string, off?: number): number;
  /** Add a mark at its beat, or right after the previous stroke (`at` null). Returns it with its real `at`. */
  draw<M extends WhiteboardMark>(at: number | null, mark: Omit<M, 'at'> & { at?: number }): M;
  /** Frame the mark's stroke ends. */
  endOf(mark: WhiteboardMark): number;
  /** Camera move starting at `frame` (default 40 frames). The first call is the opening view. */
  look(frame: number, target: { x: number; y: number; w: number }, dur?: number): void;
  /** Box then its centred text; returns the text mark. */
  boxText(id: string, at: number | null, box: Rect, text: string, opts?: { size?: number; color?: string; fill?: string; boxColor?: string; dur?: number }): WhiteboardMark;
  /** Clock doodle (face + hands at `hour` o'clock); returns the hands mark. */
  clock(id: string, at: number | null, cx: number, cy: number, r: number, hour: number): WhiteboardMark;
  /** Width of handwriting at `size` px. */
  textWidth(text: string, size: number): number;
}

export declare function createBoard(opts: {
  /** timeline.js TIMELINE (global start frames per câu). */
  timeline: { n: number; start: number }[];
  /** cues.js spokenAt (câu-local frames). */
  spokenAt: (n: number, phrase: string) => number;
  /** Frames late before a beat is listed in `lag` (default 12). */
  lateAfter?: number;
  /** Frames the marker pauses between strokes (default 2). */
  gap?: number;
}): Board;

export declare const BOARD_SAFE: { x0: number; y0: number; x1: number; y1: number };

export declare function checkBoard(
  board: { marks: WhiteboardMark[]; camera: CameraKey[]; lag?: { id: string; late: number }[] },
  opts?: { duration?: number; lateWarn?: number; minText?: number; tolerance?: number },
): { problems: string[]; warnings: string[] };
