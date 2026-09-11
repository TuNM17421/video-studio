import type { FC } from 'react';

export interface EmailCardProps {
  x: number;
  y: number;
  /** Width (≥ 420 recommended). */
  w: number;
  /** Height. Default emailCardHeight(lineCount, !!attachment). */
  h?: number;
  /** Sender (fictional). Default "tro-ly@truong.edu.vn". Ellipsized. */
  from?: string;
  /** Recipient (fictional). Default "hs017@truong.edu.vn". Ellipsized. */
  to?: string;
  /** Subject line, 21 / 700. */
  subject?: string;
  /** Body: strings (one line each, 18 / 500 muted, ellipsized) or a number of placeholder bars. Default 3 bars. */
  lines?: readonly string[] | number;
  /** Status chip: 'BẢN NHÁP' (muted) · 'CHỜ DUYỆT' (amber) · 'ĐÃ GỬI' (green) · 'BỊ CHẶN' (red) or any label (+ statusTone). */
  status?: string;
  /** Tone for a custom status label. */
  statusTone?: 'muted' | 'blue' | 'waiting' | 'done' | 'blocked';
  /** Attachment file name → chip at the bottom (adds 52 px to the default height). */
  attachment?: string;
  /** Dashed card stroke (12 10) — a draft / not yet sent. */
  dashed?: boolean;
  /** 0–1 (or boolean): red-soft overlay + 5 px red stroke, like Card. */
  active?: number | boolean;
  opacity?: number;
  /** MINH HỌA tag top-right. DEFAULT TRUE (mock content); a string sets another label. */
  illustrative?: boolean | string;
}
export declare const EmailCard: FC<EmailCardProps>;
/** Suggested height for n body lines (+ attachment chip). */
export declare function emailCardHeight(n?: number, attachment?: boolean): number;
