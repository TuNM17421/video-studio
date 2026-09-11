# JsonView

A structured JSON viewer (SVG): a JS object pretty-printed in the code-card style with highlighted keys, Vietnamese gloss chips and numbered id badges.

**Use for** API payloads the lesson dissects — a messages request (`system` / `messages` / `role`), a tool declaration (`input_schema` / `required` / `enum`), a `tool_use` and its `tool_result` ("Hai mã phải khớp"), "JSON arguments and results shown with Vietnamese glosses".
**Not for** arbitrary code (→ `CodeBlock`), a list of timed events (→ `LogCard`), a single field chip (→ `Chip`).

Anatomy: bgAlt card · radius 20 · dotInactive 2 · header 58 px (braces icon + title 17/700 uppercase accent, MINH HỌA tag — default ON) · `MONO` lines at 20 × 1.45, 2-space indent, keys accentStrong 700 · strings accent · numbers / true / null red · punctuation muted · long lines cut with "…".

States: `highlightKeys` → the key's line, or its whole `{…}` / `[…]` block, gets a red-soft band + red marker · `glosses` → one column of Chips (red on highlighted keys, blue otherwise) with a dashed leader from the line end; inside the card when they fit, else at `x + w + 28` (`glossX` overrides) · `matchId={{ tool_use_id: 1 }}` → red numbered badge after the value · `frame` → lines reveal every `per` (4) frames from `start`, glosses 8 f after their line.

Pairing two views: pass the SAME props object to `JsonView` and `jsonLineAnchor(props, key, side)` (side `'right'` | `'left'` | `'text'`) and route a `Flow` between the anchors.

```jsx
const USE = { x: 160, y: 320, w: 700, title: 'TOOL_USE · MÔ HÌNH GỌI', matchId: { id: 1 },
  data: { type: 'tool_use', id: 'toolu_DEMO_01', name: 'tra_lich_hoc', input: { student_id: 'HS-017' } } };
const RES = { x: 1060, y: 320, w: 700, title: 'TOOL_RESULT · ỨNG DỤNG TRẢ', matchId: { tool_use_id: 1 },
  highlightKeys: ['tool_use_id'], data: { type: 'tool_result', tool_use_id: 'toolu_DEMO_01', content: 'Thứ Hai: Toán 7:30' } };
const a = jsonLineAnchor(USE, 'id'), b = jsonLineAnchor(RES, 'tool_use_id', 'left'), mx = (a.x + b.x) / 2;
<JsonView {...USE} frame={frame} start={10} />
<JsonView {...RES} frame={frame} start={70} />
<Flow points={[a, { x: mx, y: a.y }, { x: mx, y: b.y }, b]} frame={frame} start={110} end={150} color={C.red} />
```

Rules: payloads are mock → keep `illustrative` on, ids like `toolu_DEMO_01` · ≤ ~20 lines (trim the object to the fields the narration names) · glosses are short lowercase Vietnamese ("mã lượt gọi", "khuôn dữ liệu vào") · outside-glosses need free space right of the card — don't route a Flow through them.
