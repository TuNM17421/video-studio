#!/usr/bin/env python3
"""
Sinh components/whiteboard/stickman.js từ tấm ảnh người que gốc.

Ảnh gốc là raster (không phải vector) nên không nhập thẳng làm doodle được. Script:
  1. tách từng hình trên tấm ảnh (connected component; mảnh nhỏ — bàn tay rời, bong bóng —
     gán vào hình gần nhất),
  2. làm mảnh nét về nét giữa (Zhang–Suen), tách thành các đường rồi giản lược (Douglas–Peucker),
  3. quy về lưới 24×24 đúng như icon Lucide, để `kind: 'doodle'` dùng được không cần code mới.

Tên hình, hình bị loại và mọi tham số nằm ở tools/stickman-assets.json — đừng sửa tay file .js sinh ra.

    python3 tools/stickman-assets.py [--src <ảnh>] [--check <thư mục>]

`--check` ghi thêm một tấm SVG xem thử (đánh số theo chỉ số hình) để soát lại khi đổi tham số.
"""
import argparse, json, math, os, sys
from collections import deque

try:
    from PIL import Image
except ImportError:
    sys.exit('cần Pillow: pip install pillow')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONF = os.path.join(ROOT, 'tools', 'stickman-assets.json')
OUT = os.path.join(ROOT, 'vinuni-lesson-video-ds', 'components', 'whiteboard', 'stickman.js')


