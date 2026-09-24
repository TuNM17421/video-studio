/** Mọi hàm trả về một path KHÉP KÍN, cùng chiều kim đồng hồ — điều kiện để morphPath nội suy sạch. */
export declare function rect(o: { x: number; y: number; w: number; h: number; r?: number; seg?: number }): string;
export declare function ellipse(o: { cx: number; cy: number; rx: number; ry: number; n?: number }): string;
export declare function circle(o: { cx: number; cy: number; r: number; n?: number }): string;
/** Mũi tên liền một nét: thân + đầu tam giác. */
export declare function arrow(o: { from: { x: number; y: number }; to: { x: number; y: number }; width?: number; head?: number; barb?: number }): string;
export declare function triangle(o: { cx: number; cy: number; r: number; rotate?: number }): string;
/** Miếng quạt (góc tính bằng độ, 0 = hướng lên). */
export declare function wedge(o: { cx: number; cy: number; r: number; from?: number; to?: number; n?: number }): string;
export declare function polygon(points: readonly ({ x: number; y: number } | [number, number])[]): string;
/** Ô thứ `i` của một dải giá trị. */
export declare function cell(o: { x: number; y: number; i: number; size?: number; gap?: number; h?: number; r?: number }): string;
/** Khung bao cả dải `n` ô — trạng thái đầu hay dùng của một phép biến hình. */
export declare function strip(o: { x: number; y: number; n: number; size?: number; gap?: number; h?: number; r?: number }): string;
