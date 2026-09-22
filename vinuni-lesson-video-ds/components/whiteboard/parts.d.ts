import type { Board } from './board';
import type { WhiteboardMark } from './Whiteboard';

type P = { x: number; y: number };
type Beat = { at?: number | null; color?: string };
/** Every part: (board, id prefix, first frame or null, options) → its last mark. */
type Part<O> = (board: Board, id: string, at: number | null, options: O) => WhiteboardMark;

export declare const WbTitleCloud: Part<{ x: number; y: number; w: number; h: number; text?: string; lines?: string[]; size?: number; color?: string; fill?: string; outline?: boolean }>;
export declare const WbStickyNote: Part<{ x: number; y: number; w?: number; h?: number; title?: string; lines?: (string | ({ text: string } & Beat))[]; size?: number; color?: string; fill?: string }>;
export declare const WbSpeech: Part<{ x: number; y: number; s?: number; text?: string; lines?: string[]; side?: 'left' | 'right'; thought?: boolean; size?: number; color?: string }>;
export declare const WbFlow: Part<{ x: number; y: number; items: ({ text: string } & Beat)[]; w?: number; h?: number; gap?: number; direction?: 'row' | 'column'; size?: number; color?: string }>;
export declare const WbCycle: Part<{ cx: number; cy: number; r?: number; items: ({ text: string } & Beat)[]; size?: number; color?: string }>;
export declare const WbMindMap: Part<{ cx: number; cy: number; center: string; branches: ({ text: string; doodle?: string } & Beat)[]; rx?: number; ry?: number; size?: number; centerSize?: number; color?: string }>;
export declare const WbChecklist: Part<{ x: number; y: number; items: ({ text: string; ok?: boolean } & Beat)[]; size?: number; gap?: number }>;
export declare const WbCompare: Part<{ x: number; y: number; w?: number; h?: number; left: { title: string; lines?: (string | ({ text: string } & Beat))[] } & Beat; right: { title: string; lines?: (string | ({ text: string } & Beat))[] } & Beat; vs?: string | null; size?: number; color?: string }>;
export declare const WbTimeline: Part<{ x: number; y: number; w?: number; items: ({ label: string; sub?: string } & Beat)[]; size?: number; color?: string }>;
export declare const WbBarChart: Part<{ x: number; y: number; w?: number; h?: number; bars: ({ label: string; value: number; shown?: string | number; highlight?: boolean } & Beat)[]; max?: number; size?: number }>;
export declare const WbIconLabel: Part<{ x: number; y: number; doodle: string; size?: number; label?: string; labelSize?: number; color?: string; labelColor?: string }>;
export declare const WbIdea: Part<{ x: number; y: number; size?: number; label?: string; labelSize?: number; color?: string }>;
export declare const WbTable: Part<{ x: number; y: number; colW: number[]; rowH?: number; rows: (string | ({ text: string } & Beat))[][]; header?: boolean; size?: number }>;
export declare const WbFlight: Part<{ from: P; to: P; bend?: number; size?: number; color?: string }>;
export declare const WbSteps: Part<{ x: number; y: number; items: ({ text: string } & Beat)[]; stepW?: number; stepH?: number; size?: number; color?: string }>;
/** Part name → one-line purpose (docs, previews, Studio library). */
export declare const WB_PARTS: Readonly<Record<string, string>>;
