# GlassNode (editorial / Day28)

A system component in a platform or architecture map: white card, radius 22, 3 px stroke, icon or
official logo on top, bold 23 px label, muted 17 px subtitle — **centered on (x, y)**.

- `tone="accent"` normal · `"strong"` the component currently active · `"danger"` failing / risky.
- Named technology → `logo={<image href="kafka.svg" width={48} height={48} />}` (official asset,
  native colors). Generic role → `icon="database"`.
- Pair with `ZoneLabel` lanes, `Flow` connectors edge-to-edge, `Enclosure` for governance groups.

```jsx
<GlassNode x={740} y={500} label="PIPELINE" subtitle="processing" icon="gear" tone={active ? 'strong' : 'accent'} />
```

Use in `variant="editorial"` scenes; in canonical scenes prefer `Card`.
