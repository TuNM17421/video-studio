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
/** Mực đọc được trên nền `bg`: `light` (mặc định C.bg) khi nền tối, `dark` (mặc định C.text) khi nền
 *  sáng. Chỉ chọn giữa hai token có sẵn, không sinh màu mới. Dùng cho chữ đặt ĐÈ LÊN một mảng màu. */
export declare function readableInk(bg: string, dark?: string, light?: string): string;
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
// ── Dòng video "poster vector" ────────────────────────────────────────────────────────────────
// Engine + sân khấu + primitive dùng chung cho mọi video poster. Export theo NAMESPACE vì
// `Easing`/`interpolate`/`Card`/`Pill` trùng tên với dòng slide.
export declare namespace posterMarks {
  /** Con dấu viền đôi. `style` trải ra TRƯỚC (vị trí + `M.pop` + `rotate` do cảnh đặt). */
  function Stamp(p: { text: any; color: string; size?: number; weight?: number; radius?: number; padding?: string; border?: number; style?: any }): any;
  /** Bia đá khắc chữ: mỗi dòng chạy `width` 0→100%. `reveal == null` = đã khắc xong. */
  function Plaque(p: {
    box: { left: number; right: number; top: number; padding: string };
    lines: ReadonlyArray<{ node: any; size: number; color: string; reveal?: number | null }>;
    sub?: { node: any; size: number; color: string; opacity?: number };
    rule?: number | null;
    style?: any;
  }): any;
  function Pill(p: { x: number; y: number; text: any; T: number; at: number; color?: string }): any;
  function XMark(p: { x: number; y: number; size: number; color: string; T: number; at: number; ease?: (t: number) => number }): any;
  function Card(p: { x: number; y: number; r?: number; w?: number; h?: number; children?: any; label?: string; labelBg?: string; style?: any }): any;
  function Critter(p: { kind: 'dog' | 'cat' | 'fish' | 'bird'; size?: number; ink: string }): any;
  const CARD_RADIUS: number;
  const CARD_SHADOW: string;
}
export declare namespace posterFigures {
  /** Đường cong tự vẽ ra (`pathLength=1` + `strokeDashoffset`). `p` = tiến độ 0→1. */
  function DrawPath(p: { d: string; stroke: string; width: number | string; cap?: string; p: number; opacity?: number | string }): any;
  /** Đoạn thẳng tự vẽ ra. */
  function DrawLine(p: { x1: any; y1: any; x2: any; y2: any; stroke: string; width: number | string; cap?: string; p: number; opacity?: number | string }): any;
  /** Băng chuyền: `since` giây kể từ lúc mở; âm thì trả `[]`. Hàm thuần, không `Math.random`. */
  function lane(since: number, o: { cycle: number; count: number; stagger: number; on?: boolean }): Array<{ i: number; p: number }>;
  /** Độ hiện sao cho phần tử tan BÊN TRONG hộp đích, không tan giữa đường (luật F8). */
  function reachFade(p: number, o: { enter?: number; arrive: number; sink?: number }): number;
}
export declare namespace posterBridge {
  /** Mang một hộp/nhóm từ trạng thái cảnh trước sang cảnh sau trong đúng một cửa sổ. */
  function carry<T extends Record<string, number>>(T_: number, o: { at: number; dur: number; from: T; to: T; ease?: (t: number) => number }): T & { p: number };
}
// ── LEXCE trên nền đêm + khung điện thoại tông poster (PROBE-01 còn nợ hai khối này) ───────────
export declare namespace posterMascot {
  /** Lớp SVG 1600×900 cho mascot và chữ `<text>` đi kèm — gate `data-vk-occupies` chỉ so được
   *  chữ với mascot khi cả hai nằm trong CÙNG một lớp. */
  function MascotLayer(p: { children?: any; zIndex?: number; style?: any }): any;
  /**
   * LEXCE đặt trên nền đêm. `variant="halo"` là mặc định đã chốt (viền cream nở từ `SourceAlpha`,
   * median tương phản đường bao 6,35:1 so với 1,5–1,74 của bốn phương án kia — PROBE.md §A);
   * `badge` khi nhân vật đứng cố định một góc cả chương. `ground="cut"` che đĩa `revampGround`.
   */
  function PosterMascot(p: {
    x: number; y: number; size?: number;
    variant?: 'bare' | 'halo' | 'plinth' | 'cabin' | 'badge';
    pose?: string; emotion?: string; facing?: 'left' | 'right';
    frame?: number; look?: any; talking?: boolean; opacity?: number;
    ground?: 'cut' | 'keep';
  }): any;
  /** Chữ `<text>` trong `MascotLayer`. */
  function LayerText(p: { x: number; y: number; size?: number; weight?: number; color?: string; anchor?: string; opacity?: number; children?: any }): any;
  const W: number;
  const H: number;
  const MASCOT_ASPECT: number;
  const MASCOT_VARIANTS: readonly string[];
  const MASCOT_VARIANT_LABEL: Readonly<Record<string, string>>;
}
export declare namespace posterPhone {
  /** Khung máy tông đêm. Thân `deep` (TỐI hơn nền) nên đọc ra là một VẬT, không phải ô nội dung. */
  function PosterPhone(p: {
    x: number; y: number; w?: number; h?: number;
    appName?: string; time?: string;
    tone?: 'neutral' | 'do' | 'dont'; variant?: 'plain' | 'chat';
    opacity?: number; children?: any;
  }): any;
  /** Ô ruột của khung máy (trừ chrome + padding) — dùng để đặt nội dung bên trong. */
  function posterPhoneBox(box: { x: number; y: number; w: number; h: number }, pad?: number): { x: number; y: number; w: number; h: number };
  function PhoneText(p: { x: number; y: number; size?: number; weight?: number; color?: string; anchor?: string; opacity?: number; children?: any }): any;
  function PhoneBubble(p: { x: number; y: number; w: number; h?: number; text: string; size?: number; color?: string; fill?: string; stroke?: string; opacity?: number }): any;
  function PhoneButton(p: { x: number; y: number; w: number; h?: number; label: string; tone?: 'neutral' | 'do' | 'dont'; filled?: boolean; opacity?: number }): any;
  /** Rung ngang tắt dần — hàm thuần của `T`, không RAF. */
  function shakeX(T_: number, at: number, o?: { amp?: number; hz?: number; dur?: number }): number;
  const PHONE_TONE: Readonly<Record<'neutral' | 'do' | 'dont', string>>;
}

