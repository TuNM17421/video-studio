# WorkStrip

A row of cells in order, each one unit of work: done, skipped, or still pending. Use it to make an
invisible machine step countable — "GPU chỉ vẽ một khung hình trên hai" is a sentence; a row where every
other cell is dashed is something the viewer can check by eye.

Not `UnitGrid`: that one is a **ratio** ("18 trên 60 lần") and may be read in any order. Here the order
is the content.

```jsx
<WorkStrip x={120} y={896} w={1680} caption="Mỗi ô là một khung hình"
  reveal={smooth(f, T.strip, T.strip + 30)}
  cells={Array.from({ length: 16 }, (_, i) => ({ state: i % 2 ? 'skip' : 'done', label: i % 2 ? 'AI' : 'GPU' }))} />
```

Rules: cells map 1-to-1 to something the narration counts — never decoration · at most 24 cells, past
that nobody counts (use `UnitGrid` for a share) · one strip per scene · keep the cell labels to one
short word · pair it with the thing the work produces, drawn above.
