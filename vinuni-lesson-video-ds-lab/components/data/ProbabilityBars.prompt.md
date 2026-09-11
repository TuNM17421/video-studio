# ProbabilityBars

Horizontal distribution ("phân bố cho token kế tiếp"): label · track · fill · value %.

- Blue = candidate; red (`highlight`) = the chosen token. `max={100}` for percentages.
- `reveal` (0–1) grows every bar from the same value; percentages fade in as bars finish.
- **Continuous reshaping**: when a parameter changes (temperature, context), pass new `value`s every
  frame computed from one continuous variable — bars and numbers always agree; round only for display.
  Hold ≥ 45 frames at each extreme so the contrast reads.
- `rounded` = Day05 pill bars on a dotInactive track; default = Day01 bars (radius 5) on bgAlt.

```jsx
const t = frame < 330 ? 0 : linearProgress(frame, 330, 400);    // temperature 0 → 1
<ProbabilityBars x={970} y={404} max={100} rounded barW={240} barH={34} rowGap={72} labelW={75} size={19}
  items={[{ label: 'hoàn', value: 78 - 30 * t, highlight: true }, { label: 'xử', value: 16 + 18 * t }, { label: 'hỏi', value: 6 + 12 * t }]} />
```

Mark example numbers as illustrative ("Cách chia token và số liệu minh họa").
