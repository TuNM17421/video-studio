# GlassBox — the transparent machine

The 3Blue1Brown "glassbox": open a black-box concept (LLM, attention, agent, app pipeline) and show
what happens inside.

Anatomy: bgAlt at 68 % · 3 px accent stroke · radius 30 · a `Pill` name straddling the top edge
(x + 24, y − 25) · inner content = your SVG children (layers, parameter grid, bars, inner cards).

Motion: flows enter on the left edge and leave on the right; the particle is hidden while it crosses
the box; set `active={pulse(frame, arrival)}` (× 0.5 red-soft flash) or light individual inner layers.

```jsx
<GlassBox x={500} y={290} w={820} h={500} label="MÔ HÌNH NGÔN NGỮ LỚN" opacity={appear(frame, 30)}
          active={pulse(frame, T.dataIn)}>
  <path d="M 920 330 V 615" stroke={C.dotInactive} strokeWidth={3} />
  {/* parameter grid · ProbabilityBars · Slider … */}
</GlassBox>
```

Rules: inner elements keep ≥ 40 px from the stroke; the label pill must not collide with inner
content; one glassbox is the hero of a scene — do not nest glassboxes.
