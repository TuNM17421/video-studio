import type { FC } from 'react';

export interface ConceptNode {
  /** 0–1 across the map width. */
  cx: number;
  /** 0–1 down the map height. */
  cy: number;
  label: string;
  /** Hub: 5 px accent stroke. */
  strong?: boolean;
  /** Conclusion: redSoft fill, red stroke and label. */
  accent?: boolean;
}
export interface ConceptEdge {
  from: number;
  to: number;
  label?: string;
  /** Red 5 px edge. */
  accent?: boolean;
}
export interface ConceptMapProps {
  x: number;
  y: number;
  /** Default 800. */
  w?: number;
  /** Default 520. */
  h?: number;
  nodes: readonly ConceptNode[];
  edges?: readonly ConceptEdge[];
  /** Optional 0–1 per node. */
  nodeReveal?: readonly number[];
  /** Optional 0–1 per edge (draws source → target). */
  edgeReveal?: readonly number[];
  opacity?: number;
}
export declare const ConceptMap: FC<ConceptMapProps>;
