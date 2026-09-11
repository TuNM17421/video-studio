import type { FC } from 'react';

export interface ToolParam {
  /** Parameter name, shown in MONO: 'ma_lop'. */
  name: string;
  /** Short type in Vietnamese: 'chuỗi', 'số', 'ngày', 'email'. */
  type?: string;
  /** Required → red dot + red-tinted chip stroke. */
  required?: boolean;
}

export interface ToolCardProps {
  /** Top-left corner, scene px. */
  x: number;
  y: number;
  /** Width. Default 560 (use ≥ 620 for 3 params + a one-line description). */
  w?: number;
  /** Height. Default: auto from content (see toolCardHeight). */
  h?: number;
  /** Tool name, snake_case, rendered in MONO in the name bar: 'tra_han_nop'. */
  name: string;
  /** "LÀM VIỆC GÌ?" — one sentence; wraps automatically (or pass pre-split lines). */
  does: string | readonly string[];
  /** "CẦN THÔNG TIN GÌ?" — parameter chips, wrapped into rows. */
  inputs?: readonly ToolParam[];
  /** "TRẢ VỀ GÌ?" — what the tool returns. */
  returns?: string | readonly string[];
  /** 'default' | 'active' (being called) | 'disabled' (not permitted, lock) | 'error' (call failed). */
  state?: 'default' | 'active' | 'disabled' | 'error';
  /** Error message shown in red instead of the return zone when state = 'error'. */
  errorText?: string | readonly string[];
  /** Scene frame — with `at`, the active glow pulses once (54 f). */
  frame?: number;
  /** Frame the call arrives (pulse peak ≈ at + 17). */
  at?: number;
  opacity?: number;
  /** MINH HỌA tag inside the name bar (true | label). Default false — a declaration is structural. */
  illustrative?: boolean | string;
  /** Override the three zone headings. */
  labels?: { does: string; inputs: string; returns: string };
}
export declare const ToolCard: FC<ToolCardProps>;
/** Auto height the card will use for these props. */
export declare function toolCardHeight(props: Pick<ToolCardProps, 'w' | 'does' | 'inputs' | 'returns' | 'errorText' | 'state'>): number;
