# EmailCard

A generic email / draft mock (SVG) with a status chip.

**Use for** "Hai thư điện tử chạy vào hai nhánh", "phong bì đã đi xa", "Bản nháp" — a message an agent drafts, holds for approval or sends.
**Not for** a whole mailbox screen (→ `BrowserFrame` with EmailCards / rows inside), a column of waiting items (→ `Tray`), a chat turn (→ `ChatWindow`), an envelope icon (→ `LineIcon name="mail"`).

Anatomy: white card · 3 px accent stroke · radius 22 (dashed when `dashed`) · mail icon + status chip (17 / 700) · "Từ" / "Đến" rows (key 17 / 700 muted, value 18 / 600) · subject 21 / 700 · hairline · body lines (strings, 18 / 500 muted) or placeholder bars (`lines={3}`) · optional attachment chip.

States: status tones `BẢN NHÁP` muted · `CHỜ DUYỆT` amber (waiting role) · `ĐÃ GỬI` green (output role) · `BỊ CHẶN` red · `active` 0–1 red overlay (subject turns red) · `opacity`. `illustrative` **defaults to true**. Default height = `emailCardHeight(n, attachment)` (222 + 28 n, + 52 with attachment).

```jsx
<EmailCard x={260} y={360} w={520} status="BẢN NHÁP" dashed
  subject="Nhắc hạn nộp bài 3 · lớp CLASS-A"
  lines={['Chào em, bài 3 hạn 21:00 thứ Sáu.', 'Em nộp file PDF trên trang LMS nhé.']}
  attachment="huong-dan-bai-3.pdf" opacity={appear(frame, 20)} active={pulse(frame, 80)} />
```

Rules: fictional addresses only (`*.truong.edu.vn`) · ≤ 4 body lines — use bars when the words don't matter · move it with a `<g transform>` / beside a `Flow`, keep the card itself static · two mails into two branches: same `w`, different `status`.
