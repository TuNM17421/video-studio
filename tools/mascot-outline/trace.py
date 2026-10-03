#!/usr/bin/env python3
"""Dò bóng dáng từng vùng rig rồi in ra nội dung components/mascot/revampOutline.js.
Xem README.md cạnh file này. Chạy sau tools/mascot-outline/render-masks.mjs."""
import sys, os
DIR = sys.argv[1] if len(sys.argv) > 1 else '.'
os.chdir(DIR)
import json, math
import numpy as np
from PIL import Image

SEAMS = json.load(open('seams.json'))
RDP_EPS   = 1.6
MIN_RUN   = 22        # đoạn viền ngắn hơn ngần này thì bỏ, tránh rác
SEAM_NEAR = 26.0      # điểm biên cách ĐƯỜNG NỐI dưới ngần này thì không vẽ viền

# Chỗ không vẽ viền được lấy từ RIG_SEAMS (khai tay trong revampRig.js), không suy luận tự động.
# Đã thử hai cách suy luận và cả hai đều sai — lý do ghi ở RIG_SEAMS.

def contours(mask):
    """Moore-neighbour tracing cho mọi blob ngoài của mask nhị phân."""
    H, W = mask.shape
    seen = np.zeros_like(mask, bool)
    nbr = [(-1,0),(-1,1),(0,1),(1,1),(1,0),(1,-1),(0,-1),(-1,-1)]
    out = []
    lab = np.zeros_like(mask, np.int32)
    # flood fill để tách blob
    from collections import deque
    cur = 0
    for y in range(H):
        for x in range(W):
            if mask[y,x] and lab[y,x]==0:
                cur += 1; q=deque([(y,x)]); lab[y,x]=cur; n=0
                while q:
                    cy,cx=q.popleft(); n+=1
                    for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                        ny,nx=cy+dy,cx+dx
                        if 0<=ny<H and 0<=nx<W and mask[ny,nx] and lab[ny,nx]==0:
                            lab[ny,nx]=cur; q.append((ny,nx))
                if n < 2500: lab[lab==cur]=0; cur-=1
    for b in range(1, cur+1):
        ys,xs = np.where(lab==b)
        sy = ys.min(); sx = xs[ys==sy].min()
        start=(sy,sx); pt=start; prev=(sy,sx-1); path=[]
        for _ in range(400000):
            path.append((pt[1], pt[0]))
            di = nbr.index((prev[0]-pt[0], prev[1]-pt[1]))
            found=None
            for k in range(1,9):
                dy,dx = nbr[(di+k)%8]
                ny,nx = pt[0]+dy, pt[1]+dx
                if 0<=ny<H and 0<=nx<W and lab[ny,nx]==b:
                    found=(ny,nx); prev=(pt[0]+nbr[(di+k-1)%8][0], pt[1]+nbr[(di+k-1)%8][1]); break
            if found is None: break
            pt=found
            if pt==start and len(path)>3: break
        if len(path)>60: out.append(path)
    return out

def seg_dist(p, a, b):
    px,py=p; ax,ay=a; bx,by=b
    dx,dy=bx-ax,by-ay
    L=dx*dx+dy*dy
    t=0.0 if L==0 else max(0.0,min(1.0,((px-ax)*dx+(py-ay)*dy)/L))
    return math.hypot(px-ax-t*dx, py-ay-t*dy)

def polyline_dist(p, line):
    return min(seg_dist(p, line[i], line[i+1]) for i in range(len(line)-1))

def rdp(pts, eps):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]
    idx,dmax=0,0.0
    for i in range(1,len(pts)-1):
        d=seg_dist(pts[i],a,b)
        if d>dmax: idx,dmax=i,d
    if dmax>eps:
        return rdp(pts[:idx+1],eps)[:-1]+rdp(pts[idx:],eps)
    return [a,b]

def fmt(pts):
    return ' '.join(('M' if i==0 else 'L')+f'{x:.1f} {y:.1f}' for i,(x,y) in enumerate(pts))

res={}
for name in ['head','armL','armR']:
    mask=np.array(Image.open(f'msk-{name}.png').convert('L'))>128
    seam=[tuple(q) for q in SEAMS[name]]
    sil_parts=[]; out_parts=[]; kept_pts=0; all_pts=0
    for path in contours(mask):
        path=[p for i,p in enumerate(path) if i%2==0]          # thưa bớt
        sil_parts.append(fmt(rdp(path, RDP_EPS))+'Z')
        keep=[polyline_dist(p, seam) > SEAM_NEAR for p in path]
        all_pts+=len(path); kept_pts+=sum(keep)
        n=len(path); runs=[]; i=0
        if all(keep):
            runs=[path]
        else:
            start=next((k for k in range(n) if not keep[k]), 0)
            cur=[]
            for k in range(n):
                j=(start+k)%n
                if keep[j]: cur.append(path[j])
                else:
                    if len(cur)>=MIN_RUN: runs.append(cur)
                    cur=[]
            if len(cur)>=MIN_RUN: runs.append(cur)
        for r in runs:
            out_parts.append(fmt(rdp(r, RDP_EPS)))
    res[name]={'sil':' '.join(sil_parts), 'outline':' '.join(out_parts)}
    print(f'{name:5s} blobs {len(sil_parts)} · runs {len(out_parts)} · giữ '
          f'{kept_pts}/{all_pts} điểm biên ({100*kept_pts/max(1,all_pts):.0f}%)')
json.dump(res, open('outline.json','w'))
