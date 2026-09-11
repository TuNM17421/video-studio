import type { FC } from 'react';
import type { IconName } from '../icons/Icons';

export interface BrandTitleProps {
  eyebrow?: string;
  title: string;
  /** Default 'neural-net'. */
  icon?: IconName;
  frame: number;
}
/** Full-frame title card (HTML) — use as SceneFrame overlay with header={false}. */
export declare const BrandTitle: FC<BrandTitleProps>;
