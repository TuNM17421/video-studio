# Envelope

The request payload sent to the model — "gói thông tin sẽ gửi" — as an envelope holding stacked blocks.

**Use for** what exactly goes into one model call: system / user messages / tool results / retrieved
documents ("Phong bì B chỉ nhận một khối user", "Sáu phong bì TRƯỚC/SAU"), and what stays OUT
("ngoài gói là Không gửi"). **Not for** the context window's size limit (→ `ContextBudget`), a tray
with limited places (→ `ContextTray`), the external store (→ `FilingCabinet`), a chat screen (→ `ChatWindow`).

Anatomy: bgAlt body (radius 22, 3 px accent) · triangular flap on the top edge · centered header
(LineIcon send + 17/700 label) · slots (radius 14, 2 px role stroke + soft fill, 6 px role bar,
21/600 label, 15/700 kind tag right: system = accentStrong, user/message = input blue, tool = orange,
doc = amber, output = green; `tone: 'red'` for an injected/risky block) · outside items: dashed muted
cards 40 px right of the body, red "KHÔNG GỬI" chip on their top edge.

States: open (flap stands 64 px above y) · sealed (flap folded, red seal disc with the send icon).
Timing: `sealed frame at` → flap closes at…at+18, then a 54-frame red send pulse (halo + 5 px stroke).
`start`/`per` stagger the slots in. Default = settled.

```jsx
const E = { x: 200, y: 330, w: 560, h: 420, slots: [
  { label: 'Vai trò: trợ lý học vụ', kind: 'system' },
  { label: 'Câu hỏi: hoàn học phí?', kind: 'user' },
  { label: 'Quy chế 2026 · Điều 12', kind: 'doc' },
] };
<Envelope {...E} outside={[{ label: 'Lịch sử chat tháng trước' }]} outsideW={360}
  sealed frame={frame} at={120} start={20} per={10} />
<Flow points={[anchor(E, 'right'), anchor(MODEL, 'left')]} frame={frame} start={140} end={190} />
```

Rules: ≤ 5 slots, one short line each · connect to a slot with `anchor(envelopeSlot(E, i), 'right')` ·
reserve outsideW + 40 px on the right when using `outside` · the Flow to the model starts after the
seal (at + 18) · side-by-side BEFORE/AFTER envelopes: same w/h, differ only in slots.
