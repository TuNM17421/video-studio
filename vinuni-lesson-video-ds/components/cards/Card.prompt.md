# Card

The base diagram card (SVG).

**Use for** a named input, step, output or state: `YÊU CẦU`, `KẾT QUẢ`, `BẢN A`, `NHẬN THỨC`.
**Not for** a black box you open up (→ `GlassBox`), an editorial system node (→ `GlassNode`), a
one-word tag (→ `Pill` / `Chip`).

Anatomy: bgAlt fill · 3 px accent stroke · radius 22 · micro label 17 / 700 at (x+24, y+32) ·
1–3 centered lines (24 px, line height 33, first line 700) · optional 30 px icon before the label.

States: `active` 0–1 → red-soft overlay + 5 px red stroke (drive with `pulse(frame, arrival)`) ·
`accent={C.red}` → the chosen / risky branch · `dashed` → hypothetical or pending · `muted` 0–1 →
36 % when out of focus.

```jsx
<Card x={450} y={273} w={360} h={150} label="THEO QUY TẮC" lines={['CÔNG TẮC', 'đóng mạch']}
      opacity={appear(frame, T.rule)} active={pulse(frame, T.arrive)} />
```

Rules: size the card for its longest line + ≥ 24 px padding each side · ≤ 3 lines · connectors end
on its edges (`anchor(card, 'left')`) · it is visible before any particle arrives · copy = line 1
UPPERCASE noun, line 2 lowercase explanation.
