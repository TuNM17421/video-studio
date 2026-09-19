# Griffin — ảnh của component `Griffin` / `GriffinBadge`

Sinh từ bộ ảnh gốc của nhóm thiết kế (`VinUni_Griffin_Transparent_Parts/`) bằng
`tools/griffin-assets.py` — đừng sửa tay, dựng lại khi bộ gốc đổi:

```sh
uv run --with numpy --with pillow --with scipy tools/griffin-assets.py <thư mục bộ gốc>
```

| File | Nguồn trong bộ gốc |
|---|---|
| `stand-<mood>.png` | `griffin_generated_images/03–09` (đứng, cánh xếp) |
| `sit-<mood>.png` | `griffin_generated_images(1)/…/08–14` (ngồi) |
| `wings-<mood>.png` | `griffin_mascot_generated_images/02–08` (cánh giơ cao) |
| `turn-<mood>.png` | `griffin_mascot_all_generated/04–11` (ba phần tư; ảnh vẽ ngược chiều đã được lật) |
| `gesture-<tên>.png` | `griffin_generated_images(1)/…/01, 03–07` (cheer, walk-left, walk-right, welcome, wave, rest) |
| `face-<mood>.png` | cắt vuông từ `stand-<mood>`, nền `C.bgAlt` — avatar cho `DialogueCard` |
| `lightbulb.png`, `question_mark.png`… | chép nguyên từ `08_accessories_props/` |

`<mood>` = neutral · happy · wink · surprised · thinking (looking up) · sad · stern.

Ảnh trong một bộ được căn khít vào ảnh `calm` của bộ đó (co giãn + dịch, ưu tiên chân), nên đổi biểu cảm
là thay ảnh tại chỗ. Chúng vẫn là các bản vẽ riêng: độ chồng khớp sau khi căn ~0,92–0,97 (stand, sit,
wings) và ~0,71–0,88 (turn). Component vì vậy đổi ảnh bằng nhát cắt kèm nhịp nhún, không chồng mờ.

Không dùng từ bộ gốc: `01_main`, `02_faces`, `03_bodies`, `07_face_parts` (nét vẽ bản 1, không viền, lệch
với bộ mới), `griffin_generated_images/02_front_view` (tỉ lệ khác), các ảnh trùng giữa các thư mục.

Tạm để trong repo (~3 MB) để xem thử; khi chốt thì chuyển lên kho media R2.
