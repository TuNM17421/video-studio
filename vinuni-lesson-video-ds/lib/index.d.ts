import type { ComponentType, Context, FC, ReactNode } from 'react';

/* ---------------------------------------------------------------- tokens */
export declare const FPS: 30;
export declare const WIDTH: 1920;
export declare const HEIGHT: 1080;
/** lightColors — the ONLY colors a lesson scene may use (tints = these at alpha). */
export declare const C: Readonly<{
  bg: string;
  bgAlt: string;
  text: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  red: string;
  redSoft: string;
  dotInactive: string;
}>;
export type ColorToken = keyof typeof C;
/** Role hues (option B): ONLY for zone labels, outlines and soft fills naming a role — never body text, numbers or particles. */
export declare const ROLE: Readonly<{
  purple: string; purpleSoft: string; green: string; greenSoft: string;
  orange: string; orangeSoft: string; amber: string; amberSoft: string;
}>;
export type RoleName = 'input' | 'process' | 'reasoning' | 'output' | 'check' | 'action' | 'memory';
/** Script vocabulary → [stroke, soft fill]: input blue · process/reasoning purple · output green · check/action orange · memory amber. */
export declare const ROLE_OF: Readonly<Record<RoleName, readonly [string, string]>>;
export declare const FONT: string;
export declare const MONO: string;
/** Whiteboard style: handwriting on the board (Pangolin). Never for chrome. */
export declare const HAND: string;
export declare const BRAND: string;
/** Fixed canvas geometry (px on the 1920×1080 canvas). */
export declare const LAYOUT: Readonly<Record<
  | 'eyebrowTop' | 'titleBaseline' | 'titleSize' | 'dividerY' | 'dividerX0' | 'dividerX1' | 'tagTop'
  | 'tagRight' | 'contentTop' | 'contentBottom' | 'captionTop' | 'captionHeight' | 'captionMaxChars'
  | 'safeX' | 'contentXMin' | 'footerBottom' | 'watermarkTop' | 'watermarkRight' | 'gridStart' | 'gridStep',
  number
>>;
export declare const SHADOW: Readonly<Record<'hero' | 'block' | 'icon' | 'soft' | 'caption', string>>;
/** A palette token (or hex) at alpha, e.g. alpha('red', 0.24) → "rgba(199,33,39,0.24)". */
export declare function alpha(token: ColorToken | string, a: number): string;

/* ---------------------------------------------------------------- motion */
export type EasingFn = (t: number) => number;
export interface InterpolateOptions {
  extrapolateLeft?: 'clamp' | 'extend' | 'identity';
  extrapolateRight?: 'clamp' | 'extend' | 'identity';
  easing?: EasingFn;
}
export declare const CLAMP: Readonly<InterpolateOptions>;
/** Remotion-compatible interpolate(). Input ranges must be strictly increasing. */
export declare function interpolate(input: number, inputRange: readonly number[], outputRange: readonly number[], options?: InterpolateOptions): number;
/** Remotion-compatible Easing namespace. */
export declare const Easing: Readonly<{
  linear: EasingFn;
  quad: EasingFn;
  cubic: EasingFn;
  sin: EasingFn;
  exp: EasingFn;
  bezier: (x1: number, y1: number, x2: number, y2: number) => EasingFn;
  in: (fn: EasingFn) => EasingFn;
  out: (fn: EasingFn) => EasingFn;
  inOut: (fn: EasingFn) => EasingFn;
}>;
/** Remotion-compatible spring(): physics-based 0→1 (mapped to from→to) evaluated at `frame`. */
export declare function spring(opts: {
  frame: number;
  fps?: number;
  config?: { damping?: number; mass?: number; stiffness?: number; overshootClamping?: boolean };
  from?: number;
  to?: number;
}): number;
/** Named eases: out (reveal), inOut (smooth move), exit, draw, outCubic. */
export declare const EASE: Readonly<Record<'out' | 'inOut' | 'exit' | 'draw' | 'outCubic', EasingFn>>;
/** 0→1 with the reveal ease between two frames. */
export declare function progress(frame: number, start: number, end: number): number;
/** 0→1 linear — particle travel, parameter sweeps, count-ups. */
export declare function linearProgress(frame: number, start: number, end: number): number;
/** Standard reveal: 24 frames with the out ease. */
export declare function appear(frame: number, start: number, duration?: number): number;
/** Linear fade-in. */
export declare function fade(frame: number, start: number, duration?: number): number;
/** One receiving-card pulse: 0→1→0 over 54 frames, peak at 32 %. */
export declare function pulse(frame: number, at: number, duration?: number): number;
/** Fade in over `span`, hold, fade out over `span` before `end`. */
export declare function fadeWindow(frame: number, start: number, end: number, span?: number): number;
/** Eased in-out value between two frames. */
export declare function smooth(frame: number, start: number, end: number, from?: number, to?: number): number;
/** Scene/title entrance scale: spring damping 200, 0.94 → 1 (no overshoot). */
export declare function enterScale(frame: number, start?: number, fps?: number): number;
/** Icon / card pop: spring damping 13, stiffness 140 (small overshoot). */
export declare function popScale(frame: number, start?: number, fps?: number): number;
/** Continuous count-up value (round only when displaying). */
export declare function countUp(frame: number, start: number, end: number, from: number, to: number): number;
export declare function secondsToFrames(seconds: number, fps?: number): number;
export declare function framesToSeconds(frames: number, fps?: number): number;
export declare function clamp01(v: number): number;

