/** Doodle name → Lucide icon node list (vendored subset). */
export declare const DOODLES: Readonly<Record<string, [string, Record<string, string | number>][]>>;
/** The doodle's elements as path data on the 24 grid. */
export declare function doodleParts(name: string): string[];
/** Hand-drawn version of `d`: sampled, jittered, rebuilt as smooth strokes (board coordinates via `map`). */
export declare function roughenPath(d: string, seed: number, opts?: { map?: (p: { x: number; y: number }) => { x: number; y: number }; amp?: number; step?: number; scale?: number }): string;
/** Doodle `name` centred on (x, y), `size` px across, turned `rotate` degrees, as one board-space path. */
export declare function sketchDoodle(m: { name: string; x: number; y: number; size?: number; rotate?: number }, seed: number): string;
