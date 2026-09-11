import type { FC } from 'react';

export interface TrayItem {
  /** Card text, 21/600 ("Quy chế học vụ 2026"). */
  label: string;
  /** 'accent' (default) · 'memory'/'amber' (a memory / summary) · 'red' (the risky one) · 'green' · 'purple' · 'orange'. */
  tone?: 'accent' | 'memory' | 'amber' | 'red' | 'green' | 'purple' | 'orange';
  /** LineIcon name. Default 'file-text'. */
  icon?: string;
}
export interface ContextTrayProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Header label. Default 'KHAY NGỮ CẢNH'. */
  label?: string;
  /** Items in arrival order; the first `capacity` go in the tray, the rest queue outside (greyed). */
  items?: readonly TrayItem[];
  /** Number of places in the tray. Default 3. */
  capacity?: number;
  /** Scene frame; item i slides in from the right at start + i·per. Omit = settled. */
  frame?: number;
  /** Default 0. */
  start?: number;
  /** Default 12. */
  per?: number;
  /** Width of queued cards (placed 48 px right of the tray). Default w − 40. */
  queueW?: number;
  /** Caption over the queue. Default 'KHÔNG VỪA · chờ ngoài khay'. */
  queueLabel?: string;
  /** "used/capacity CHỖ" counter in the header (red when full). Default true. */
  showCount?: boolean;
  opacity?: number;
}
export declare const ContextTray: FC<ContextTrayProps>;
