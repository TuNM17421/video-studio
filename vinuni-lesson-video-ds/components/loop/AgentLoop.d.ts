import type { FC, ReactNode } from 'react';

export interface AgentLoopStage {
  /** UPPERCASE stage noun, 24/700 (e.g. 'SUY NGHĨ'). In 'flywheel' it labels the arc leaving this stage. */
  label: string;
  /** Lowercase explanation under the label, 20/600 muted. */
  sub?: string;
  /** LineIcon name drawn left of the text (cards only). */
  icon?: string;
  /** Role hue for the card outline + soft fill (ROLE_OF key); in 'flywheel' it colors the arc. Default accent/bgAlt. */
  role?: 'input' | 'process' | 'reasoning' | 'output' | 'check' | 'action' | 'memory';
  /** Card width override (default: estimated from the text, min 200). */
  w?: number;
  /** Card height override (default 104 with sub, 78 without). */
  h?: number;
}

export interface AgentLoopExit {
  /** Stage index the exit leaves from. */
  stage: number;
  /** Exit card copy, e.g. 'HOÀN TẤT' or 'HỎI NGƯỜI DÙNG'. */
  label: string;
  /** Optional lowercase second line on the exit card. */
  sub?: string;
  /** Direction of the exit arrow. Default: radially outward from the loop center. */
  side?: 'up' | 'down' | 'left' | 'right';
  /** Arrow length in px. Default 130. */
  length?: number;
  /** Exit card width override. */
  w?: number;
  /** Frame the exit Flow starts. Default: when the particle reaches `stage` on its last lap. */
  at?: number;
}

export interface AgentLoopProps {
  /** Loop center (scene px). Default 960, 600. */
  cx?: number;
  cy?: number;
  /** Circle radius. Default 270. Ignored on an axis where `w` / `h` is given. */
  r?: number;
  /** Ellipse width (loop through the card centers). */
  w?: number;
  /** Ellipse height. */
  h?: number;
  /** 3–4 stages, clockwise from the top. Default: SUY NGHĨ → HÀNH ĐỘNG → QUAN SÁT (ReAct). */
  stages?: readonly AgentLoopStage[];
  /** 'loop' (cards + arcs, default) or 'flywheel' (labeled arcs with gaps, no cards). */
  variant?: 'loop' | 'flywheel';
  /** Current frame. Omit for the settled state (all arcs drawn, no particle, no pulse). */
  frame?: number;
  /** Frame the particle leaves stage 0. Default 0. */
  start?: number;
  /** Frames per lap. Default 180. */
  lap?: number;
  /** Number of laps the particle runs. Default 1. */
  laps?: number;
  /** Hold this stage active (red-soft overlay). Default: auto — the stage the particle just reached pulses. */
  activeStage?: number;
  /** Exit branch leaving the loop to a red card. */
  exit?: AgentLoopExit;
  /** Stage whose outgoing arc turns ROLE.orange (error result travelling the same loop); object form sets the tag text (default 'KẾT QUẢ LỖI'). */
  errorStage?: number | { stage: number; label?: string };
  /** Center label, 24/700 accentStrong (e.g. 'VÒNG ReAct'). */
  center?: string;
  /** Center second line, 17/600 muted. */
  centerSub?: string;
  /** SVG drawn translated to the loop center (below the center label) — e.g. a StepCounter at local (0, 0). */
  counterSlot?: ReactNode;
  /** Stage label size. Default 24. */
  fontSize?: number;
  /** Angle of stage 0 in degrees. Default −90 (top). */
  startAngle?: number;
  opacity?: number;
  /** MINH HỌA tag (true | label). Default false — structural diagram. */
  illustrative?: boolean | string;
  /** Extra overlays (StopGate, StepCounter, notes) drawn on top. */
  children?: ReactNode;
}
export declare const AgentLoop: FC<AgentLoopProps>;

/** Center + card box of stage `i` for the same props — anchor overlays / connectors to a stage. */
export declare function loopStagePoint(
  props: AgentLoopProps,
  i: number,
): { x: number; y: number; box: { x: number; y: number; w: number; h: number } };
