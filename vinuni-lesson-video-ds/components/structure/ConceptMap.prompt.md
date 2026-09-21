# ConceptMap

3–6 concepts and the named relations between them. Node positions are fractions (`cx`, `cy` 0–1) of the
map box. `strong` = hub (accent stroke), `accent` = conclusion (red). Edges carry an arrowhead and a
short verb label (SINH RA, RÀNG BUỘC, DẪN TỚI).

Build in narration order with `nodeReveal` / `edgeReveal`; both ends of an edge must be visible before
it draws. Keep nodes ≥ 300 px apart horizontally or ≥ 130 px vertically.

```jsx
<ConceptMap x={560} y={300} w={800} h={520}
  nodes={[{ cx: 0.1, cy: 0.06, label: 'DỮ LIỆU' }, { cx: 0.9, cy: 0.06, label: 'QUY TẮC' },
    { cx: 0.5, cy: 0.5, label: 'MÔ HÌNH', strong: true }, { cx: 0.5, cy: 0.94, label: 'KẾT QUẢ', accent: true }]}
  edges={[{ from: 0, to: 2, label: 'SINH RA' }, { from: 1, to: 2, label: 'RÀNG BUỘC' }, { from: 2, to: 3, label: 'DẪN TỚI', accent: true }]} />
```