/* ---------------------------------------------------------------- geometry */
export interface Point { x: number; y: number }
export interface Box { x: number; y: number; w: number; h: number }
export declare function polylineLength(points: readonly Point[]): number;
export declare function pointAtDistance(points: readonly Point[], distance: number): Point;
export declare function pathD(points: readonly Point[]): string;
/** Quadratic bezier sampled into a polyline (so Flow can travel it exactly). */
export declare function sampleQuadratic(a: Point, c: Point, b: Point, steps?: number): Point[];
/** Cubic bezier sampled into a polyline. */
export declare function sampleCubic(a: Point, c1: Point, c2: Point, b: Point, steps?: number): Point[];
export declare function expand(b: Box, pad: number): Box;
export declare function contains(b: Box, p: Point, pad?: number): boolean;
export declare function center(b: Box): Point;
/** Named anchor on a card rectangle: connectors start/end here, never at eyeballed coordinates. */
export declare function anchor(b: Box, side: 'left' | 'right' | 'top' | 'bottom' | 'center', t?: number): Point;
/** Estimated Montserrat text width in px. */
export declare function textWidth(str: string, size: number, weight?: number): number;
/** Width of a Pill / tag holding `label` (text + 22 px padding each side). */
export declare function pillWidth(label: string, size?: number): number;
/** Center a row of chips by estimated width. */
export declare function layoutRow(
  labels: readonly string[],
  opts?: { gap?: number; size?: number; pad?: number; centerAt?: number },
): Array<{ label: string; x: number; w: number; centerX: number }>;

/* ---------------------------------------------------------------- captions */
export interface CaptionCue { start: number; end: number; text: string; pause?: number }
export declare const CAPTION_MAX: 78;
/** Balanced subtitle pages of ≤ 78 characters that end at a phrase boundary. */
export declare function paginate(sourceText: string, max?: number): string[];
/** Narration cues (frames) → [{ start, end, text }] subtitle pages. */
export declare function cueCaptions(cues: readonly CaptionCue[], opts?: { max?: number; pause?: number }): Array<{ start: number; end: number; text: string }>;
/** Captions overlapping [start, start + duration), shifted to scene-local frames and clipped. */
export declare function sliceCaptions<T extends { start: number; end: number }>(captions: readonly T[], start: number, duration: number): T[];

/* ---------------------------------------------------------------- player */
export interface VideoConfig { fps: number; width: number; height: number; durationInFrames: number }
export declare const FrameContext: Context<number>;
export declare const ConfigContext: Context<VideoConfig>;
export declare const CaptionsContext: Context<boolean>;
/** Scene-local frame (Remotion: useCurrentFrame). */
export declare function useFrame(): number;
/** { fps, width, height, durationInFrames } (Remotion: useVideoConfig). */
export declare function useVideoConfig(): VideoConfig;
/** False when captions were switched off (?captions=0). */
export declare function useCaptionsEnabled(): boolean;
export declare function urlParams(): Record<string, string>;
/** Mark the document ready once Montserrat is loaded (used by headless capture). */
export declare function markReady(): void;

export interface PlayerProps {
  /** Scene component — renders a pure function of useFrame(). */
  scene: ComponentType;
  /** Length in frames (30 fps). */
  duration: number;
  /** Default 30. */
  fps?: number;
  /** Freeze on this frame (no playback). */
  frame?: number | null;
  /** Default true. */
  autoplay?: boolean;
  /** Default true. */
  loop?: boolean;
  /** Play / scrub / frame-step controls under the canvas. Default true. */
  controls?: boolean;
  /** Burned-in subtitles. Default true. */
  captions?: boolean;
  /** 1:1 1920×1080 capture mode (no fit-to-container scaling). Default false. */
  capture?: boolean;
  label?: string;
  /** Beat markers on the scrub bar (frames). */
  markers?: ReadonlyArray<{ frame: number; label?: string }>;
}
/** Plays (or freezes) one 1920×1080 scene inside its container, scaled to fit, with optional controls. */
export declare const Player: FC<PlayerProps>;

