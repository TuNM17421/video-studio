import type { FC } from 'react';
import type { IconName, AnyIconName } from '../icons/Icons';

export interface SectionCardProps {
  number: number | string;
  label: string;
  eyebrow?: string;
  icon?: AnyIconName;
  frame: number;
}
/** Full-frame chapter break (HTML) — SceneFrame overlay with header={false}. */
export declare const SectionCard: FC<SectionCardProps>;
