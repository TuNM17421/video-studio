# DataTable

An animatable SVG table: header row, wrapped body text, status chips, row / cell highlights.

**Use for** assignment tables (`Ai làm / Ai duyệt / Quyền / Bàn giao`), a ReAct step log
(`Bước · Vì sao chọn · Việc đề nghị · Thông tin gửi đi · Kết quả`), a 3×3 test plan with "Chưa thử" cells,
an allowlist (`Công cụ được phép`) with statuses, TRƯỚC / SAU comparisons (column `tone`).
**Not for** 2–4 side-by-side ideas (→ `Card`s in a row), numeric bars (→ `MiniBar` / `ProbabilityBars`),
a colour grid of scores (→ `Heatmap`), a single status word (→ `Chip` / `Pill`).

Anatomy: title band 56 px (17/700 micro caps + MINH HỌA tag top-right) · frame radius 22, stroke 3
accent, white body · header bgAlt, labels 17/700 uppercase, 2 px accent rule · body text `fontSize`
(24) with 2 px dotInactive rules; first column 700 · long text wraps inside the column (row height
grows, min 68) · status cells `{ status, text? }` → 40 px chips (ok check green · blocked lock red ·
pending hourglass amber · untested dashed muted "Chưa thử" · error triangle-alert orange) · column
`tone` muted / accent / red, `strike`, `mono`.

States: settled without `frame` · `frame` → header at `start`, row i at `start + per·(i+1)` (18 f fade,
12 px rise; the frame grows with the rows) · `highlightRow` → red-soft band + red bar, first cell red ·
`highlightCell {row, key, at}` → red outline, pulse at `at`. `dataTableLayout(props)` returns row y/h for
placing overlays (arrows, stamps) on a row.

```jsx
<DataTable x={120} y={260} w={1680} title="NHẬT KÝ CÁC BƯỚC" illustrative="TÓM TẮT MINH HỌA"
  columns={[
    { key: 'step', label: 'Bước', w: 1, align: 'center' },
    { key: 'why', label: 'Vì sao chọn', w: 4 },
    { key: 'act', label: 'Việc đề nghị', w: 2.6, mono: true },
    { key: 'sent', label: 'Thông tin gửi đi', w: 2.4 },
    { key: 'res', label: 'Kết quả', w: 2, align: 'center' },
  ]}
  rows={[
    { step: '1', why: 'Cần biết lịch trống của giảng viên', act: 'tra_lich()', sent: 'mã lớp AI-201', res: { status: 'ok', text: 'Có 3 ô trống' } },
    { step: '2', why: 'Muốn báo cả lớp ngay', act: 'gui_thu_ca_lop()', sent: 'danh sách 120 email', res: { status: 'blocked' } },
  ]}
  frame={frame} start={30} per={20} highlightRow={frame > 90 ? 1 : undefined} />
```

Rules: ≤ 6 rows and ≤ 5 columns on a 1920 stage; keep cells to ≤ 2 wrapped lines (shorten copy
or widen the column) · keep the table inside y 250–960 (check `dataTableLayout(props).h`) · table data
is illustrative → leave `illustrative` on (default true); use 'MINH HỌA SOẠN SẴN — CHƯA CHẠY THẬT' for
plans not yet run · role hues appear only in status chips · header labels are nouns, cells lowercase.
