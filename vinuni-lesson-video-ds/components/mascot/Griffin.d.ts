import type { FC } from 'react';

/** Expression sets (carry `mood`): stand · sit · wings (wings raised) · turn (three-quarter, wings open). */
export type GriffinSetPose = 'stand' | 'sit' | 'wings' | 'turn';
/** Single-picture gestures (one face each, `mood` does not apply). */
export type GriffinGesture = 'wave' | 'welcome' | 'cheer' | 'rest' | 'walk-left' | 'walk-right';
export type GriffinPose = GriffinSetPose | GriffinGesture;
/** `angry` is accepted as an alias of `stern`. */
export type GriffinMood = 'neutral' | 'happy' | 'wink' | 'surprised' | 'thinking' | 'sad' | 'stern' | 'angry';
export type GriffinProp = 'lightbulb' | 'question' | 'exclamation' | 'sparkle' | 'book' | 'laptop' | 'hat';

/** A name that takes over at scene frame `at`. */
export interface GriffinStep<T extends string> {
  at: number;
  name: T;
}

export interface GriffinProps {
  /** Feet: bottom-centre of the mascot. */
  x: number;
  y: number;
  /** Height in px (crest to feet). Default 440. */
  h?: number;
  /** One pose, or steps on beats — each change is a hard cut under a small squash. Default 'stand'. */
  pose?: GriffinPose | readonly GriffinStep<GriffinPose>[];
  /** Face of the expression sets — one mood, or steps on beats (cut + squash). Default 'neutral'. */
  mood?: GriffinMood | readonly GriffinStep<GriffinMood>[];
  /** Mirror left–right. */
  flip?: boolean;
  /** Current scene frame. */
  frame?: number;
  /** Frame of the pop-in entrance. Omit = already on screen. */
  enter?: number | null;
  /** 'idle' = slow breathing (default) · 'float' = bob and sway · 'none'. Walk poses always step unless 'none'. */
  motion?: 'idle' | 'float' | 'none';
  /** Frames at which it hops once (16 frames each, squash on take-off and landing). */
  hops?: readonly number[];
  /** Constant lean in degrees. */
  tilt?: number;
  /** Object floating above the head (`hat` is worn) — one prop, or steps on beats (each arrival twinkles once). */
  prop?: GriffinProp | readonly GriffinStep<GriffinProp>[] | null;
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

/**
 * Ready URL of one picture in the pack: `face-<mood>` (square avatar, e.g. for DialogueCard),
 * `<set>-<mood>`, `gesture-<name>`, or a prop file.
 */
export declare function griffinAsset(name: string, base?: string): string;

export declare const GRIFFIN_POSES: readonly GriffinPose[];
export declare const GRIFFIN_MOODS: readonly Exclude<GriffinMood, 'angry'>[];
export declare const GRIFFIN_PROPS: readonly GriffinProp[];
