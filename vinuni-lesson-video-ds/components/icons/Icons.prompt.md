# Icons · Icon

Twenty hand-drawn line icons ported 1:1 from the source repo (`src/primitives/icons.tsx`).

**Use for** generic concepts only: document, database, user(s), code, alert, gear, eye, layers…
**Never** for a named technology (Kafka, Airflow, Kubernetes, vLLM, MLflow) — use its official logo
(e.g. via `GlassNode logo={…}`), native colors kept. Never emoji or icon fonts.

- Style: 64×64 grid, 3 px round stroke, `stroke = currentColor`, no fills except small dots.
- Color: `C.accent` default · `C.accentStrong` in title cards · `C.red` for capabilities / danger ·
  white on a filled circle.
- Containers: `IconBadge` circle (icon = 52 % of the diameter) · 30 px in a `Card` label row ·
  42 px on a `GlassNode` · 120 px `bgAlt` circle in `BrandTitle`.

```jsx
<Icon name="database" x={280} y={480} size={56} color={C.accent} />
<DatabaseIcon width={46} height={46} style={{ color: C.accentStrong }} />   // HTML usage
```

Names: bulb, coin, trend-up, database, neural-net, chat-bubble, robot, document, eye, calendar-x,
alert-bubble, scale, layers, split-path, edit, code, check, users, scissors, gear.
Static files: `assets/icons/<name>.svg`.
