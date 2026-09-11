# LogCard

An execution / audit log card (SVG): timed rows with a status mark, actor and event, revealed one by one.

**Use for** "nhật ký thực thi", "dòng bản ghi hoạt động", "bản ghi sự kiện", "bảng ghi 4 cột" (pass `columns`), a ReAct trace with a blocked call, and "khung nhật ký trống với dấu hỏi" (`empty`).
**Not for** a code snippet (→ `CodeBlock`), a payload (→ `JsonView`), a checklist of criteria (→ `Card` + `Check`/`Cross`).

Anatomy: bgAlt card · radius 20 · dotInactive 2 · header 58 px (clipboard-list icon + title 17/700 uppercase accent, default "NHẬT KÝ THỰC THI"; MINH HỌA tag — default ON) · optional column row (15/700 muted) · rows 56 px: status mark · mono timestamp 20 textMuted · ACTOR 17/700 accentStrong · text 22/500 (cut with "…") · optional status Chip right · 2 px dotInactive separators.

States: level `info` accent dot · `ok` accent check · `warn` red triangle-alert · `error` red octagon-x · `blocked` red lock + faint red-soft row · `highlightIndex` → red-soft band + red marker, others 45 % · `empty` → dashed card, circle-help + "Chưa có bản ghi" · `frame` → rows reveal every `per` (12) frames, fading and rising 8 px over 12 f.

```jsx
<LogCard x={240} y={300} w={1440} frame={frame} start={30} per={24} highlightIndex={frame > 150 ? 3 : undefined}
  rows={[
    { time: '19:02:11', level: 'info', actor: 'Suy luận', text: 'Cần lịch học của HS-017 → gọi công cụ' },
    { time: '19:02:12', level: 'ok', actor: 'Hành động', text: 'tra_lich_hoc(student_id="HS-017")', status: 'OK' },
    { time: '19:02:12', level: 'ok', actor: 'Quan sát', text: 'Thứ Hai: Toán 7:30, Văn 9:15', status: 'OK' },
    { time: '19:02:14', level: 'blocked', actor: 'Hành động', text: 'gui_email(toàn trường) — ngoài quyền', status: 'CHẶN' },
  ]} />
```

Rules: ≤ 7 rows · keep `illustrative` on (logs are mock) · problems are red, normal steps accent — no role hues on rows · pass `actorW` if a long Vietnamese actor collides with the text · hold the last row ≥ 60 f.
