import type { FC } from 'react';
import type { LineIconName } from '../icons/LineIcon';

export interface UIButtonProps {
  x: number;
  y: number;
  /** Width. Default uiButtonWidth(label, { icon, size }). */
  w?: number;
  /** Height. Default 64. */
  h?: number;
  /** Short app-button copy: "Gửi thư", "CHUYỂN KHOẢN", "Thử lại". */
  label: string;
  /** primary = accent fill · secondary = white + accent stroke · danger = red fill (irreversible) · ghost = text only. */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** default · pressed (darker, 96 %) · disabled (dotInactive, muted) · locked (disabled + red lock badge top-right). */
  state?: 'default' | 'pressed' | 'disabled' | 'locked';
  /** LineIcon name drawn left of the label. */
  icon?: LineIconName | string;
  /** Label size. Default 20 (700). */
  size?: number;
  /** Scene frame (for `pressAt`). */
  frame?: number;
  /** Frame of a press: 0→1→0 over 12 frames (peak +4). Ignored when disabled / locked. */
  pressAt?: number;
  opacity?: number;
}
export declare const UIButton: FC<UIButtonProps>;
/** Default button width for a label (+ icon). */
export declare function uiButtonWidth(label: string, opts?: { icon?: string; size?: number }): number;
