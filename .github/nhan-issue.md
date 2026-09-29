# Nhãn (labels) của repo

Mỗi issue nên có **1 nhãn loại + 1 nhãn khu vực + 1 nhãn mức độ + 1 nhãn ưu tiên**. Nhãn trạng thái do bạn
gắn khi phân loại.

**Mức độ ≠ ưu tiên.** *Mức độ* là lúc nó xảy ra thì tệ đến đâu; *ưu tiên* là nên làm cái nào trước. Một lỗi
chặn hẳn mà một năm gặp một lần và có đường lách thì ưu tiên thấp hơn một chỗ khó chịu nhẹ mà cả nhóm vấp
mỗi ngày. Hai thang màu để khác hệ (mức độ đỏ→xanh, ưu tiên tím đậm→tím nhạt) cho dễ phân biệt khi nhìn
danh sách issue.

**Ưu tiên do một người chốt** — người mở issue chỉ *đề nghị*. Nếu ai cũng tự gắn được thì mọi việc thành P0
và bảng việc hết ý nghĩa.

## Nên tạo ngay (17 nhãn)

| Nhóm | Nhãn | Màu | Ý nghĩa |
|---|---|---|---|
| Loại | `bug` | `d73a4a` | Có thứ đang chạy sai |
| Loại | `đề xuất` | `a2eeef` | Thêm hoặc cải tiến tính năng |
| Loại | `template` | `ededed` | Issue mẫu, không phải việc cần làm |
| Khu vực | `studio` | `1d6199` | Video Studio (`studio/`, giao diện web) |
| Khu vực | `pipeline` | `134d8b` | cues, voice-timing, build, verify, shoot |
| Khu vực | `design-system` | `0b2a4d` | Component, scene, màu, bố cục |
| Khu vực | `tts` | `5b4b9a` | Giọng đọc ElevenLabs |
| Khu vực | `render` | `2f7d57` | Xuất MP4, transcript, chương |
| Mức độ | `mức độ: chặn` | `b60205` | Không làm tiếp được |
| Mức độ | `mức độ: nặng` | `d93f0b` | Phải lách mới làm được |
| Mức độ | `mức độ: vừa` | `fbca04` | Khó chịu, vẫn làm việc được |
| Mức độ | `mức độ: nhẹ` | `c2e0c6` | Lỗi nhỏ về hiển thị, chữ nghĩa |
| Ưu tiên | `ưu tiên: P0` | `4c0f6b` | Làm ngay, gạt việc khác sang một bên |
| Ưu tiên | `ưu tiên: P1` | `6b21a8` | Làm trong đợt này |
| Ưu tiên | `ưu tiên: P2` | `a855f7` | Có người rảnh thì làm |
| Ưu tiên | `ưu tiên: P3` | `e9d5ff` | Để đó, chưa cần làm |
| Trạng thái | `cần xem` | `ffffff` | Mới gửi, chưa phân loại |

## Thêm khi thấy cần

| Nhóm | Nhãn | Màu | Ý nghĩa |
|---|---|---|---|
| Loại | `tài liệu` | `0075ca` | README, hướng dẫn |
| Loại | `câu hỏi` | `d876e3` | Hỏi cách dùng, chưa rõ là lỗi |
| Tính chất | `ui-ux` | `c8641e` | Giao diện và trải nghiệm |
| Tính chất | `dữ liệu` | `a87a0c` | Dữ liệu sai hoặc mất |
| Tính chất | `hiệu năng` | `fbca04` | Chậm, tốn tài nguyên |
| Trạng thái | `đã xác nhận` | `0e8a16` | Đã tái hiện được |
| Trạng thái | `chờ thông tin` | `fef2c0` | Đang đợi người báo bổ sung |
| Trạng thái | `không tái hiện được` | `e4e669` | Làm theo các bước nhưng không thấy lỗi |

## Tạo nhanh bằng gh

Dán vào terminal (chạy trong thư mục repo). `--force` = có rồi thì cập nhật màu và mô tả.

```bash
gh label create "bug"            --color d73a4a --description "Có thứ đang chạy sai" --force
gh label create "đề xuất"        --color a2eeef --description "Thêm hoặc cải tiến tính năng" --force
gh label create "template"       --color ededed --description "Issue mẫu, không phải việc cần làm" --force
gh label create "studio"         --color 1d6199 --description "Video Studio, giao diện web" --force
gh label create "pipeline"       --color 134d8b --description "cues, voice-timing, build, verify, shoot" --force
gh label create "design-system"  --color 0b2a4d --description "Component, scene, màu, bố cục" --force
gh label create "tts"            --color 5b4b9a --description "Giọng đọc ElevenLabs" --force
gh label create "render"         --color 2f7d57 --description "Xuất MP4, transcript, chương" --force
gh label create "mức độ: chặn"           --color b60205 --description "Không làm tiếp được" --force
gh label create "mức độ: nặng"           --color d93f0b --description "Phải lách mới làm được" --force
gh label create "mức độ: vừa"            --color fbca04 --description "Khó chịu, vẫn làm việc được" --force
gh label create "mức độ: nhẹ"            --color c2e0c6 --description "Lỗi nhỏ về hiển thị, chữ nghĩa" --force
gh label create "ưu tiên: P0"            --color 4c0f6b --description "Làm ngay, gạt việc khác sang một bên" --force
gh label create "ưu tiên: P1"            --color 6b21a8 --description "Làm trong đợt này" --force
gh label create "ưu tiên: P2"            --color a855f7 --description "Có người rảnh thì làm" --force
gh label create "ưu tiên: P3"            --color e9d5ff --description "Để đó, chưa cần làm" --force
gh label create "cần xem"        --color ffffff --description "Mới gửi, chưa phân loại" --force
```

Xoá các nhãn mặc định không dùng của GitHub (tuỳ chọn):

```bash
for l in "bug" "enhancement" "documentation" "duplicate" "good first issue" "help wanted" "invalid" "question" "wontfix"; do gh label delete "$l" --yes; done
```
