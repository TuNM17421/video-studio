import type { FC } from 'react';

export interface StopGateProps {
  /** Center x of the octagon. */
  x: number;
  /** Center y of the octagon. */
  y: number;
  /** 17/700 uppercase label under the octagon. Presets pick the icon: 'HẾT BƯỚC' · 'ĐỦ 3 LẦN' · 'CẦN NGƯỜI' · 'HẾT GIỜ'. */
  label?: string;
  /** Optional lowercase line under the label (17/500 muted): "tối đa 10 bước". */
  detail?: string;
  /** LineIcon name inside the octagon; overrides the preset (fallback 'x'). */
  icon?: string;
  /** true / 0–1 → red-soft fill, 5 px red stroke, red icon + label. Default idle. */
  triggered?: boolean | number;
  /** Current frame; with `at` (and no `triggered`) the gate triggers at `at`, with a pulse halo. */
  frame?: number;
  /** Frame the condition fires → 54-frame pulse ring. */
  at?: number;
  opacity?: number;
  /** Octagon circumradius. Default 48. */
  r?: number;
}
export declare const StopGate: FC<StopGateProps>;
/** Label → LineIcon for the four script stop conditions. */
export declare const STOP_PRESETS: Readonly<Record<string, string>>;
