# ToolCard

A tool declaration as the model sees it — Tên · Làm việc gì? · Cần thông tin gì? · Trả về gì?

**Use for** "thẻ công cụ có ba vùng", "tấm giới thiệu có Tên, Làm việc gì?, Cần thông tin gì?", showing which
tool the model picks, which tool is not permitted, or a failed call.
**Not for** a generic step (→ `Card`), the running system that hosts tools (→ `ArchitectureNode kind="server"`),
a raw JSON/code listing.

Anatomy (w 560 default, h auto): radius-22 bgAlt card, 3 px accent stroke · 64 px NAME BAR (accent fill, white
wrench + MONO 26/700 name) · "LÀM VIỆC GÌ?" 17/700 label + wrapped 22/500 sentence · "CẦN THÔNG TIN GÌ?" param
chips (MONO name + muted type, red dot = required, legend "● bắt buộc") · "TRẢ VỀ GÌ?" output sentence ·
2 px dotInactive rules between zones.

States: `default` · `active` = being called (red bar, 5 px red stroke, red glow ring pulsing once at `at`) ·
`disabled` = not permitted (grey bar, lock, 45 %) · `error` = call failed (red-soft bar, alert icon,
`errorText` in red under "LỖI TRẢ VỀ").

```jsx
<ToolCard x={1180} y={280} w={620} name="tra_han_nop"
  does="Tra hạn nộp bài tập của một học sinh trong một lớp."
  inputs={[{ name: 'ma_lop', type: 'chuỗi', required: true }, { name: 'ma_hs', type: 'chuỗi', required: true }]}
  returns="Hạn nộp (ngày giờ) và trạng thái: đã nộp / chưa nộp."
  state={frame >= 150 ? 'active' : 'default'} frame={frame} at={150} opacity={appear(frame, 30)} />
```

Rules: tool name snake_case ASCII (it is code) · one-sentence description, Vietnamese · ≤ 4 params · mark only
truly required params · `illustrative` (default false) → `MINH HỌA` / `LỖI MINH HỌA` tag in the name bar when the
tool or its output is invented · connectors enter at `anchor({x, y, w, h: toolCardHeight(props)}, 'left')`.
