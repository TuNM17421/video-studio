# Swimlane

Horizontal lanes (3–5) that say WHO does each step of a flow — NGƯỜI DÙNG · ỨNG DỤNG · MÔ HÌNH · DỮ LIỆU · CÔNG CỤ.

**Use for** sequence-style explanations where the actor matters: the 5 steps of tool calling, "ba làn ngang
cùng nhận một thẻ yêu cầu", "ba vùng… chỉ ứng dụng nối đến dữ liệu", permission boundaries between app / model / data.
**Not for** a single linear pipeline (→ `Card` + `Flow`), a system/deployment picture (→ `ArchitectureNode`
containers), one input splitting by a rule (→ `BranchRouter`).

Anatomy: radius-22 frame, 3 px dotInactive · header column (`headerW`, default 220) per lane: 6 px role strip,
icon + 17/700 uppercase label in the lane `tone`, optional lowercase `sub` · lane bodies alternate bg / bgAlt,
2 px dotInactive rules · children on top. Lanes < 110 px tall put icon and label on one row.

States: `activeLane` → red outline + faint red tint + red header label (strength `activeLevel` 0–1, drive with
`pulse`) · with `frame`, lane i reveals over 24 f from `start + i * per` · no `frame` → settled.

Helpers: `laneBox(props, i)` → body box of lane i · `laneY(props, i)` → its vertical center.

```jsx
const L = { x: 120, y: 260, w: 1680, h: 680, lanes: [
  { label: 'NGƯỜI DÙNG', icon: 'users', tone: 'input' },
  { label: 'ỨNG DỤNG', icon: 'app-window', sub: 'điều phối' },
  { label: 'MÔ HÌNH', icon: 'bot', tone: 'reasoning' },
  { label: 'CÔNG CỤ', icon: 'wrench', tone: 'action' },
] };
const Q = { x: laneBox(L, 0).x + 40, y: laneY(L, 0) - 70, w: 260, h: 140 };
<Swimlane {...L} frame={frame} start={0} activeLane={3} activeLevel={pulse(frame, 120)}>
  <Card {...Q} label="BƯỚC 1" lines={['CÂU HỎI', 'hạn nộp AI101?']} opacity={appear(frame, 40)} />
</Swimlane>
```

Rules: 3–5 lanes · one role `tone` per lane only when the script color-codes roles (else leave accent) ·
cards inside a lane are ≤ lane height − 30 px · connectors between lanes leave a card sideways and enter the
next card's top/bottom edge (anchor) · the component itself is structural, `MINH HỌA` goes on illustrative content.
