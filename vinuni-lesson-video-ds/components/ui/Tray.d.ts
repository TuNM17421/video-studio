import type { FC, ReactNode } from 'react';
import type { Bounds } from '../flow/Flow';

export interface TrayProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Uppercase column name: "BẢN NHÁP", "CHỜ DUYỆT", "ĐÃ LƯU", "KHAY ĐẦU VÀO". */
  label?: string;
  /** Count badge on the right of the header (omit → no badge). */
  count?: number | string;
  /** LineIcon name before the label. Default 'inbox'. */
  icon?: string;
  /** Outline + header color: 'accent' (default) · role tones 'input'|'process'|'reasoning'|'output'|'check'|'action'|'memory' · 'red'. */
  tone?: 'accent' | 'input' | 'process' | 'reasoning' | 'output' | 'check' | 'action' | 'memory' | 'red';
  /** 0–1 (or boolean): 5 px red outline — an item just landed. Drive with pulse(). */
  active?: number | boolean;
  /** Placeholder text when there are no children and count is 0 / omitted. Default "Trống". */
  emptyLabel?: string;
  opacity?: number;
  /** Stacked items in SCENE coordinates (clipped to the tray). Place them on trayItemBox(tray, i). */
  children?: ReactNode;
}
export declare const Tray: FC<TrayProps>;
/** Box of the i-th stacked item under the 68 px header. Defaults: itemH 96, gap 14, pad 16. */
export declare function trayItemBox(tray: Bounds, i: number, opts?: { itemH?: number; gap?: number; pad?: number }): Bounds;
