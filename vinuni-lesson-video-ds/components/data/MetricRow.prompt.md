# MetricRow

The readings that belong to one case: 1–3 big numbers with their labels in a bgAlt strip. Use it under
each side of a `TwinPair`, or on its own for a spec a sentence names.

```jsx
<MetricRow x={486} y={782} w={300} lead
  items={[{ label: 'Nóng nhất', value: '39,0 °C' }, { label: 'FPS', value: '60', accent: true }]} />
<MetricRow x={960} y={520} w={420} size={44}
  items={[{ label: 'Quay 8K', value: '60 fps', delta: '×2', accent: true }]} />
```

Give each reading about 170 px of row at the default size; if the row is narrower the value shrinks to
fit its column instead of running into the next one.

Rules: sibling rows carry the **same labels in the same order** — the reader compares by column, not by
hunting · at most three items; a fourth turns a reading into a spec sheet · only the number the narration
names gets `accent` · `delta` only for a ratio the script states · `lead` marks the one case the lesson
lands on, and only one row in a pair may have it.
