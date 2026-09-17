import type { FC } from 'react';

export type GriffinPose = 'stand' | 'sit' | 'front' | 'left' | 'right' | 'back';
export type GriffinMood = 'neutral' | 'happy' | 'wink' | 'thinking' | 'surprised' | 'sad' | 'angry';
export type GriffinProp = 'lightbulb' | 'question' | 'exclamation' | 'sparkle' | 'book' | 'laptop' | 'hat';

/** A name that switches in at scene frame `at` (crossfades over 8 frames). */
export interface GriffinStep<T extends string> {
  at: number;
  name: T;
}

export interface GriffinProps {
  /** Feet: bottom-centre of the mascot. */
  x: number;
  y: number;
  /** Height in px. Default 440. `front/left/right/back` are small pictures — keep them ≤ 260. */
  h?: number;
  /** Default 'stand'. 'stand' and 'sit' are the large poses (both wink, wings open). */
  pose?: GriffinPose;
  /** Mirror left–right. */
  flip?: boolean;
  /** Current scene frame. */
  frame?: number;
  /** Frame of the pop-in entrance. Omit = already on screen. */
  enter?: number | null;
  /** 'idle' = slow breathing (default) · 'float' = bob and sway · 'none'. */
  motion?: 'idle' | 'float' | 'none';
  /** Frames at which it hops once (16 frames each, squash on take-off and landing). */
  hops?: readonly number[];
  /** Constant lean in degrees. */
  tilt?: number;
  /** Face in the round badge beside the head — one mood, or steps on beats. */
  mood?: GriffinMood | readonly GriffinStep<GriffinMood>[] | null;
  /** Object floating above the head — one prop, or steps on beats (each arrival twinkles once). */
  prop?: GriffinProp | readonly GriffinStep<GriffinProp>[] | null;
  /** Which side of the head the mood badge sits on (before `flip`). Default 'right'. */
  bubbleSide?: 'left' | 'right';
  /** URL folder of the pictures. Default: assets/mascot/griffin/ next to dist/vk.js. */
  base?: string;
  opacity?: number;
}

export declare const Griffin: FC<GriffinProps>;

export interface GriffinBadgeProps {
  /** Centre of the round badge. */
  x: number;
  y: number;
  /** Radius. Default 56. */
  r?: number;
  mood?: GriffinMood | readonly GriffinStep<GriffinMood>[];
  frame?: number;
  enter?: number | null;
  /** Ring colour. Default 'accent'. */
  tone?: 'accent' | 'strong' | 'red' | 'muted';
  base?: string;
  opacity?: number;
}

export declare const GriffinBadge: FC<GriffinBadgeProps>;

/** Ready URL of one picture in the pack, e.g. griffinAsset('face_happy') as a DialogueCard avatar. */
export declare function griffinAsset(name: string, base?: string): string;

export declare const GRIFFIN_POSES: readonly GriffinPose[];
export declare const GRIFFIN_MOODS: readonly GriffinMood[];
export declare const GRIFFIN_PROPS: readonly GriffinProp[];
