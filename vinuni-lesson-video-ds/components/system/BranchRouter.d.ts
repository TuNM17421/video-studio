import type { FC } from 'react';

export interface RouterBranch {
  /** Uppercase pill above the track: 'CAO ≥ 0,9', 'TRUNG BÌNH', 'LỖI'. */
  label?: string;
  /** Destination chip text: 'TỰ ĐỘNG GỬI', 'NGƯỜI DUYỆT'. */
  dest?: string;
  /** Track / pill / chip color: ROLE_OF name ('output' green, 'memory' amber, 'check' orange…), 'red', C token name or hex. Default accent. */
  tone?: string;
}

export interface BranchRouterProps {
  /** SOURCE point (where the input arrives), scene px. Branches fan out to the right. */
  x: number;
  y: number;
  /** 2–5 branches, top to bottom. */
  branches: readonly RouterBranch[];
  /** Vertical distance between branch ends. Default 150. */
  spread?: number;
  /** Horizontal distance from source to the destination chips. Default 460. */
  length?: number;
  /** Fixed destination chip width (default: fits each dest). */
  destW?: number;
  /** Index of the chosen branch. Omit → all branches full strength, no travel. */
  active?: number;
  /** Scene frame. Omit → settled (chosen branch fully drawn). */
  frame?: number;
  /** Frame the red particle leaves the source on the chosen branch. Default 0. */
  start?: number;
  /** Frame it arrives (chosen chip pulses). Default 45. */
  end?: number;
  opacity?: number;
  /** Optional bold label left of the source dot: 'CA KIỂM THỬ'. */
  sourceLabel?: string;
}
export declare const BranchRouter: FC<BranchRouterProps>;
/** Per-branch geometry: SVG path d, end point, destination chip box, label anchor. */
export declare function branchGeometry(
  props: Pick<BranchRouterProps, 'x' | 'y' | 'branches' | 'spread' | 'length' | 'destW'>,
): { d: string; end: { x: number; y: number }; dest: { x: number; y: number; w: number; h: number }; labelAt: { x: number; y: number } }[];
