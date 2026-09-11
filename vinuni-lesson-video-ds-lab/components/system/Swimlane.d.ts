import type { FC, ReactNode } from 'react';

export interface SwimlaneLane {
  /** Uppercase lane name: 'NGƯỜI DÙNG', 'ỨNG DỤNG', 'MÔ HÌNH', 'DỮ LIỆU', 'CÔNG CỤ'. */
  label: string;
  /** LineIcon name ('app-window', 'bot', 'database', 'wrench'…) or hand-drawn Icon name ('users', 'robot'). */
  icon?: string;
  /** Role color of the lane header: ROLE_OF name ('input' | 'process' | 'reasoning' | 'output' | 'check' | 'action' | 'memory'), a C token name or hex. Default accent. */
  tone?: string;
  /** Optional lowercase explanation under the label (17/500 muted), e.g. 'điều phối'. */
  sub?: string;
}

export interface SwimlaneProps {
  /** Top-left corner, scene px. */
  x: number;
  y: number;
  /** Full width including the header column. */
  w: number;
  /** Full height; each lane is h / lanes.length. */
  h: number;
  /** 3–5 lanes, top to bottom. */
  lanes: readonly SwimlaneLane[];
  /** Header column width. Default 220. */
  headerW?: number;
  /** Index of the highlighted lane (red outline, faint red tint, red label). */
  activeLane?: number;
  /** 0–1 strength of the active highlight (drive with pulse()/appear()). Default 1. */
  activeLevel?: number;
  /** Scene frame. Omit → all lanes settled. */
  frame?: number;
  /** Frame the first lane starts revealing (24 f each). Default 0. */
  start?: number;
  /** Stagger between lanes in frames. Default 10. */
  per?: number;
  opacity?: number;
  /** Cards / Flows drawn on top — place them with laneBox() / laneY(). */
  children?: ReactNode;
}
export declare const Swimlane: FC<SwimlaneProps>;

type LaneGeometry = Pick<SwimlaneProps, 'x' | 'y' | 'w' | 'h' | 'lanes' | 'headerW'>;
/** Body box of lane `index` (right of the header column). */
export declare function laneBox(props: LaneGeometry, index: number): { x: number; y: number; w: number; h: number };
/** Vertical center of lane `index`. */
export declare function laneY(props: LaneGeometry, index: number): number;
