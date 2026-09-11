import type { FC } from 'react';

export type BrandName = 'anthropic' | 'claude' | 'gemini' | 'meta' | 'huggingface' | 'github' | 'python' | 'mcp';

export interface BrandProps {
  name: BrandName;
  /** Center x (scene px). */
  x: number;
  /** Center y (scene px). */
  y: number;
  /** Mark size in px. Default 64. */
  size?: number;
  /** 'color' = the owner's brand color (default) · 'mono' = single color (C.text or `color`). Never recolor to the kit palette. */
  variant?: 'color' | 'mono';
  /** Only with variant 'mono'. */
  color?: string;
  /** true = the product's official name under the mark; a string overrides it. */
  label?: boolean | string;
  opacity?: number;
}
export declare const Brand: FC<BrandProps>;
export interface BrandInfo {
  title: string;
  hex: string;
  path: string;
  source: string;
  guidelines: string | null;
  license: string;
}
export declare const BRANDS: Readonly<Record<BrandName, BrandInfo>>;
export declare const BRAND_NAMES: readonly BrandName[];
