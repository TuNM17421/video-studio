# BranchRouter

One input splitting into N labeled, color-coded routes, with the chosen route traveled by a particle.

**Use for** "ba làn đường xanh/vàng/đỏ" (độ tin cậy CAO → tự động, TRUNG BÌNH → người duyệt, THẤP → từ chối),
"ngã tư với 4 biển chỉ dẫn" (happy / edge / error / fallback), "ghi chi ngã ba đường ray", "trả lời ngay hay gọi tool".
**Not for** a single yes/no question drawn as a diamond (→ `DecisionNode`), a linear pipeline (→ `Flow`),
actor lanes (→ `Swimlane`).

Anatomy: source dot at (x, y) · each branch = monotone S-curve (curvePath) to `(x + length, y + k·spread)`,
5 px track in its `tone`, a white label pill above the straight run, arrowhead into a destination chip (soft
tone fill, tone stroke, 22/700 text) · `branchGeometry(props)` exposes paths / chips for extra marks.

Motion: `active` = chosen index. With `frame`: chosen path draws on (drawOn) from `start` to `end` with a red
particle (hidden 18 px from each end), other branches dim to 35 % in 12 f, chosen chip pulses at `end` and
keeps a 5 px stroke. No `frame` → settled. No `active` → all branches full, accent trunk.

```jsx
<Flow points={[anchor(MODEL, 'right'), { x: 760, y: 600 }]} frame={frame} start={20} end={50} arrow={false} />
<BranchRouter x={760} y={600} spread={170} length={560} destW={300} active={1} frame={frame} start={60} end={110}
  branches={[
    { label: 'CAO ≥ 0,9', dest: 'TỰ ĐỘNG GỬI', tone: 'output' },
    { label: 'TRUNG BÌNH', dest: 'NGƯỜI DUYỆT', tone: 'memory' },
    { label: 'THẤP < 0,6', dest: 'TỪ CHỐI', tone: 'red' },
  ]} />
<IllustrativeStamp x={1800} y={880} anchor="top-right" />
```

Rules: 2–5 branches · tones are role outlines only; the particle is always red (chosen) · thresholds/numbers
are illustrative → add `MINH HỌA` · keep `spread` ≥ 110 so label pills don't collide · feed the input with a
`Flow` ending exactly at (x, y) with `arrow={false}`.
