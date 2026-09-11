import type { FC } from 'react';

export interface FilingCabinetProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Header label. Default 'KHO TÀI LIỆU'. */
  label?: string;
  /** Header LineIcon. Default 'archive' ('database' for a data store). */
  icon?: string;
  /** Drawer labels, top-down (21/600). */
  drawers: readonly string[];
  /** Index of the drawer that opens. Omit = all closed. */
  selected?: number;
  /** Scene frame; with `at` animates: drawer at…at+24, page up at+16…at+32, out at+32…at+56. */
  frame?: number;
  /** Frame the drawer starts opening. */
  at?: number;
  /** Page rises out of the open drawer and lands right of the cabinet. Default true. */
  showDoc?: boolean;
  /** Red label under the retrieved page ("Điều 12"). */
  docLabel?: string;
  /** Page width. Default 150 (reserve docW + 60 px on the right). */
  docW?: number;
  opacity?: number;
}
export declare const FilingCabinet: FC<FilingCabinetProps>;
/** Closed front box {x, y, w, h} of drawer i (same props as the cabinet). */
export declare function cabinetDrawer(props: Pick<FilingCabinetProps, 'x' | 'y' | 'w' | 'h' | 'drawers'>, i: number): { x: number; y: number; w: number; h: number };
