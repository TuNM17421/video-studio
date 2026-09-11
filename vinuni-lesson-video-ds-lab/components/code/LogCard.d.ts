import type { FC } from 'react';

export type LogLevel = 'info' | 'ok' | 'warn' | 'error' | 'blocked';

export interface LogRow {
  /** Mono timestamp, e.g. "19:02:11". */
  time?: string;
  /** info = accent dot · ok = accent check · warn = red triangle-alert · error = red octagon-x · blocked = red lock + faint red row. Default info. */
  level?: LogLevel;
  /** Who acted (rendered UPPERCASE 17/700 accentStrong): "Suy luận", "Hành động", "Máy chủ". */
  actor?: string;
  /** Event text (22/500), cut with "…" to fit. */
  text: string;
  /** Optional right-aligned status Chip: "OK", "CHẶN", "LỖI" (red on warn/error/blocked). */
  status?: string;
}

export interface LogCardProps {
  /** Left edge in scene px. */
  x: number;
  /** Top edge in scene px. */
  y: number;
  /** Card width. Default 1000. */
  w?: number;
  /** Card height. Default: auto (header + column row + 16 + rows × rowH, or 190 when empty). */
  h?: number;
  rows?: readonly LogRow[];
  /** Header title (17/700 uppercase, clipboard-list icon). Default "NHẬT KÝ THỰC THI"; '' hides it. */
  title?: string;
  /** Column header labels [time, actor, event, status] — the "bảng ghi 4 cột" variant. */
  columns?: readonly string[];
  /** Scene frame. When set, rows reveal one by one; omit for the settled state. */
  frame?: number;
  /** First row's reveal frame. Default 0. */
  start?: number;
  /** Frames between rows. Default 12 (each fades + rises 8 px over 12 f). */
  per?: number;
  /** 0-based row to spotlight: red-soft band + red marker. */
  highlightIndex?: number;
  /** Dim the other rows to 45 % when highlightIndex is set. Default true. */
  dim?: boolean;
  /** Force the empty state (dashed card, circle-help icon + label). Also shown when rows is empty. */
  empty?: boolean;
  /** Empty-state text. Default "Chưa có bản ghi". */
  emptyLabel?: string;
  /** Row height. Default 56. */
  rowH?: number;
  /** Actor column width override (Vietnamese width estimate is approximate). */
  actorW?: number;
  /** MINH HỌA corner tag (true | custom label | false). Default true — logs are mock. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const LogCard: FC<LogCardProps>;
/** Auto height of a LogCard for the given props. */
export declare function logCardHeight(props: Pick<LogCardProps, 'rows' | 'title' | 'columns' | 'empty' | 'rowH' | 'illustrative'>): number;
