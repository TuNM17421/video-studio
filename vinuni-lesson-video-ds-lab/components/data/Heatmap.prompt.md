# Heatmap

Matrix / attention map: `rows × cols` cells (radius 4) filled with ONE palette color (red by default)
at 8–100 % alpha; `value(r, c)` returns 0–1. `reveal` scales every value continuously from 0.

```jsx
<Heatmap x={980} y={130} rows={6} cols={6} cell={44} gap={6}
  value={(r, c) => (c > r ? 0 : 1 - (r - c) * 0.17)}
  rowLabels={['Tôi', 'đi', 'học', 'ở', 'trường', 'xa']} colLabels={['Tôi', 'đi', 'học', 'ở', 'trg', 'xa']} />
```

Label axes (14 px muted). Values are illustrative unless sourced — say so.
