import type { FC } from 'react';

export interface DayMapPart {
  /** Part number shown in the pill ("1 · Tìm khó khăn"). */
  n: number;
  /** Short label (≤ 16 characters). */
  label: string;
}

export interface DayMapZone {
  /** Uppercase zone title — one of the day's questions ("XÁC ĐỊNH VIỆC"). */
  title: string;
  /** The question in the full layout, 1–2 lines (38 px bold). */
  question: readonly string[];
  /** Parts introduced under this zone (two per zone in N2-00). */
  parts?: readonly DayMapPart[];
}

export interface DayMapProps {
  zones: readonly DayMapZone[];
  /** 0 = full layout (three 480×300 cards centered in the content zone), 1 = strip (540×96 under the header). */
  dock?: number;
  /** 0-based index across all zones of the lit part; −1 = none. */
  activePart?: number;
  /** Parts with an index ≤ visited show as done. Default: activePart − 1. */
  visited?: number;
  /** Per-zone reveal 0–1 (opening scene). */
  reveal?: readonly number[];
  /** Per-zone red pulse 0–1 (closing rhythm). */
  pulses?: readonly number[];
  /** Arrow progress 0–1 between consecutive zones (full layout only). */
  arrows?: readonly number[];
  /** 0–1 red ring around the active part pill (first scene of a part). */
  activeGlow?: number;
  opacity?: number;
}

/** The persistent "bản đồ ngày học" of a day-overview video. SVG. */
export declare const DayMap: FC<DayMapProps>;
/** Rectangle of zone i at a dock amount — use for connectors that attach to a zone. */
export declare function dayMapRect(i: number, dock?: number): { x: number; y: number; w: number; h: number };
/** Bottom edge (y = 384) of the docked strip; scene content starts at y ≥ 410. */
export declare const DAYMAP_STRIP_BOTTOM: number;
