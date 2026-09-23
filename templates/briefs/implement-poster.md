# Brief — lane dựng cảnh, dòng **poster vector** (dán nguyên, điền `<…>`)

**Hai trục, đừng gộp.** `motion: poster` là NGÔN NGỮ CHUYỂN ĐỘNG. Màu và nền là trục riêng:
`theme` trong `REQUEST.md`, mặc định **`vinuni-light` (NỀN TRẮNG + bảng màu VinUni)**. Cảnh đọc màu
qua `usePosterTheme()` — **không** import bảng `POSTER`, **không** rải hex. `styles/poster.md` §0.


Đọc `.claude/skills/make-video/SKILL.md` → `video-anatomy.md` → `styles/poster.md`. Ba file, hết.
Chữ ký primitive tra ở `styles/poster.md` khi cần — đừng đọc trước. Doctrine dòng poster ở
`styles/poster.md`; luật §5/§6/§7 + Do/Don't của DS `README.md` **không áp** cho bạn.

## Việc
Video `<id>` · `<số>` cảnh · thư mục scene `vinuni-lesson-video-ds/ui_kits/lesson-video/videos/<id>/`.
Lời đã KHOÁ ở `projects/<id>/loi-dan.md` — **không đổi một chữ nào**; thấy chỗ cần đổi thì báo, đừng sửa.

## Bắt đầu — `node tools/new-video.mjs <id> --style poster [--title "<…>"] [--day <NN>]`
Sinh khung file, từ chối ghi đè id đã có. Đừng chép tay từ `d2-01-lab`.

## Nguồn
- Export Claude Design: `<đường dẫn *.dc.html>` + `<*-scene.jsx>` + `<animations-v3.jsx>`.
- Engine **và primitive** đã có ở `lib/poster/` (`poster` · `posterMarks` · `posterFigures` ·
  `posterBridge`) — **dùng lại, không port lại**; chữ ký ở `styles/poster.md`. Primitive chỉ dùng một
  chỗ thì để nguyên trong thư mục video.
- Giọng đã thu: `voice/out/<id>/voice.cues.json`. `dur` authored trong `OM_SCENES` phải chỉnh theo
  giọng đo được, nhắm tỉ lệ 0,85–1,15.

## Hằng số / toạ độ đã kiểm (phần còn lại bạn tự đọc source)
| Thứ | Giá trị | Nguồn |
|---|---|---|
| `<tên>` | `<giá trị>` | `<file:dòng>` |
| `<tên>` | `<giá trị>` | **GIẢ THUYẾT — tự kiểm trước khi dùng** |

Toạ độ điểm nối giữa hai chương phải đọc từ source của cảnh **KẾ TIẾP**, không suy từ cảnh khác (E8).

## Ràng buộc
- `Shot` phải **unmount** (trả `null`), không `visibility: hidden` (nếu không FM-20 cảnh báo nhầm
  cả chương). Màu gom về nhóm token `POSTER`, **không tắt gate `off-palette`**. Chữ mang nghĩa
  ≥22px; `steel` chỉ cho nét vẽ/viền, không bao giờ cho chữ.
- Mốc nhấn neo bằng `beatT('<cảnh>', '<cụm từ>')` — theo TỪ được nói, không theo giây, không theo
  số câu; mọi `beatT` phải có mặt trong `storyboard.json` (G3).
- **Easing theo NGHĨA** (§4), **chuyển động phải chạm đích** (`reachFade`), **vòng lặp dùng
  `breathe()`** — không viết tay `sin` không chặn dưới.
- Chữ trên hình: rút gọn thì được, **đổi nghĩa thì không** (FM-32). Bia khắc/end-card khai
  `kind: "plaque"|"endcard"` để miễn G1, đừng bẻ chữ cho qua gate.
- `dur` chỉnh bằng `node tools/scene-pace.mjs --video <id> --suggest`, giữ tỉ lệ 0,85–1,15, **không
  dịch mốc nội bộ**.
- Cầu nối bắt đầu bằng đúng frame cuối chương trước, bỏ lớp fade-về-nền, và **không vẽ lại** hình
  cảnh liền kề (import hằng số của chính cảnh đó). **Không** dùng `transition` của `Series`.
- Không `window`/`document`/`localStorage`/`ResizeObserver`/RAF — smoke render chạy trên Node.

## Nộp
`storyboard.json` (cảnh · ẩn dụ · mốc nhấn neo vào cụm từ nào của cue nào · chữ trên hình + `kind`)
cùng code cảnh — `storyboard-gate` đọc chính file đó.

## Nghiệm thu (chạy, rồi dán output thật)
```console
npm run serve &
npm run stage:qa     -- --video <id>     # 9 bước (8 gate + trích frame), có storyboard-gate + scene-pace
npm run stage:build  -- --video <id>
npm run stage:verify -- --video <id>
```
- Đọc `projects/<id>/qa/REPORT.md`, mở đúng các frame full-res nó liệt kê (FM-25).
- **Xem video phát liên tục một lượt** — easing sai nghĩa và chuyển động không chạm đích không có
  gate nào bắt.
- Refactor "chỉ dời chỗ" thì phải chứng minh: sha256 SSR markup các frame biên cue trùng bản cũ.
- **Kết thúc báo cáo bằng `ls -la` + `wc -l`** các file đã ghi.
- **Kết thúc việc = `node tools/trace-report.mjs --video <id> --stamp "<LANE-NN> · <stage> · <vai>"`**
  rồi điền thân mục (≤15 dòng, chín trường, có dòng `token:`). ĐỪNG gõ tiêu đề/giờ bằng tay. Nếu bạn tự viết một stage (`cues`/`scenes`/`deliver`)
  thì đóng ledger bằng `node tools/video-workflow.mjs run finish --video <id> --run-id <ID>
  --status done --input-tokens N --output-tokens N --model <tên>`. Không ghi = lần dựng sau
  không trace lại được (`node tools/trace-report.mjs --video <id>`).
- **Chờ lane khác = `node tools/handoff.mjs wait --video <id> <khoá> [--equals <v>]`**, KHÔNG chờ
  một mục TRACE xuất hiện. Xong phần của mình thì `handoff set` (vd `voice.state --value staged`).
  Cần server tĩnh: `npm run stage:serve -- --status` TRƯỚC khi mở cái thứ hai; tắt bằng `--stop`.
