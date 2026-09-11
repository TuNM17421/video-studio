# Check · Cross · Bracket · Enclosure

- **Check / Cross** — hand-drawn 8 px red strokes (check 44 px, cross 42 px). Criteria met / not
  met, correct answer / rejected option. Never emoji ✓ ✗, never green.
- **Bracket** — a real vector bracket (4 px): `direction="down"` (U) groups the items above it,
  with a short red or blue caption under it ("Ý CHÍNH CHUNG"). Vectors use `VectorColumn` instead.
- **Enclosure** — dashed group box (15 / 12 dash, 4 px, radius 32) with a `Pill` name on its top
  edge. Red = "this is the part we are talking about" (e.g. "ĐẦU RA NGÔN NGỮ"); accent = neutral
  grouping. Size it from the union of enclosed cards + a consistent margin; never let it hug one
  side or cross a connector.

```jsx
<Bracket x={1190} y={813} w={420} color={C.red} opacity={appear(frame, T.summary)} />
<Enclosure x={420} y={510} w={1290} h={372} label="ĐẦU RA NGÔN NGỮ" labelX={780} labelW={300} />
```
