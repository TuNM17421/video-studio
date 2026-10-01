# WipeSplit

One continuous drawing cut by a vertical divider, with the name of whatever causes the change riding on
the divider. Use it for "X làm cho Y thành Z" — the labelled divider turns a comparison into a causal
sentence, which `TwinPair` (two separate objects) cannot do.

Let a shape straddle the cut: the viewer must see the **same** thing change, not two pictures.

```jsx
<WipeSplit x={120} y={296} w={1680} h={516} at={smooth(f, T.wipe, T.wipe + 50, 0, 1)} label="AI"
  leftLabel="AI dựng lại, hình nét" rightLabel="GPU vẽ ở độ phân giải thấp"
  left={<Landscape fidelity="fine" />} right={<Landscape fidelity="coarse" />} />
```

Two recipes: a **held comparison** puts the before state in `left` and keeps `at` at 0.5 (Vietnamese
reads left to right); a **running wipe** puts the after state in `left` and animates `at` 0→1 so the
divider leaves the new state behind it. The side captions are what keep a frozen frame unambiguous —
write both.

Rules: the two halves are the same framing, same camera, same scale · dwell ≥ 45 f at each end of a
running wipe · one divider per scene · the pill says the **agent**, not the result ("AI", "Cache",
"Quy trình mới"), and the result goes in a `Pill` of its own.
