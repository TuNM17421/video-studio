# MiniBar

Compact meter inside a card: muted 18 px label above an 18 px pill track (dotInactive) with an
accent (or red) fill. Use for counts and shares: "Đạt tiêu chí · 7 ca", "Thiếu ý · 2 ca".

```jsx
<MiniBar x={1110} y={860} w={200} value={countUp(frame, 300, 360, 0, 0.7)} label="7 ca" />
```

Animate `value` continuously (count-up), never in jumps.
