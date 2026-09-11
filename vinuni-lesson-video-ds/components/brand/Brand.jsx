import React from 'react';
import { C } from '../../lib/tokens.js';
import { SvgText } from '../text/Text.jsx';
import {
  siAnthropic,
  siClaude,
  siGithub,
  siGooglegemini,
  siHuggingface,
  siMeta,
  siModelcontextprotocol,
  siPython,
} from 'simple-icons';

/**
 * Official product logos — nominative use only (to NAME the product the lesson talks about).
 * SVG drawings come from Simple Icons (CC0 for the drawing); the marks themselves stay trademarks of
 * their owners: never recolor to the kit palette, never distort, never place beside the VinUni mark
 * as if partnered, and credit "™ thuộc về chủ sở hữu" in the video credits.
 * Not included on purpose: OpenAI / ChatGPT and Microsoft Copilot (absent from Simple Icons) — take
 * them from the owner's brand kit before use.
 */
const SOURCES = {
  anthropic: siAnthropic,
  claude: siClaude,
  gemini: siGooglegemini,
  meta: siMeta,
  huggingface: siHuggingface,
  github: siGithub,
  python: siPython,
  mcp: siModelcontextprotocol,
};

export const BRANDS = Object.freeze(
  Object.fromEntries(
    Object.entries(SOURCES).map(([k, si]) => [
      k,
      Object.freeze({
        title: si.title,
        hex: `#${si.hex}`,
        path: si.path,
        source: `https://simpleicons.org/?q=${si.slug}`,
        guidelines: si.guidelines || null,
        license: 'Drawing: CC0 (Simple Icons). Mark: trademark of its owner — nominative use only.',
      }),
    ]),
  ),
);
export const BRAND_NAMES = Object.freeze(Object.keys(BRANDS));

/**
 * Logo centered on (x, y). variant 'color' = the owner's brand color (default) · 'mono' = one
 * official-style monochrome (C.text, or `color`). `label` adds the product name under the mark.
 * @category brand
 */
export function Brand({ name, x, y, size = 64, variant = 'color', color, label, opacity = 1 }) {
  const b = BRANDS[name];
  if (!b || opacity <= 0.001) return null;
  const fill = variant === 'mono' ? color ?? C.text : b.hex;
  return (
    <g opacity={opacity < 1 ? opacity : undefined}>
      <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox="0 0 24 24" overflow="visible">
        <path d={b.path} fill={fill} />
      </svg>
      {label ? (
        <SvgText x={x} y={y + size / 2 + 30} size={20} weight={700} color={C.text}>
          {label === true ? b.title : label}
        </SvgText>
      ) : null}
    </g>
  );
}
