# Slider

A parameter control (temperature, context size, threshold): 12 px dotInactive track, red fill to a
white knob with a 6 px red ring, muted extreme labels, red caption underneath.

Everything the slider controls must reshape from the **same** `value` in the same frame, and the
scene must dwell at both extremes (≥ 45 f) before and after the sweep.

```jsx
<Slider x1={730} x2={1140} y={650} value={t} left="TẬP TRUNG" right="RỘNG" title="ĐỘ NGẪU NHIÊN (TEMPERATURE)" />
```
