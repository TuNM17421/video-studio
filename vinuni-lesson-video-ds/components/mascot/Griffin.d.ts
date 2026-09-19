import type { FC } from 'react';

/** Drawn with all seven moods: stand · sit · wings (wings raised) · turn (three-quarter, wings open). */
export type GriffinSetPose = 'stand' | 'sit' | 'wings' | 'turn';
/** Gestures — drawn so far with one mood (neutral); more are added in tools/griffin-assets.json. */
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
  /**
   * One mood, or steps on beats (cut + squash). Default 'neutral'. A mood the current pose is not drawn
   * with shows that pose's default picture instead (see GRIFFIN_POSE_MOODS).
   */
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
 * `<pose>-<mood>` (only moods in GRIFFIN_POSE_MOODS exist), `badge-<mood>`, or a prop file.
 */
export declare function griffinAsset(name: string, base?: string): string;

export declare const GRIFFIN_POSES: readonly GriffinPose[];
export declare const GRIFFIN_MOODS: readonly Exclude<GriffinMood, 'angry'>[];
export declare const GRIFFIN_PROPS: readonly GriffinProp[];
/** The moods each pose is drawn with, default first — generated with the pictures. */
export declare const GRIFFIN_POSE_MOODS: Readonly<Record<GriffinPose, readonly Exclude<GriffinMood, 'angry'>[]>>;
