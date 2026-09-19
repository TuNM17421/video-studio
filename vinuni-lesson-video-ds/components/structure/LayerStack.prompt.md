# LayerStack

Layers of one system stacked top to bottom, one pulled forward as the focus (full width, red); the rest
inset and dimmed. Use for architecture layers or layered defences.

Walk `active` through the layers as the narration names them (cut, don't tween). `active={-1}` shows
every layer equally; `reveal` builds the stack first.

```jsx
<LayerStack x={560} y={310} w={800} active={focus}
  layers={[{ label: 'LỚP 3 · GIAO DIỆN' }, { label: 'LỚP 2 · ỨNG DỤNG', sub: 'kiểm tra trước khi chạy' }, { label: 'LỚP 1 · MÔ HÌNH' }]} />
```
