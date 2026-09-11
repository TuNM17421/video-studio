import type { FC } from 'react';

export type ApprovalState = 'waiting' | 'approved' | 'rejected' | 'edited';

export interface ApprovalStepProps {
  /** Top-left x. */
  x: number;
  /** Top-left y. */
  y: number;
  /** Default 440. */
  w?: number;
  /** Default 260. */
  h?: number;
  /** Draft title, 24/700 sentence case: "Thư trả lời khách". */
  title?: string;
  /** ≤ 2 lowercase body lines (20/500 muted); extra lines are dropped. */
  lines?: readonly string[];
  /** Footer micro label with a user-check icon: "Người duyệt: Minh". */
  reviewer?: string;
  /** Action button text, uppercase. Default 'GỬI' (or 'LƯU'). */
  action?: string;
  /** waiting (amber, button locked) · approved (green, unlocks) · rejected (red, stays locked) · edited (purple, unlocks). Default 'waiting'. */
  state?: ApprovalState;
  /** Override the header status text (defaults: CHỜ DUYỆT · ĐÃ DUYỆT · TỪ CHỐI · ĐÃ SỬA · DUYỆT). */
  statusLabel?: string;
  /** Current frame; with `at`, shows 'waiting' before `at` and `state` after it. Omit for the settled state. */
  frame?: number;
  /** Frame of the reviewer's decision → card pulse + button pop (popScale) when it unlocks. */
  at?: number;
  opacity?: number;
  /** Top-right MINH HỌA tag (true or custom label). Default false; pass true for mock drafts. */
  illustrative?: boolean | string;
}
export declare const ApprovalStep: FC<ApprovalStepProps>;
/** state → [hue, header LineIcon, default status label, action unlocked]. */
export declare const APPROVAL_STATES: Readonly<Record<ApprovalState, readonly [string, string, string, boolean]>>;
