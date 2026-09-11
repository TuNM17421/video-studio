# ContextTray

"Khay ngữ cảnh" — the model's input tray with a fixed number of places; what does not fit waits outside.

**Use for** "Khung ngữ cảnh biến thành ba lô / khay đầu vào", context tray vs external memory (N3-02,
next to `FilingCabinet`), choosing which documents get a place. **Not for** token arithmetic
(→ `ContextBudget`), the exact request payload (→ `Envelope`), a list of steps (→ `Card`s + `Flow`).

Anatomy: bgAlt tray (radius 22, 3 px accent) · header: LineIcon inbox + 17/700 label, "2/3 CHỖ"
counter right (red when full) · `capacity` dashed empty places · item chip-cards (radius 14, 2 px tone
stroke, file-text icon, 21/600 label) · queue 48 px right: grey dashed cards at 55 % under a muted
caption "KHÔNG VỪA · chờ ngoài khay".

States: settled · sliding in (`frame`, item i at start + i·per, 18-frame slide from the right) ·
room left (fewer items than capacity) · full + queue.

```jsx
<ContextTray x={220} y={320} w={440} h={330} capacity={3} frame={frame} start={40} per={14}
  items={[{ label: 'Quy chế học vụ 2026' }, { label: 'Tóm tắt hội thoại', tone: 'memory' },
    { label: 'Lịch học kỳ 1' }, { label: 'Biên bản họp khoa' }, { label: 'Email tháng trước' }]} />
```

Rules: capacity 2–5 · labels ≤ ~22 chars at w 440 · reserve queueW + 48 px on the right when items
exceed capacity · no token numbers here (that is `ContextBudget`).
