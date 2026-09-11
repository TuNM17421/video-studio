import type { FC } from 'react';

export type DataTableStatus = 'ok' | 'blocked' | 'pending' | 'untested' | 'error';

/** A status cell rendered as a chip: ok ✓ green · blocked 🔒 red · pending ⌛ amber · untested "Chưa thử" dashed muted · error ⚠ orange. */
export interface DataTableStatusCell {
  status: DataTableStatus;
  /** Chip text. Defaults: Đạt · Bị chặn · Chờ duyệt · Chưa thử · Lỗi. */
  text?: string;
}

export type DataTableCell = string | number | DataTableStatusCell | null | undefined;

export interface DataTableColumn {
  /** Row field this column reads. */
  key: string;
  /** Header label (rendered uppercase, 17/700). */
  label: string;
  /** Relative width weight; columns are scaled to fill the table `w`. Default 1. */
  w?: number;
  /** Cell + header alignment. Default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** Column styling: 'muted' (TRƯỚC / old), 'accent' (soft blue band), 'red' (SAU / chosen — red header, faint red band). */
  tone?: 'muted' | 'accent' | 'red';
  /** Strike the text through (use with tone 'muted' for replaced values). */
  strike?: boolean;
  /** MONO font for tool / code names (e.g. `gui_thu()`). */
  mono?: boolean;
  /** Text weight. Default 700 for the first column, 600 for the others. */
  weight?: number;
}

export interface DataTableProps {
  /** Top-left of the block (title band included), scene px. */
  x: number;
  y: number;
  /** Table width. Default 1600. */
  w?: number;
  columns: readonly DataTableColumn[];
  /** One object per row, keyed by column `key`. Long text wraps within the column; the row grows. */
  rows: readonly Record<string, DataTableCell>[];
  /** Current frame. Omit for the settled state (everything visible). */
  frame?: number;
  /** Frame the header appears. Default 0. */
  start?: number;
  /** Frames between row reveals (row i at start + per·(i+1)). Default 12. */
  per?: number;
  /** Row index (or indices) with a red-soft band + red left bar. */
  highlightRow?: number | readonly number[];
  /** One cell outlined in red; `at` = frame of a 54 f pulse (3 → 5 px). */
  highlightCell?: { row: number; key: string; at?: number };
  /** Micro-caps title above the table (17/700 accentStrong). */
  title?: string;
  /** Body text size. Default 24. */
  fontSize?: number;
  /** MINH HỌA tag (true | label, e.g. 'MINH HỌA SOẠN SẴN — CHƯA CHẠY THẬT'). Default TRUE — table data is illustrative. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const DataTable: FC<DataTableProps>;

/** Pure layout for the same props: column boxes, wrapped cells, row y / heights, total height `h`. */
export declare function dataTableLayout(props: DataTableProps): {
  cols: (DataTableColumn & { x: number; w: number })[];
  top: number;
  headerH: number;
  rows: { y: number; h: number; cells: { lines: string[]; weight?: number; status?: DataTableStatusCell }[] }[];
  bottom: number;
  h: number;
  lh: number;
};

/** Greedy word wrap by estimated Montserrat width (honours '\n'). */
export declare function wrapText(str: string, maxW: number, size: number, weight?: number): string[];

/** Chip styling per status: { color, fill, icon, text, dashed? }. */
export declare const STATUS_STYLE: Readonly<Record<DataTableStatus, { color: string; fill: string; icon: string | null; text: string; dashed?: boolean }>>;
