export type RigRegion = 'body' | 'head' | 'face' | 'armL' | 'armR';
export type Poly = ReadonlyArray<readonly [number, number]>;

export declare const SHARED_MIN_AREA: number;
/** Polygon của bốn vùng xoay. Chúng CHỒNG nhau có chủ ý — hở là vỡ, xem chú thích trong .js. */
export declare const RIG_POLYS: Readonly<Record<Exclude<RigRegion, 'body'>, Poly>>;
export declare const RIG_JOINTS: Readonly<Record<RigRegion, readonly [number, number]>>;
export declare const REGION_ORDER: readonly RigRegion[];
export declare const JOINT_PATCHES: readonly { name: string; cx: number; cy: number; r: number }[];
/** Lỗ của mask thân (đã co lại). Dùng mask chứ không dùng clip-path — xem chú thích trong .js. */
export declare const BODY_MASK_HOLES: readonly string[];
export declare function polyToPath(poly: Poly): string;
/** Chia artwork thành năm vùng; `shared` là các path lớn vẽ lại ở mọi vùng. */
export declare function buildRegions(paths: ReadonlyArray<[string, string, string, string]>):
  Record<RigRegion | 'shared', number[]>;
