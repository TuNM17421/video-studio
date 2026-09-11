import type { FC } from 'react';
import type { IconName, AnyIconName } from '../icons/Icons';

export interface BrandTitleProps {
  eyebrow?: string;
  title: string;
  /** Default 'neural-net'. */
  icon?: AnyIconName;
  frame: number;
}
/** Full-frame title card (HTML) — use as SceneFrame overlay with header={false}. */
export declare const BrandTitle: FC<BrandTitleProps>;
