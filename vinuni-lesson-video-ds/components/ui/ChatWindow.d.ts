import type { FC } from 'react';

export interface ChatMessage {
  /** user = accent bubble right · assistant = bgAlt bubble left · system = centered muted chip · tool = dashed MONO bubble with wrench. */
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** Message text; word-wrapped automatically ('\n' forces a break). */
  text: string;
  /** Frame the message appears at (appear(), 12 frames). Omit → visible from the start. Only used when `frame` is set. */
  at?: number;
}

export interface ChatWindowProps {
  x: number;
  y: number;
  w: number;
  /** Total height: 64 px header + message list + 80 px input area. */
  h: number;
  /** Assistant name in the header. Default "Trợ lý học vụ". */
  title?: string;
  /** Small muted line under the title (e.g. "đang trả lời…"). */
  subtitle?: string;
  /** The conversation, top to bottom. The list auto-scrolls to keep the newest visible. */
  messages?: readonly ChatMessage[];
  /** Scene frame. Omit → everything settled (all visible, fully typed). */
  frame?: number;
  /** Frame the LAST visible assistant message starts typing (typeText). Default: that message's `at`. */
  streamStart?: number;
  /** Typing speed in characters (graphemes) per second. Default 30. */
  cps?: number;
  /** Show only messages with index < N (static step-through). */
  revealUpTo?: number;
  /** Index of a bubble to outline in red (5 px). */
  highlightIndex?: number;
  /** Input placeholder. Default "Nhập câu hỏi…". */
  placeholder?: string;
  /** Text typed in the input box (replaces the placeholder, ink color). */
  draft?: string;
  opacity?: number;
  /** MINH HỌA tag in the header's top-right. DEFAULT TRUE (mock screen); a string sets another label. */
  illustrative?: boolean | string;
}
export declare const ChatWindow: FC<ChatWindowProps>;
/** Greedy word-wrap into lines ≤ maxW px (grapheme-safe hard breaks). Default measure = bubbleTextWidth. */
export declare function wrapTextLines(
  text: string,
  maxW: number,
  size?: number,
  weight?: number,
  measure?: (str: string, size: number, weight?: number) => number,
): string[];
/** One line ellipsized to fit maxW px. */
export declare function fitTextLine(str: string, maxW: number, size?: number, weight?: number): string;
/** textWidth() × 1.1 — safe width estimate for Montserrat bubble text. */
export declare function bubbleTextWidth(str: string, size: number, weight?: number): number;
/** Monospace width estimate (0.6 em per grapheme). */
export declare function monoWidth(str: string, size: number): number;
