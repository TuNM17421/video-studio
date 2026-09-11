# TokenChip

A token box (170 × 80, radius 16, 2 px accent stroke, bgAlt, 36 px bold word). `selected` = the newly
chosen token (red-soft + red); `active` thickens the stroke to 5 px while in focus.

Lay tokens out at fixed x positions (`x = 180 + i * 200`), never flex. Group the prefix with a
`Bracket` and a muted caption ("Tiền tố · phần văn bản đã có"). When a chosen token joins the
context, move it along a red `Flow` into its reserved slot, then pulse it once.

```jsx
{['Hôm', 'nay', 'trời'].map((t, i) => <TokenChip key={t} x={180 + i * 200} y={290} text={t} />)}
<TokenChip x={780} y={290} text="mưa" selected active={pulse(frame, T.append)} opacity={appear(frame, T.append)} />
```
