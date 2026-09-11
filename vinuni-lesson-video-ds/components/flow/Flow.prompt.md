# Flow · Particle · StaticPath

`Flow` is the core "data flows" primitive and follows the connector contract:

1. The drawn polyline is the geometric authority — the particle rides the same `points` at the same
   traveled distance (`progress × length`). Never animate a separate dot path.
2. Endpoints come from card anchors: `[anchor(a, 'right'), anchor(b, 'left')]`; elbows are extra points.
3. The particle hides within `clearance` (18 px) of both ends and inside `hideIn` bounds — it never
   floats across a card face. The receiving card must be visible, then pulses once at `end`.
4. Travel is linear and monotonic (constant speed). The arrowhead fades in at the destination only after the particle has hidden there (over the last 14 frames when `showParticle={false}`).
5. Blue = data / default; red = the chosen / transformed path; `dashed` = optional / async.

```jsx
<Flow points={[anchor(req, 'right'), anchor(model, 'left')]} frame={frame} start={40} end={90} hideIn={[req, model]} />
<Flow points={[{ x: 880, y: 668 }, { x: 990, y: 668 }, { x: 990, y: 758 }, { x: 1120, y: 758 }]}
      frame={frame} start={338} end={394} color={C.red} />
<Flow points={sampleCubic(a, c1, c2, b)} progress={1} />   // static, already drawn
```

`Particle` — a standalone dot (with optional label pill) for tokens you move yourself with
`pointAtDistance()`; `StaticPath` — a drawn connector with no motion.

For several dots on one line (a "signal train"), compute each dot with `pointAtDistance` on the same
points, show it only on empty connector segments, and hide it across card faces.
