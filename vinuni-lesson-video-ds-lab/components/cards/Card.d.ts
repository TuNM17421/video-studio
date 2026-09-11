import type { FC, ReactNode } from 'react';
import type { IconName, AnyIconName } from '../icons/Icons';

export interface CardProps {
  x: number;
  y: number;
  w: number;
  h: number;
  /** 1–3 lines; the first is bold (700). */
  lines?: readonly string[];
  /** Uppercase micro label, top-left. */
  label?: string;
  /** 30 px icon left of the label. */
  icon?: AnyIconName;
  opacity?: number;
  /** 0–1 red-soft overlay + red stroke. Drive with pulse(). */
  active?: number;
  /** Stroke / label color. Default C.accent; C.red for the chosen/risky branch. */
  accent?: string;
  /** Default C.bgAlt. */
  fill?: string;
  /** Line size. Default 24. */
  size?: number;
  /** Default 33. */
  lineHeight?: number;
  /** Hypothetical / pending (dash 12 10). */
  dashed?: boolean;
  /** 0–1: dims to 36 % when not in focus. */
  muted?: number;
  /** Extra SVG drawn inside the card group. */
  children?: ReactNode;
}
export declare const Card: FC<CardProps>;
