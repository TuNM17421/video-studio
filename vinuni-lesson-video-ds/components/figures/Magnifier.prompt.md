# Magnifier

A magnifying glass (kính lúp) that scans content and shows it enlarged inside the lens.

**Use for** "rà dòng chính sách bằng kính lúp", "Kính lúp đi qua ba thẻ", checking / searching inside
a document. **Not for** a search step in a pipeline (→ `Card` with LineIcon search), highlighting a
line permanently (→ `DocumentSheet` `highlight`), a citation (→ `SourceCard`).

Anatomy: lens circle (r 70, 5 px stroke, faint glass tint, white glint) · round-capped handle 45°
down-right · optional zoomed copy of `children` clipped to the lens.

States: static (`x`, `y`) · moving (`path` + `frame`) · `color={C.red}` when it lands on the finding.

```jsx
const doc = <DocumentSheet x={600} y={320} w={620} lines={POLICY} highlight={[{ line: 1, tone: 'amber' }]} />;
{doc}
<Magnifier path={[{ x: 720, y: 420, at: 30 }, { x: 980, y: 420, at: 70 }, { x: 860, y: 452, at: 100 }]}
  frame={frame} r={84} zoom={1.6}>{doc}</Magnifier>
```

Rules: pass the SAME element as `children` that is drawn underneath (so the zoom lines up) · rest the
lens on the row that matters at the end · keep the handle clear of other labels (it reaches ≈ 1.9·r
down-right of the center).