def components(ink, w, h, floor):
    """Vùng mực liên thông (8 hướng), bỏ vùng nhỏ hơn `floor` điểm ảnh."""
    seen = [[False] * w for _ in range(h)]
    out = []
    for y in range(h):
        for x in range(w):
            if not ink[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            pts = []
            while q:
                cx, cy = q.popleft()
                pts.append((cx, cy))
                for dx in (-1, 0, 1):
                    for dy in (-1, 0, 1):
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h and ink[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
            if len(pts) >= floor:
                xs = [p[0] for p in pts]
                ys = [p[1] for p in pts]
                out.append({'pts': pts, 'x0': min(xs), 'x1': max(xs), 'y0': min(ys), 'y1': max(ys), 'n': len(pts)})
    return out


def figures(comps, big):
    """Vùng lớn = một người; vùng nhỏ nhập vào người gần nhất. Xếp theo hàng rồi theo trái→phải."""
    figs = [dict(c, pts=list(c['pts'])) for c in comps if c['n'] >= big]
    for s in (c for c in comps if c['n'] < big):
        def gap(f):
            dx = max(0, max(s['x0'] - f['x1'], f['x0'] - s['x1']))
            dy = max(0, max(s['y0'] - f['y1'], f['y0'] - s['y1']))
            return dx * dx + dy * dy
        f = min(figs, key=gap)
        f['pts'] += s['pts']
        f['x0'], f['x1'] = min(f['x0'], s['x0']), max(f['x1'], s['x1'])
        f['y0'], f['y1'] = min(f['y0'], s['y0']), max(f['y1'], s['y1'])
    figs.sort(key=lambda f: (round((f['y0'] + f['y1']) / 2 / 100), f['x0']))
    return figs


def thin(g, w, h):
    """Zhang–Suen: nét dày co về nét giữa rộng một điểm ảnh."""
    def nb(x, y):
        return [g[y - 1][x], g[y - 1][x + 1], g[y][x + 1], g[y + 1][x + 1],
                g[y + 1][x], g[y + 1][x - 1], g[y][x - 1], g[y - 1][x - 1]]
    while True:
        gone = False
        for step in (0, 1):
            drop = []
            for y in range(1, h - 1):
                for x in range(1, w - 1):
                    if not g[y][x]:
                        continue
                    p = nb(x, y)
                    if not 2 <= sum(p) <= 6:
                        continue
                    if sum(1 for i in range(8) if p[i] == 0 and p[(i + 1) % 8] == 1) != 1:
                        continue
                    P2, P3, P4, P5, P6, P7, P8, P9 = p
                    if (P2 * P4 * P6 or P4 * P6 * P8) if step == 0 else (P2 * P4 * P8 or P2 * P6 * P8):
                        continue
                    drop.append((x, y))
            if drop:
                gone = True
                for x, y in drop:
                    g[y][x] = 0
        if not gone:
            return g


def polylines(g, w, h):
    """Nét giữa → các đường. Lân cận chéo bị bỏ nếu đã đi được bằng hai bước thẳng, nếu không
    một nét chéo sẽ sinh hàng loạt nút giả và đường bị cắt vụn."""
    on = {(x, y) for y in range(h) for x in range(w) if g[y][x]}

    def nbrs(p):
        x, y = p
        E, W_, N, S = (x + 1, y) in on, (x - 1, y) in on, (x, y - 1) in on, (x, y + 1) in on
        cand = [((x, y - 1), True), ((x + 1, y), True), ((x, y + 1), True), ((x - 1, y), True),
                ((x + 1, y - 1), not (E or N)), ((x + 1, y + 1), not (E or S)),
                ((x - 1, y + 1), not (W_ or S)), ((x - 1, y - 1), not (W_ or N))]
        return [q for q, ok in cand if ok and q in on]

    nodes = {p for p in on if len(nbrs(p)) != 2}
    used, lines = set(), []

    def walk(a, b):
        path = [a, b]
        used.add(frozenset((a, b)))
        while b not in nodes:
            nxt = [q for q in nbrs(b) if q != path[-2] and frozenset((b, q)) not in used]
            if not nxt:
                break
            b = nxt[0]
            used.add(frozenset((path[-1], b)))
            path.append(b)
        return path

    for a in nodes:
        for b in nbrs(a):
            if frozenset((a, b)) not in used:
                lines.append(walk(a, b))
    for p in on:  # vòng kín không có nút nào
        for q in nbrs(p):
            if frozenset((p, q)) not in used:
                path = walk(p, q)
                if path[-1] != p:
                    path.append(p)
                lines.append(path)
    return lines


def rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy) or 1
    worst, idx = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L
        if d > worst:
            worst, idx = d, i
    if worst <= eps:
        return [a, b]
    return rdp(pts[:idx + 1], eps)[:-1] + rdp(pts[idx:], eps)


def trace(fig, px, conf):
    """Một người → danh sách path data trên lưới `grid`."""
    t = conf['trace']
    x0, y0, x1, y1 = fig['x0'], fig['y0'], fig['x1'], fig['y1']
    w, h = x1 - x0 + 3, y1 - y0 + 3
    g = [[0] * w for _ in range(h)]
    for x, y in fig['pts']:
        g[y - y0 + 1][x - x0 + 1] = 1
    thin(g, w, h)
    lines = [l for l in polylines(g, w, h) if len(l) >= 3]

    def touches(a, b):
        return any(abs(p[0] - q[0]) <= 2 and abs(p[1] - q[1]) <= 2 for p in a for q in b)
    keep = []
    for i, l in enumerate(lines):
        long = sum(math.dist(l[k], l[k + 1]) for k in range(len(l) - 1)) >= 0.10 * math.hypot(w, h)
        if long or any(touches(l, o) for j, o in enumerate(lines) if j != i and len(o) >= 5):
            keep.append(l)
    lines = [l for l in keep if len(l) >= 4]

    grid = t['grid']
    span = grid - 2 * t['inset']
    k = span / max(x1 - x0, y1 - y0, 1)
    ox = (grid - (x1 - x0) * k) / 2
    oy = (grid - (y1 - y0) * k) / 2
    out = []
    for l in lines:
        pts = rdp([(p[0] - 1, p[1] - 1) for p in l], t['simplify'])
        grid_pts = [(round(ox + p[0] * k, 2), round(oy + p[1] * k, 2)) for p in pts]
        # bo diem trung nhau: mot path dai 0 lam getPointAtLength nem loi khi but di theo net
        dedup = [grid_pts[0]]
        for q in grid_pts[1:]:
            if q != dedup[-1]:
                dedup.append(q)
        if len(dedup) < 2:
            continue
        if sum(math.dist(dedup[i], dedup[i + 1]) for i in range(len(dedup) - 1)) < 1.0:
            continue
        out.append('M' + ' L'.join(f'{q[0]} {q[1]}' for q in dedup))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src')
    ap.add_argument('--check')
    args = ap.parse_args()
    conf = json.load(open(CONF, encoding='utf-8'))
    src = os.path.expanduser(args.src or conf['source']['file'])
    if not os.path.exists(src):
        sys.exit(f'không thấy ảnh gốc: {src}\n(ảnh gốc không nằm trong git — xem assets/stickman/README.md)')

    t = conf['trace']
    im = Image.open(src).convert('L')
    W, H = im.size
    px = im.load()
    ink = [[1 if (y >= t['top'] and px[x, y] < t['threshold']) else 0 for x in range(W)] for y in range(H)]
    figs = figures(components(ink, W, H, t['minComponent']), t['figureComponent'])
    print(f'{len(figs)} hình trên tấm ảnh', file=sys.stderr)

    traced = [trace(f, px, conf) for f in figs]
    names = conf['figures']
    kept = [(names[str(i)], d) for i, d in enumerate(traced) if str(i) in names]
    missing = [i for i in names if int(i) >= len(traced)]
    if missing:
        sys.exit(f'cấu hình trỏ tới hình không có trên ảnh: {missing}')

    body = ',\n'.join(
        f"  '{name}': [{', '.join(chr(91) + chr(39) + 'path' + chr(39) + ', { d: ' + chr(39) + d + chr(39) + ' }]' for d in paths)}]"
        for name, paths in kept)
    js = f"""/**
 * Người que — {len(kept)} tư thế lấy từ tấm ảnh gốc (xem assets/stickman/README.md, giấy phép ở đó).
 *
 * SINH BỞI tools/stickman-assets.py TỪ tools/stickman-assets.json — ĐỪNG SỬA TAY.
 * Thêm / bớt tư thế hay đổi tên: sửa `figures` trong json rồi chạy lại script.
 *
 * Mỗi tư thế là nét giữa của hình gốc, quy về lưới 24×24 y như icon Lucide, nên nó được trộn thẳng
 * vào DOODLES: dùng bằng `kind: 'doodle', name: 'nguoi-…'` (hoặc WbIconLabel) như mọi hình khác,
 * `roughenPath` vẫn làm nhăn thành nét tay và bút vẫn vẽ dần.
 */
export const STICKMEN = Object.freeze({{
{body},
}});

/** Tên các tư thế, cho tài liệu và trang xem thử. */
export const STICKMAN_NAMES = Object.freeze(Object.keys(STICKMEN));
"""
    open(OUT, 'w', encoding='utf-8').write(js)
    print(f'{OUT}: {len(kept)} tư thế', file=sys.stderr)

    if args.check:
        os.makedirs(args.check, exist_ok=True)
        cell, cols = 230, 5
        rows = (len(traced) + cols - 1) // cols
        svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{cols * cell}" height="{rows * cell}">'
               f'<rect width="100%" height="100%" fill="#fff"/>']
        for i, paths in enumerate(traced):
            cx, cy = (i % cols) * cell, (i // cols) * cell
            label = names.get(str(i), 'BỎ')
            svg.append(f'<g transform="translate({cx + 20} {cy + 16}) scale({(cell - 40) / t["grid"]})" fill="none" '
                       f'stroke="#0b2a4d" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">')
            svg += [f'<path d="{d}"/>' for d in paths]
            svg.append(f'</g><text x="{cx + cell / 2}" y="{cy + cell - 6}" font-size="14" text-anchor="middle" '
                       f'fill="#c72127">#{i} {label}</text>')
        svg.append('</svg>')
        path = os.path.join(args.check, 'stickman-check.svg')
        open(path, 'w', encoding='utf-8').write('\n'.join(svg))
        print(path, file=sys.stderr)


if __name__ == '__main__':
    main()
