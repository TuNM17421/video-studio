# Griffin — ảnh của component `Griffin` / `GriffinBadge`

Sinh từ bộ ảnh gốc của nhóm thiết kế (`VinUni_Griffin_Transparent_Parts/`) bằng
`tools/griffin-assets.py` — đừng sửa tay, dựng lại khi bộ gốc đổi:

```sh
uv run --with numpy --with pillow --with scipy tools/griffin-assets.py <thư mục bộ gốc>
```

**Ảnh nào là tư thế × biểu cảm nào** khai trong `tools/griffin-assets.json`. Script dựng ảnh và sinh luôn
`components/mascot/griffinPoses.js` (cỡ ảnh, biểu cảm đã có) — component đọc bảng đó, nên:

- **Thêm biểu cảm cho một tư thế** (vd. `wave` buồn): thêm `"sad": "<đường dẫn ảnh>"` vào `moods` của tư thế
  đó, chạy lại script, `npm run build`. Không sửa code.
- **Thêm tư thế mới**: thêm một mục vào `poses` (kèm `hx` — tâm đầu theo bề ngang ảnh), chạy lại script, rồi
  thêm tên vào kiểu `GriffinPose` trong `Griffin.d.ts` và tài liệu `Griffin.prompt.md`.
- Biểu cảm đầu tiên trong `moods` là ảnh gốc để căn các ảnh khác, và là ảnh mặc định của tư thế.

| File | Nguồn trong bộ gốc |
|---|---|
| `<tư thế>-<mood>.png` | theo `tools/griffin-assets.json`: stand · sit · wings · turn đủ 7 biểu cảm; cheer · welcome · wave · rest · walk-left · walk-right mới có `neutral` (ảnh vẽ ngược chiều được tự lật) |
| `face-<mood>.png` | cắt vuông từ `stand-<mood>`, nền `C.bgAlt` — avatar cho `DialogueCard` |
| `badge-<mood>.png` | `02_faces/face_*` (`angry` → `stern`) — mặt của `GriffinBadge` |
| `lightbulb.png`, `question_mark.png`… | `08_accessories_props/`, cắt sát; `!` và `?` được vẽ thêm dấu chấm (bộ gốc thiếu) |

`<mood>` = neutral · happy · wink · surprised · thinking (looking up) · sad · stern.

Ảnh trong một bộ được căn khít vào ảnh `calm` của bộ đó (co giãn + dịch, ưu tiên chân), nên đổi biểu cảm
là thay ảnh tại chỗ. Chúng vẫn là các bản vẽ riêng: độ chồng khớp sau khi căn ~0,92–0,97 (stand, sit,
wings) và ~0,71–0,88 (turn). Component vì vậy đổi ảnh bằng nhát cắt kèm nhịp nhún, không chồng mờ.

Không dùng từ bộ gốc: `01_main`, `03_bodies`, `07_face_parts` (nét vẽ bản 1, không viền, lệch với bộ mới),
`griffin_generated_images/02_front_view` (tỉ lệ khác), các ảnh trùng giữa các thư mục.

Tạm để trong repo (~3 MB) để xem thử; khi chốt thì chuyển lên kho media R2.
