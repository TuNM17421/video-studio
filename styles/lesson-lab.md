---
style: lesson-lab
extends: lesson
---

# Lesson Lab Style — phần thêm

Đọc `styles/lesson.md` trước; file này chỉ ghi phần thêm.

## Dựng cảnh

- Được dùng toàn bộ component của design system; ưu tiên component Lab (`AgentLoop`, `Gate`, `Swimlane`,
  `ChatWindow`, `CodeBlock`, `SourceCard`…) khi nội dung nói về agent, công cụ, cổng kiểm soát, luồng hệ
  thống, giao diện chat, mã hoặc nguồn tin.
- Màu vai trò (`ROLE` / `ROLE_OF` trong `lib/tokens.js`) chỉ cho nhãn vùng, viền và nền nhạt gọi tên một vai
  trò; không cho chữ thân, số liệu hay hạt. Đỏ giữ nghĩa nhấn và rủi ro.

## Tiêu chí QA

- Màu vai trò (xanh lá, cam, tím, vàng đậm) chỉ xuất hiện ở nhãn vùng, viền, nền nhạt — không ở chữ thân,
  số hay hạt.
