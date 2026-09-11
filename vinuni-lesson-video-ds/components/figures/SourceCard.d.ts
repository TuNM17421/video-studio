import type { FC } from 'react';

export interface SourceCardProps {
  x: number;
  y: number;
  /** Card width; the excerpt word-wraps to it. */
  w: number;
  /** Height. Default auto-fits title, page, excerpt and chip. */
  h?: number;
  /** Source title, 20/700 ("Quy chế học vụ 2026 · Điều 12", "Liu et al. · Lost in the Middle"). */
  title?: string;
  /** Page reference, 17/700 muted ("[Trang 15]"). */
  page?: string;
  /** Short quoted excerpt (quotes are added). Omit on an unverified card → empty dashed lines. */
  excerpt?: string;
  /** Substring of `excerpt` drawn on a marker band. */
  highlight?: string;
  /** Marker band tone. Default 'amber'. */
  highlightTone?: 'amber' | 'accent';
  /** verified (green, "ĐÃ ĐỐI CHIẾU") · unverified (red dashed, "KHÔNG CÓ NGUỒN") · neutral (accent, no chip). Default 'neutral'. */
  state?: 'verified' | 'unverified' | 'neutral';
  /** Override the chip text. */
  chipLabel?: string;
  /** MINH HỌA tag top-right (true | label). Default false — set it for made-up sources. Keep the title short then. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const SourceCard: FC<SourceCardProps>;
export declare const SOURCE_STATES: Readonly<Record<'verified' | 'unverified' | 'neutral', readonly (string | null)[]>>;
