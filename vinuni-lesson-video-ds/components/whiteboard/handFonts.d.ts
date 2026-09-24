/** Key of a whiteboard handwriting font: 'playpen' (default) · 'shantell' · 'pangolin'. */
export type HandFontKey = 'playpen' | 'shantell' | 'pangolin';
export declare const HAND_DEFAULT: HandFontKey;
export declare const HAND_FONTS: Readonly<Record<HandFontKey, { family: string; label: string; weight: number; advance: Record<string, number> }>>;
