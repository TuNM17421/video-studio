# Whiteboard parts — component bảng trắng dựng sẵn (lab)

Mỗi part là **một hàm vẽ cả một cụm nét** lên bảng theo đúng thứ tự người dẫn sẽ vẽ, dùng lại được bao nhiêu
lần cũng được trong `board.js` của video bảng trắng (xem `Whiteboard.prompt.md`, `styles/whiteboard.md`).

```js
import { createBoard, WbMindMap, WbFlow } from '../../../../components/index.js';
const b = createBoard({ timeline: TIMELINE, spokenAt });            // font mặc định: playpen
WbMindMap(b, 'map', b.say(3, 'bạn sẽ học'), {
  cx: 2840, cy: 400, center: 'Ngày 2',
  branches: [
    { text: 'Cần cải thiện gì?', doodle: 'search', at: b.say(3, 'xác định việc') },
    { text: 'Làm thế nào?', doodle: 'gear', at: b.say(3, 'chọn cách') },
  ],
});
const flow = WbFlow(b, 'steps', b.say(5, 'thu thập'), { x: 100, y: 300, items: [{ text: 'Thu thập' }, { text: 'Xử lý', at: b.say(5, 'xử lý') }] });
b.endOf(flow); // khung hình cụm vẽ xong
```

Quy ước chung: `(board, id, at, options)` — `id` là tiền tố cho mọi nét (mỗi lần dùng một id riêng), `at` là
khung hình nét đầu (null = ngay sau nét trước); mục nào có `at` riêng thì bắt đầu đúng nhịp đó. Toạ độ là đơn
vị bảng. Chữ và số lấy từ kịch bản — part không tự thêm giá trị. Xem thử từng part:
`ui_kits/lesson-video/demos/whiteboard-parts.html?part=<Tên>` (`&font=shantell|pangolin`).

| Part | Khi nào dùng | Tuỳ chọn chính |
|---|---|---|
| `WbTitleCloud` | Tiêu đề phần / từ khoá lớn trong đám mây, chữ viền rỗng | `x, y, w, h, text \| lines, size, fill` |
| `WbStickyNote` | Tờ ghi chú gập góc: điều cần nhớ, định nghĩa ngắn | `x, y, w, h, title, lines[], size` |
| `WbSpeech` | Người que nói / nghĩ một câu (câu hỏi của người dùng, suy nghĩ) | `x, y (đầu), s, text \| lines, side, thought` |
| `WbFlow` | Các bước nối tiếp trong ô, mũi tên giữa | `x, y, items[{ text, at? }], w, h, gap, direction` |
| `WbCycle` | Vòng lặp lặp lại (làm → đo → chỉnh) | `cx, cy, r, items[{ text, at? }]` |
| `WbMindMap` | Một ý chính và các nhánh xung quanh | `cx, cy, center, branches[{ text, doodle?, at? }], rx, ry` |
| `WbChecklist` | Danh sách điều kiện, tick / gạch | `x, y, items[{ text, ok: true \| false \| undefined, at? }]` |
| `WbCompare` | Hai lựa chọn cạnh nhau, chữ khoanh ở giữa | `x, y, w, h, left/right { title, lines[] }, vs` |
| `WbTimeline` | Mốc theo thời gian / giai đoạn | `x, y, w, items[{ label, sub?, at? }]` |
| `WbBarChart` | So sánh độ lớn — **chỉ số liệu kịch bản có** | `x, y, w, h, bars[{ label, value, shown?, highlight? }]` |
| `WbIconLabel` | Một hình minh hoạ + chú thích | `x, y, doodle, size, label` |
| `WbIdea` | "Một ý tưởng" — bóng đèn toả sáng | `x, y, size, label` |
| `WbTable` | Bảng nhỏ kẻ tay, hàng tiêu đề | `x, y, colW[], rowH, rows[][]` |
| `WbFlight` | Máy bay giấy bay theo nét đứt: chuyển tiếp, gửi đi | `from, to, bend, size` |
| `WbSteps` | Bậc thang tiến bộ, cờ ở đỉnh | `x, y, items[{ text, at? }], stepW, stepH` |
| `WbDoodles` | Danh mục hình vẽ tay dùng cho `kind: 'doodle'` (65 hình, `DOODLES`) | xem `?part=WbDoodles` |

- Mỗi câu lời đọc vẫn chỉ 3–5 nét chính: một part lớn (mind map, bảng) nên trải qua 2–3 câu, mỗi nhánh / hàng
  một nhịp `at`.
- Part dùng mực của style: chữ navy, luồng xanh, điểm nhấn đỏ; đổi bằng `color` của từng mục khi kịch bản
  nhấn mạnh.
- Thêm part mới: viết hàm trong `parts.js` (cùng quy ước), thêm mẫu vào `demos/whiteboard-parts.html`, chụp ảnh
  `styles/previews/whiteboard__<Tên>.png` (367 × 206) và thêm tên vào `.design-sync/config.json` → `docsMap`.