// ── CÁI VẠCH — carrier xuyên phim của d05-v06 ─────────────────────────────────────────────────
export declare namespace posterVach {
  /** Lớp SVG 1600×900 cho cái vạch và mọi thứ vẽ chung hệ toạ độ với nó. */
  function VachLayer(p: { children?: any; zIndex?: number; style?: any }): any;
  function VachText(p: { x: number; y: number; size?: number; weight?: number; color?: string; anchor?: string; opacity?: number; letterSpacing?: number; children?: any }): any;
  /**
   * Cái vạch tham số hoá — MỘT primitive cho cả 11 phút. Mỗi chương chỉ đổi tham số, không ai vẽ
   * lại một cái vạch mới. Xem bảng tham số ở đầu `lib/poster/vach.jsx`.
   */
  function Vach(p: {
    T?: number; y?: number; x0?: number; x1?: number;
    p?: number; shift?: number; divide?: number;
    band?: { from: number; to: number; h?: number; label?: string } | null;
    zones?: Array<{ from: number; to: number; tone?: 'block' | 'ask' | 'auto' | 'warm' | 'cold'; label?: string }> | null;
    tilt?: number; cracks?: number;
    gapAt?: { at: number; w?: number } | null; branches?: number;
    notches?: Array<{ at: number; on?: number; lit?: boolean; label?: string }> | null;
    labels?: boolean; leftLabel?: string; rightLabel?: string;
    weight?: number; glow?: number; pulse?: number; opacity?: number; style?: any;
  }): any;
  /** Bốn ngọn đèn câu hỏi treo TRÊN vạch (c1-bon-cau · c5-flora callback · outro). */
  function LampRow(p: { x0?: number; x1?: number; y?: number; items?: string[]; lit?: boolean[]; drop?: number; size?: number; T?: number; opacity?: number }): any;
  /** Độ chắc hiển thị bằng một KHOẢNG — `spread` 0 là một ĐIỂM (độ chính xác giả). */
  function RangeBar(p: { x: number; y: number; w: number; h?: number; at?: number; spread?: number; label?: string; pointLabel?: string; tone?: string; T?: number; opacity?: number }): any;
  /** Trục "cái giá khi sai" dựng vuông góc với vạch. `load` dương = quả cân đè xuống. */
  function CostAxis(p: { x: number; yTop?: number; yBottom?: number; load?: number; label?: string; T?: number; p?: number; opacity?: number }): any;
  /** Hộp bo góc bằng `<path>` — thay cho `<rect>` (gate `data-vk-occupies` đếm mọi rect). */
  function boxPath(x: number, y: number, w: number, h: number, r?: number): string;
  /** Toạ độ tuyệt đối của một điểm 0…1 trên vạch. */
  function vachX(u: number, o?: { x0?: number; x1?: number }): number;
  function slide(T_: number, at: number, to: number, dur?: number): number;
  const VACH: Readonly<{
    y: number; x0: number; x1: number; w: number; weight: number; shiftMax: number;
    labelY: number; lampY: number; leftLabel: string; rightLabel: string; leftInk: string; rightInk: string;
  }>;
  const W: number;
  const H: number;
}
// ── CÁI CÂN — carrier xuyên phim của d05-v01 ──────────────────────────────────────────────────
export declare namespace posterCan {
  /** Lớp SVG 1600×900 cho cái cân và mọi thứ vẽ chung hệ toạ độ với nó. */
  function CanLayer(p: { children?: any; zIndex?: number; style?: any }): any;
  function CanText(p: { x: number; y: number; size?: number; weight?: number; color?: string; anchor?: string; opacity?: number; letterSpacing?: number; children?: any }): any;
  /** Một khối CÔNG SỨC đặt lên đĩa. */
  function Block(p: { x: number; y: number; w?: number; h?: number; ink?: string; opacity?: number; label?: string; labelSize?: number }): any;
  /** Dấu hỏi — thứ chất lên đĩa TÍN HIỆU. */
  function QMark(p: { x: number; y: number; size?: number; ink?: string; opacity?: number }): any;
  /** Một xấp tiền — tín hiệu nặng nhất của phim (C4). */
  function Cash(p: { x: number; y: number; w?: number; h?: number; ink?: string; opacity?: number; count?: number }): any;
  /**
   * Cái cân tham số hoá — MỘT primitive cho cả phim. `tilt` DƯƠNG = đĩa TRÁI chìm.
   * Bảng tham số đầy đủ ở đầu `lib/poster/can.jsx`.
   */
  function Can(p: {
    T?: number; p?: number; tilt?: number; left?: number; right?: number;
    leftItems?: Array<{ kind?: 'block' | 'q' | 'cash'; label?: string; ink?: string; on?: number; w?: number; h?: number; dx?: number; size?: number; count?: number }>;
    rightItems?: Array<{ kind?: 'block' | 'q' | 'cash'; label?: string; ink?: string; on?: number; w?: number; h?: number; dx?: number; size?: number; count?: number }>;
    shift?: number; lift?: number; hooks?: number; scale?: number;
    labels?: boolean; labelsOn?: number; leftLabel?: string; rightLabel?: string;
    dim?: boolean; opacity?: number; style?: any;
  }): any;
  /** Độ nghiêng (độ, DƯƠNG = đĩa TRÁI chìm) suy từ hai mức tải 0…1. */
  function tiltFor(left?: number, right?: number, max?: number): number;
  /** Tâm đĩa ở độ nghiêng `tilt` — để cảnh thả vật đúng chỗ. */
  function panAt(side: 'left' | 'right', tilt?: number, o?: { shift?: number }): { x: number; y: number };
  function boxPath(x: number, y: number, w: number, h: number, r?: number): string;
  const CAN: Readonly<{
    pivot: { x: number; y: number }; arm: number; beam: number; cord: number;
    panW: number; panLip: number; baseY: number; tiltMax: number; labelDy: number; blockH: number;
    leftLabel: string; rightLabel: string;
  }>;
  const W: number;
  const H: number;
}
export declare namespace posterPanels {
  /** Một tờ giấy vector: séc · hoá đơn · hồ sơ · giấy hẹn. `grow` phóng quanh tâm. */
  function Paper(p: {
    x: number; y: number; w: number; h: number;
    title?: string; lines?: string[]; amount?: string;
    tone?: 'neutral' | 'do' | 'dont' | 'warm';
    grow?: number; tilt?: number; sealed?: number; sealText?: string; opacity?: number; style?: any;
  }): any;
  /** Nút ở đúng MỘT trong hai trạng thái; trạng thái đọc bằng MÀU, không bằng thẻ NÊN/KHÔNG NÊN. */
  function StatePill(p: {
    x: number; y: number; w: number; h?: number; text: string;
    state?: 'neutral' | 'do' | 'dont' | 'warm';
    T?: number; at?: number; filled?: boolean; size?: number; opacity?: number; style?: any;
  }): any;
  /** Chồng lớp theo chiều sâu: cột kịch bản · chồng hồ sơ · ngăn xếp phiên bản. */
  function Stack(p: {
    x: number; y: number; w: number; h?: number;
    count?: number; pitch?: number; active?: number; reveal?: number; lost?: number;
    labels?: string[]; tones?: string[]; T?: number; opacity?: number; style?: any;
  }): any;
  /** Hai–ba `PosterPhone` thành hàng + đường nối mảnh (thứ chống "hai card-bullet"). */
  function PhoneRow(p: {
    x: number; y: number;
    items?: Array<{ appName?: string; tone?: 'neutral' | 'do' | 'dont'; time?: string; children?: any }>;
    w?: number; h?: number; gap?: number; link?: boolean; enter?: number; T?: number; opacity?: number; style?: any;
  }): any;
  const TONE_INK: Readonly<Record<string, string>>;
  const MIN_TEXT: number;
}