export interface SceneDef { component: ComponentType; duration: number; title?: string; id?: string }
/** Mount a scene definition { component, duration, title } into an element. */
export declare function mountScene(target: string | Element, def: SceneDef, opts?: Partial<PlayerProps>): unknown;
/** Mount a small SVG canvas: render(frame) → SVG children in a width×height viewBox. */
export declare function mountCard(
  target: string | Element,
  opts: { width: number; height: number; render: (frame: number) => ReactNode; duration?: number; frame?: number; loop?: boolean; fps?: number; background?: string },
): unknown;
/** Mount a scaled 16:9 frame (no controls); `scene` reads useFrame(). */
export declare function mountFrame(
  target: string | Element,
  opts: { scene: ComponentType; duration?: number; frame?: number; loop?: boolean; captions?: boolean },
): unknown;

/* ---------------------------------------------------------------- series */
export interface SeriesSequence { component: ComponentType; duration: number; authoredDuration?: number; name?: string }
export interface SeriesProps {
  /** Hard-cut scenes, durations in frames. */
  sequences: readonly SeriesSequence[];
  /** Global frame; the active scene reads a scene-local frame through useFrame(). */
  frame: number;
}
/** Hard-cut sequence of scenes — the equivalent of Remotion <Series>. */
export declare const Series: FC<SeriesProps>;
export declare function seriesDuration(sequences: readonly SeriesSequence[]): number;
export declare function seriesStarts(sequences: readonly SeriesSequence[]): number[];

/* ---------------------------------------------------------------- text motion */
/** Graphemes after NFC normalisation (Vietnamese diacritics never split). */
export declare function graphemes(str: string): string[];
/** Typewriter prefix of `str` visible at `frame` (cps = characters per second at 30 fps, default 30). */
export declare function typeText(str: string, frame: number, start?: number, cps?: number): string;
/** How many of n items are visible when one appears every `per` frames from `start`. */
export declare function revealCount(n: number, frame: number, start?: number, per?: number): number;
/** 0→1 progress of item i in a staggered reveal. */
export declare function staggered(i: number, frame: number, start?: number, per?: number, dur?: number): number;
/** vi-VN number formatting ("1.234,5"). */
export declare function formatNumber(v: number, digits?: number): string;
/** Seeded PRNG (mulberry32) — the only allowed randomness in scenes. */
export declare function rng(seed?: number): () => number;

/* ---------------------------------------------------------------- paths & layout (@remotion/paths · d3 · flubber · dagre) */
export declare function evolvePath(progress: number, path: string): { strokeDasharray: string; strokeDashoffset: number };
export declare function getLength(path: string): number;
export declare function getPointAtLength(path: string, length: number): Point;
export declare function getTangentAtLength(path: string, length: number): Point;
export declare function interpolatePath(value: number, firstPath: string, secondPath: string): string;
export declare function reversePath(path: string): string;
/** Smooth SVG path through points. */
export declare function curvePath(points: readonly Point[], curve?: 'basis' | 'catmullRom' | 'monotoneX' | 'linear' | 'step'): string;
/** Point + angle (deg) at progress t (0–1) along a path string. */
export declare function pointOnPath(d: string, t: number): Point & { angle: number };
/** Stroke props that draw `d` from 0 to t: <path d={d} {...drawOn(d, t)} />. */
export declare function drawOn(d: string, t: number): { strokeDasharray: string; strokeDashoffset: number };
/** Morph between two unrelated shapes (flubber). */
export declare function morphPath(a: string, b: string, t: number): string;
/** Color between two tokens at t. */
export declare function mixColor(a: string, b: string, t: number): string;
export declare function scaleLinear(domain?: number[], range?: number[]): any;
export declare function scaleBand(domain?: string[], range?: number[]): any;
/** Auto-layout a directed graph with dagre. Boxes are top-left in scene px. */
export declare function layoutGraph(
  nodes: ReadonlyArray<{ id: string; w: number; h: number }>,
  edges: ReadonlyArray<{ from: string; to: string }>,
  opts?: { rankdir?: 'LR' | 'TB' | 'RL' | 'BT'; nodesep?: number; ranksep?: number; marginx?: number; marginy?: number; x?: number; y?: number },
): { nodes: Record<string, Box>; edges: Array<{ from: string; to: string; points: Point[] }>; width: number; height: number };

/* ---------------------------------------------------------------- assets */
/** Absolute URL of a file addressed from the design-system root ("ui_kits/lesson-video/videos/<id>/img/s3.jpg"); URLs pass through. */
export declare function dsUrl(path: string): string;

/* ----------------------------------------------------------------- noise */
/** Deterministic 0–1 from up to three integers. */
export declare function hash01(a: number, b?: number, c?: number): number;
/** Smooth value noise in [-1, 1], continuous in `t` (one unit of t = one lattice step). */
export declare function noise1(seed: number, t: number): number;
/** Fractal sum of `octaves` noise1 layers, in [-1, 1] — organic where a sine is mechanical. */
export declare function fbm(seed: number, t: number, octaves?: number): number;
/** hash01(seed, i) scaled into [lo, hi]. */
export declare function spread(seed: number, i: number, lo?: number, hi?: number): number;
