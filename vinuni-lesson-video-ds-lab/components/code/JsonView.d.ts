import type { FC } from 'react';

export interface JsonViewProps {
  /** Left edge in scene px. */
  x: number;
  /** Top edge in scene px. */
  y: number;
  /** Card width. Default 760. Long lines are cut with "…". */
  w?: number;
  /** Card height. Default: auto = header 58 + 32 + lines × round(fontSize × 1.45). */
  h?: number;
  /** A JS object/array (pretty-printed, 2-space indent) or a JSON string. */
  data: unknown;
  /** Keys whose line — or whole object/array block — gets a red-soft band + red left marker. */
  highlightKeys?: readonly string[];
  /** { key: 'chú thích tiếng Việt' } → Chip in one column right of the lines, with a dashed leader. */
  glosses?: Readonly<Record<string, string>>;
  /** Gloss column x. Default: after the longest glossed line if the chips fit inside the card, else x + w + 28. */
  glossX?: number;
  /** { key: n } → numbered red badge after that value, to pair the same id across two views. */
  matchId?: Readonly<Record<string, number | string>>;
  /** Scene frame. When set, lines reveal one by one; omit for the settled state. */
  frame?: number;
  /** First line's reveal frame. Default 0. */
  start?: number;
  /** Frames between lines. Default 4 (each fades over 10 f; glosses/badges 8 f later). */
  per?: number;
  /** Code size in px. Default 20. */
  fontSize?: number;
  /** Header title, 17/700 uppercase with a braces icon, e.g. "YÊU CẦU GỬI MÔ HÌNH". */
  title?: string;
  /** MINH HỌA corner tag (true | custom label | false). Default true — payloads are mock. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const JsonView: FC<JsonViewProps>;

/** Anchor of the first line with `key` (pass the same props as the JsonView): 'right' card edge (default), 'left' card edge, or 'text' end. */
export declare function jsonLineAnchor(props: JsonViewProps, key: string, side?: 'right' | 'left' | 'text'): { x: number; y: number } | null;
/** Pretty-printed line records. */
export declare function jsonLines(data: unknown): { text: string; key: string | null; depth: number; end: number | null }[];
/** Auto height of a JsonView for the given props. */
export declare function jsonViewHeight(props: JsonViewProps): number;
