import type { FC } from 'react';
import type { IconName } from '../icons/Icons';

export interface StatementProps {
  eyebrow?: string;
  /** One or two sentences. */
  text: string;
  /** Default 'chat-bubble'. */
  icon?: IconName;
  frame: number;
}
/** Full-frame closing statement on bgAlt (HTML) — SceneFrame overlay with header={false}. */
export declare const Statement: FC<StatementProps>;
