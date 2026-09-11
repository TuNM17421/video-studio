# AgentLoop

A cyclic diagram: 3–4 stage cards on a loop, curved arrows between them and one particle going round.

**Use for** the ReAct loop (`SUY NGHĨ → HÀNH ĐỘNG → QUAN SÁT`), the four agent blocks around a system
(`NHẬN THỨC / SUY LUẬN / HÀNH ĐỘNG / TRÍ NHỚ`, "mũi tên kết quả quay lại"), a product flywheel
("Vòng tròn bánh đà ba mũi tên" → `variant="flywheel"`), a loop that exits (`HOÀN TẤT`, `HỎI NGƯỜI DÙNG`).
**Not for** a one-way pipeline (→ `Flow` between `Card`s), a branching decision (→ `Flow` + `Card`),
a stop / approval gate by itself (→ `StopGate` / `Gate` in components/control, composed as `children`).

Anatomy: dotInactive base track 5 px · accent arcs 5 px (7 in flywheel), trimmed 14 px clear of cards,
arrowhead at each arc end · stage cards radius 22 / stroke 3, `role` → ROLE_OF outline + soft fill,
label 24/700 + sub 20/600 muted + optional `LineIcon` · center label 24/700 accentStrong + 17/600 sub ·
`exit` → red `Flow` + red `Card` · `errorStage` → that stage's outgoing arc in ROLE.orange with a
"KẾT QUẢ LỖI" tag · `counterSlot` translated to the loop center.

States: settled (no `frame`) = everything drawn · `frame` → particle leaves stage 0 at `start`,
`lap` frames per lap, `laps` laps; lap 1 reveals the arcs behind the particle; the stage just reached
pulses (54 f) — or `activeStage` holds one · with `exit`, the particle stops at the exit stage on the
last lap, then the exit arrow runs (30 f) and the card appears (+24 f).
Arrival of stage i on lap k ≈ `start + lap·(k + i/N)`. `loopStagePoint(props, i)` returns the stage center/box.

```jsx
const REACT = [
  { label: 'SUY NGHĨ', sub: 'chọn việc tiếp theo', role: 'reasoning' },
  { label: 'HÀNH ĐỘNG', sub: 'gọi công cụ tra lịch', role: 'action' },
  { label: 'QUAN SÁT', sub: 'đọc kết quả trả về', role: 'input' },
];
<AgentLoop cx={860} cy={600} w={640} h={440} stages={REACT} center="VÒNG ReAct"
  frame={frame} start={40} lap={150} laps={2}
  errorStage={{ stage: 1, label: 'KẾT QUẢ LỖI' }}
  exit={{ stage: 0, label: 'HOÀN TẤT', sub: 'gửi câu trả lời', side: 'right', length: 150 }}>
  {/* compose control overlays here, e.g. <StepCounter …/> placed with loopStagePoint(props, 0) */}
</AgentLoop>
```

Rules: 3–4 stages (flywheel: 3 arcs) · keep the loop inside the content area y 250–960 (card half-height
+ exit card included) · an ellipse (`w`, `h`) fits 16:9 better than a circle · role hues only on
outlines / soft fills — labels stay ink, particle stays accent · one particle per loop; use `laps`
for repetition, not extra loops · `illustrative` defaults to false (structural).
