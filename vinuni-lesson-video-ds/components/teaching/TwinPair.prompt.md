# TwinPair

The same object drawn twice, differing in exactly **one** thing — the shape of a controlled comparison.
For two versions of a *text* (prompt A / prompt B) use `CompareSplit`; for two *processes* use the
`flow-compare` scene template. This one is for a thing you draw.

Both sides come from a single `render(side)` and get an identical box, so they cannot drift apart. The
only thing to branch on is `side.variant`.

```jsx
<TwinPair x={126} y={356} w={660} h={400}
  a={{ label: 'Không có buồng hơi' }} b={{ label: 'Có buồng hơi' }}
  diff="Khác đúng một chỗ: nhiệt tụ một điểm, hay trải thành tấm"
  aReveal={appear(f, T.a)} bReveal={appear(f, T.b)}
  render={(s) => <Phone x={s.x} y={s.y} w={s.w} h={s.h} spread={s.variant === 'b'} />} />
```

Rules: **one variable per pair** — if two things differ it is not a comparison, it is two examples ·
never mirror one side; mirroring makes identical shapes look different · encode the difference as a
**shape**, not only a color · side B (red) is where the lesson lands · reveal left then right on their
own spoken phrases · put a `MetricRow` with the SAME labels under each side · `diff` is one sentence and
is what the viewer should be able to repeat afterwards.
