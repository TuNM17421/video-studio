# PermissionBoundary

A dashed permission zone: the agent may only act on what is inside it.

**Use for** "đường biên quyền", a `CHỈ ĐỌC` frame around read tools, the set of tools an agent was
granted — with the forbidden one (`HOÀN TIỀN`) drawn outside and crossed.
**Not for** a checkpoint on one connector (→ `Gate`), a plain emphasis ring around existing
content (→ `Enclosure`), a titled container you open up (→ `GlassBox`).

Anatomy: rounded rect (radius 32, 4 px stroke, dash 15 12) in the tone color with a 4 % tint ·
50 px badge pill straddling the top edge 36 px in, lock / lock-open LineIcon + 18/700 label ·
children inside · a `BlockedBadge` (red-soft disc + red cross) on the top-right corner of each
`blocked` box.

States: `locked` (lock, default) / `locked={false}` (lock-open, access granted) · `tone` accent,
red (risky zone) or a role (`output` green, `check` orange…). No built-in motion — fade with
`opacity={appear(f, t)}`; reveal blocked items by rendering them (and their box) later.

```jsx
const REFUND = { x: 1320, y: 470, w: 360, h: 170 };
<PermissionBoundary x={240} y={380} w={960} h={360} opacity={appear(f, 0)}
  blocked={f >= 60 ? [REFUND] : []}>
  <Card x={300} y={470} w={400} h={170} label="CÔNG CỤ" lines={['TRA ĐƠN', 'đọc trạng thái']} />
  <Card x={740} y={470} w={400} h={170} label="CÔNG CỤ" lines={['TRẢ LỜI', 'soạn tin nhắn']} />
</PermissionBoundary>
<Card {...REFUND} accent={C.red} dashed label="CÔNG CỤ" lines={['HOÀN TIỀN', 'ngoài phạm vi']}
  opacity={appear(f, 40)} />
```

Rules: leave ≥ 40 px between the zone edge and its children, and ≥ 36 px above the first child
for the badge · blocked items sit clearly OUTSIDE (≥ 40 px gap) · one boundary per idea; nest at
most one level · role tones only when the script color-codes that role · `illustrative` default
false (structural).
