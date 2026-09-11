import type { FC } from 'react';

export interface DecisionNodeProps {
  /** CENTER of the diamond, scene px. */
  x: number;
  y: number;
  /** Tip-to-tip diagonal. Default 220 (fits 2 lines of ~12 chars at 21 px). */
  size?: number;
  /** Uppercase question; array = explicit line breaks: ['ĐỦ', 'THÔNG TIN?']. */
  label?: string | readonly string[];
  /** 'inside' (default) or 'below' (circle-help icon inside, question under the bottom tip). */
  labelPos?: 'inside' | 'below';
  /** 'idle' | 'active' (deciding: red, pulses once with frame/at) | 'resolved' (shows `answer`). */
  state?: 'idle' | 'active' | 'resolved';
  /** Chosen branch label for the resolved state: 'CÓ', 'CHƯA ĐỦ'. */
  answer?: string;
  /** Tip the answer chip sits by. Default 'right'. */
  answerSide?: 'top' | 'right' | 'bottom' | 'left';
  /** Scene frame (with `at` → one 54 f pulse). */
  frame?: number;
  at?: number;
  /** Stroke color: ROLE_OF name ('check'…), C token name or hex. Default accent. */
  tone?: string;
  opacity?: number;
  /** 0–1: dims to 36 %. */
  muted?: number;
}
export declare const DecisionNode: FC<DecisionNodeProps>;
/** The diamond's four tips. */
export declare function decisionPorts(props: { x: number; y: number; size?: number }): {
  top: { x: number; y: number };
  right: { x: number; y: number };
  bottom: { x: number; y: number };
  left: { x: number; y: number };
};
