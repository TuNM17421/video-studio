# FilingCabinet

The external store — tủ hồ sơ / kho dữ liệu / bộ nhớ ngoài — with many closed drawers; only one is
chosen and one document comes out.

**Use for** "tủ hồ sơ… chỉ một ngăn được chọn", "Kho dữ liệu nhiều ngăn đóng cửa; chỉ một tài liệu
được chọn đi ra", retrieval, "Ghi vào / Lấy lại" (pair with `Flow`s in/out). **Not for** what is in
the context right now (→ `ContextTray`), the request payload (→ `Envelope`), a database table
(→ a data component).

Anatomy: bgAlt cabinet (radius 22, 3 px accent) · header LineIcon archive/database + 17/700 label ·
drawers (bg, 2 px accent, radius 12, label left, handle right) · selected drawer pulled toward the
viewer (red front, amber memory-soft open top), others dim to 45 % · a red DocumentSheet rises out
and lands right of the cabinet, `docLabel` under it.

States: closed (no `selected`) · open (settled) · opening (`frame` + `at`).

```jsx
<FilingCabinet x={260} y={300} w={420} h={460} label="KHO TÀI LIỆU"
  drawers={['Quy chế học vụ', 'Lịch học kỳ', 'Học phí & hoàn phí', 'Biên bản họp', 'Email cũ']}
  selected={2} frame={frame} at={90} docLabel="Điều 12" />
```

Rules: 3–6 drawers, labels ≤ ~20 chars at w 400 · reserve docW + 60 px on the right · connect the
retrieved page onward with a Flow starting ≥ at + 56 · `cabinetDrawer(props, i)` for "Ghi vào" arrows.
