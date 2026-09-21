# Matrix2x2

A 2 × 2 decision grid: two axes, four labelled quadrants, one highlighted. Cells and `highlight` use
reading order (0 top-left … 3 bottom-right). Axis labels are the script's words; leave ~220 px left of
`x` for the row labels.

Beats: axes + empty grid → `reveal` quadrants as named → `highlight` the one the lesson recommends.

```jsx
<Matrix2x2 x={760} y={290} size={480} highlight={1}
  axisX={['TỰ CHỦ THẤP', 'TỰ CHỦ CAO']} axisY={['RỦI RO THẤP', 'RỦI RO CAO']}
  cells={[{ label: 'TỰ ĐỘNG' }, { label: 'TỰ ĐỘNG + LOG' }, { label: 'NGƯỜI DUYỆT' }, { label: 'KHÔNG GIAO' }]} />
```
