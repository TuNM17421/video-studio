import type { FC, ReactNode } from 'react';
import type { IconName } from '../icons/Icons';

export interface GlassNodeProps {
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  label: string;
  subtitle?: string;
  icon?: IconName;
  /** Official logo element for a NAMED technology (48×48 box at the icon slot). */
  logo?: ReactNode;
  /** Default 240. */
  w?: number;
  /** Default 150. */
  h?: number;
  /** 'accent' | 'strong' (active) | 'danger'. */
  tone?: 'accent' | 'strong' | 'danger';
  opacity?: number;
  scale?: number;
  muted?: boolean;
}
export declare const GlassNode: FC<GlassNodeProps>;
