import type { FC } from 'react';

export type EnvelopeSlotKind = 'system' | 'user' | 'message' | 'tool' | 'doc' | 'output';

export interface EnvelopeSlot {
  /** Short slot text, 21/600 ("Vai trò: trợ lý học vụ"). Keep ≤ ~28 chars at w 540. */
  label: string;
  /** Role of the block → stroke/soft fill + right-aligned kind tag (HỆ THỐNG, NGƯỜI DÙNG, CÔNG CỤ, TÀI LIỆU…). */
  kind?: EnvelopeSlotKind;
  /** 'red' marks a risky block (injected text, leaked data). */
  tone?: 'red';
  /** Override the kind tag text. */
  tag?: string;
}
export interface EnvelopeOutsideItem {
  /** What stays behind (NOT sent), e.g. "Lịch sử chat tháng trước". */
  label: string;
}
export interface EnvelopeProps {
  /** Body left (scene px). */
  x: number;
  /** Body top. The open flap rises 64 px above it. */
  y: number;
  w: number;
  h: number;
  /** Header label. Default 'GÓI GỬI ĐI'. */
  label?: string;
  /** Stacked blocks inside the payload, top-down. */
  slots?: readonly EnvelopeSlot[];
  /** Items NOT sent — dashed, muted cards right of the body with a red "KHÔNG GỬI" chip. */
  outside?: readonly EnvelopeOutsideItem[];
  /** Alias of `outside`. */
  left?: readonly EnvelopeOutsideItem[];
  /** Width of the outside cards. Default 300 (placed 40 px right of the body). */
  outsideW?: number;
  /** Chip text on outside items. Default 'KHÔNG GỬI'. */
  outsideLabel?: string;
  /** Slot height. Default fits h (max 66). */
  slotH?: number;
  /** Flap folded down + red seal disc. */
  sealed?: boolean;
  /** Scene frame; with `at` animates sealing (flap at…at+18) and the send pulse after it. */
  frame?: number;
  /** Frame the flap starts closing. */
  at?: number;
  /** With `frame`: slot i appears at start + i·per. Omit = all slots visible. */
  start?: number;
  /** Stagger between slots. Default 8. */
  per?: number;
  /** MINH HỌA tag top-right (true | label). Default false (structural). */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const Envelope: FC<EnvelopeProps>;
/** Slot i box {x, y, w, h} for connectors (pass the same props as the Envelope). */
export declare function envelopeSlot(props: Pick<EnvelopeProps, 'x' | 'y' | 'w' | 'h' | 'slots' | 'slotH'>, i: number): { x: number; y: number; w: number; h: number };
export declare const ENVELOPE_KINDS: Readonly<Record<EnvelopeSlotKind, readonly [string, string, string]>>;
