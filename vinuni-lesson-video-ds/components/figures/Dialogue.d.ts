import type { FC } from 'react';

/** One word of the narration with the scene-local frame it starts being said. */
export interface SpokenWord {
  text: string;
  frame: number;
}

export interface DialogueCardProps {
  /** Top-left of the card. */
  x: number;
  y: number;
  /** Card width. Default 640. */
  w?: number;
  /** Which side of the frame this character speaks from — it places the tail. Default 'left'. */
  side?: 'left' | 'right';
  /** Character name, shown above the card. Must match a voice in voices.json. */
  speaker: string;
  /** The line, word by word — from `spokenWords(n)` in lib/speech.js. Never a hand-written caption. */
  words: readonly SpokenWord[];
  /** Current scene frame; words appear as their own frame arrives. Omit for the settled card. */
  frame?: number;
  /** Hue for this character. Default 'accent'. */
  tone?: 'accent' | 'strong' | 'red' | 'muted';
  /** Text size. Default 26. */
  size?: number;
  /** Row pitch. Default 38. */
  lineHeight?: number;
  opacity?: number;
}

export declare const DialogueCard: FC<DialogueCardProps>;

/** Greedy line-break of `words` into rows no wider than `w`, using the same width estimate as the render. */
export declare function wrapWords(
  words: readonly SpokenWord[],
  w: number,
  size: number,
  weight?: number,
): SpokenWord[][];
