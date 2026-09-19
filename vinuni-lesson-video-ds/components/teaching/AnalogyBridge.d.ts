import type { FC } from 'react';

export interface AnalogySide {
  title: string;
  sub?: string;
}
export interface AnalogyBridgeProps {
  x: number;
  /** Top of both cards; the arc rises 105 px above it (keep y ≥ 400). */
  y: number;
  /** Default 1320 (two cards, 220 px apart). */
  w?: number;
  /** Card height. Default 220. */
  h?: number;
  everyday: AnalogySide;
  concept: AnalogySide;
  /** 0–1 fade of the concept card. */
  reveal?: number;
  /** 0–1 draw of the arc; its label fades in over the last third. */
  bridge?: number;
  /** Default 'ĐỜI THƯỜNG'. */
  everydayLabel?: string;
  /** Default 'KHÁI NIỆM'. */
  conceptLabel?: string;
  /** Default 'GIỐNG NHƯ'. */
  bridgeLabel?: string;
  opacity?: number;
}
export declare const AnalogyBridge: FC<AnalogyBridgeProps>;
