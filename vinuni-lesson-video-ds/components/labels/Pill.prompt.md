# Pill · Chip

**Pill** — 50 px tall, full radius, 18 px bold UPPERCASE copy; width auto from the label.
- `outline` (white fill, accent stroke) — neutral label or input ("BẬT", "ĐÚNG Ý").
- `active` — red-soft fill + red stroke: the thing being discussed ("THAO TÁC RÕ", "ĐẦU RA NGÔN NGỮ").
- `variant="solid"` — filled accent (or red when `active`), white text: strong states ("CHẶN").
- `variant="muted"` — dotInactive fill, grey text: an honesty label ("MINH HỌA").

**Chip** — flat 36 px tag inside cards, radius 14: `tone="blue"` ("ĐỌC"), `"red"` ("CHẶN"), `"muted"`.

```jsx
<Pill x={105} y={260} w={210} label="THAO TÁC RÕ" active opacity={appear(frame, 10)} />
<Chip x={220} y={520} label="CHẶN" tone="red" />
```

Keep pills on their own lane; never overlap a connector or card text. Arrows inside copy use "→".
