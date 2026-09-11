import type { FC } from 'react';

export type CodeLanguage = 'js' | 'ts' | 'json' | 'python' | 'py' | 'shell' | 'bash' | 'sh' | (string & {});
export type CodeTokenType = 'key' | 'keyword' | 'string' | 'number' | 'literal' | 'fn' | 'punct' | 'comment' | 'plain';

export interface CodeBlockProps {
  /** Left edge in scene px. */
  x: number;
  /** Top edge in scene px. */
  y: number;
  /** Card width. Default 900. Lines longer than the card are cut with "…". */
  w?: number;
  /** Card height. Default: auto = header 58 + 36 + lines × round(fontSize × 1.45). */
  h?: number;
  /** The snippet; lines separated by \n. */
  code: string;
  /** Tokenizer + language chip. json (keys) · js/ts (// comments) · python / shell (# comments). Default 'js'. */
  language?: CodeLanguage;
  /** Filename in the header bar (mono 19, textMuted), e.g. "tools/cong_hai_so.py". */
  title?: string;
  /** 1-based line numbers to highlight (band + 6 px left marker). */
  highlight?: readonly number[];
  /** Highlight color: 'red' (red-soft band, red marker — default) or 'accent' (accent tint band, accent marker). */
  tone?: 'red' | 'accent';
  /** Dim non-highlighted lines to 38 % when `highlight` is set. Default true. */
  dim?: boolean;
  /** Frame at which the highlight band + dim fade in (18 f). Needs `frame`. Default: shown immediately. */
  highlightAt?: number;
  /** Scene frame. When set, the whole text types in (grapheme-safe) from `start`; omit for the settled state. */
  frame?: number;
  /** Typing start frame. Default 0. */
  start?: number;
  /** Typing speed, characters per second at 30 fps. Default 30. */
  cps?: number;
  /** Code size in px. Default 22 (line height × 1.45). */
  fontSize?: number;
  /** Show the line-number gutter. Default true. */
  lineNumbers?: boolean;
  /** Show the language chip in the header. Default true. */
  showLanguage?: boolean;
  /** MINH HỌA corner tag (true | custom label). Default false — pass true for mock / not-run code. */
  illustrative?: boolean | string;
  opacity?: number;
}
export declare const CodeBlock: FC<CodeBlockProps>;

export interface CodeToken {
  text: string;
  type: CodeTokenType;
}
/** Deterministic one-line tokenizer used by CodeBlock / JsonView. */
export declare function tokenizeLine(line: string, language?: CodeLanguage): CodeToken[];
/** Palette-only syntax mapping: key/keyword accentStrong 700 · string accent 600 · number/literal red 600 · fn text 700 · punct textMuted 500 · comment textMuted 80 % · plain text 500. */
export declare const CODE_COLORS: Readonly<Record<CodeTokenType, { color: string; weight: number; opacity?: number }>>;
/** Auto height of a CodeBlock for the given props. */
export declare function codeBlockHeight(props: Pick<CodeBlockProps, 'code' | 'fontSize' | 'title' | 'language' | 'illustrative' | 'showLanguage'>): number;
