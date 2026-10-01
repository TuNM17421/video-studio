# LineChart

One or two series over an axis — the only figure in `data/` that shows a quantity **changing**
("FPS theo 20 phút", "chi phí theo số lần gọi"). Everything else in `data/` reads one value.

`progress` 0→1 draws the lines left to right with a dot riding the head, so the shape arrives on the
spoken phrase instead of being there from the first frame.

A series is either fixed `points` or a `sample(x)` function. `sample` is what makes a trace **live**:
close it over the frame and over `fbm` (lib/noise.js) and the line keeps moving while the scene holds,
the way a real reading does — a measurement that never wobbles reads as a drawing, not as a measurement.
`rules` draws the threshold that explains the shape (the throttle ceiling a temperature curve bounces
off), and `readout` prints the live value at the head.

```jsx
<LineChart x={1000} y={750} w={620} h={120}
  xRange={[0, 20]} yRange={[30, 60]} xTicks={[0, 5, 10, 15, 20]} yTicks={[30, 40, 50, 60]}
  xTickLabel="phút" progress={smooth(f, T.chart, T.chart + 40)}
  series={[
    { label: 'Không có buồng hơi', accent: C.accent, points: [{ x: 0, y: 60 }, { x: 10, y: 51 }, { x: 20, y: 47 }] },
    { label: 'Có buồng hơi', accent: C.red, points: [{ x: 0, y: 60 }, { x: 20, y: 60 }] },
  ]} />
```

```jsx
<LineChart x={1000} y={700} w={620} h={150}
  xRange={[0, 20]} yRange={[28, 52]} xTicks={[0, 5, 10, 15, 20]} yTicks={[30, 40, 50]}
  xTickLabel="phút" rules={[{ y: 46, label: 'NGƯỠNG HẠ XUNG' }]}
  series={[{
    label: 'Không có buồng hơi', accent: C.accent,
    sample: (t) => 30 + 17 * (1 - Math.exp(-t / 3.5)) + 0.6 * fbm(11, t * 1.4 + f / 30),
    readout: (v) => `${v.toFixed(1).replace('.', ',')} °C`,
  }]} />
```

Rules: **at most two series** — a third makes the reader hunt the legend instead of reading the shape ·
the series the narration lands on is red, the one it is compared against accent · the numbers are the
script's, never invented · hold ≥ 45 f at `progress` 1 · pair it with a mechanism panel (the *why*),
never with a second chart.
