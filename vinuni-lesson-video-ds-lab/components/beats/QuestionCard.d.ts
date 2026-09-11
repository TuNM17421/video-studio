import type { FC } from 'react';

export interface QuestionCardProps {
  /** 1–3 short questions (44 px). */
  questions: readonly string[];
  /** Muted 24 px hint after the questions. */
  hint?: string;
  frame: number;
  /** First reveal frame. Default 0. */
  start?: number;
  /** Default 360. */
  top?: number;
  /** Row height per question. Default 130. */
  gap?: number;
}
/** HTML overlay inside a SceneFrame content zone. */
export declare const QuestionCard: FC<QuestionCardProps>;
