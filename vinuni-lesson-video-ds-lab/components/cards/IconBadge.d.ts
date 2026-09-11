import type { FC } from 'react';
import type { IconName } from '../icons/Icons';

export interface IconBadgeProps {
  name: IconName;
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  /** Diameter. Default 150. */
  size?: number;
  /** Default C.accent. */
  color?: string;
  /** 25 px label under the circle. */
  label?: string;
  opacity?: number;
  scale?: number;
  /** Solid circle with a white icon (hub center). */
  filled?: boolean;
}
export declare const IconBadge: FC<IconBadgeProps>;
