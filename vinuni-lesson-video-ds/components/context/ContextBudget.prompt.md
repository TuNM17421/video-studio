# ContextBudget

A stacked horizontal budget bar for the context window: parts add up against a limit; what does not
fit sticks out past the limit, hatched red, and is cut.

**Use for** "500 cuối nhô khỏi thanh", "phần dư 300 hiện gạch chéo", a subtraction on screen, or a
limit ruler without fake measurements (N4-03, `showNumbers={false}`). **Not for** which blocks are
sent (→ `Envelope`), counting places for whole documents (→ `ContextTray`), one value on a track
(→ `MiniBar`), probabilities (→ `ProbabilityBars`).

Anatomy: dotInactive track (x…x+w = the limit) · segments (soft fill, 2 px hue stroke, 17/700 hue
label + 20/600 ink number inside; below with a tick when narrow) · limit marker (3 px ink line,
"GIỚI HẠN · 8.000" above) · overflow beyond x+w (red-soft, red 45° hatch, dashed red outline, red
strike line, red callout right of it "PHẦN DƯ 500 — bị cắt") · title + MINH HỌA tag above. Numbers
use vi-VN grouping (formatNumber).

States: settled (default) · filling (`frame`: segments fill in order, the overflow grows last) ·
`showNumbers={false}` (proportions only) · `showSum` (tổng − giới hạn = dư).

```jsx
<ContextBudget x={200} y={480} w={1200} limit={8000} title="KHUNG NGỮ CẢNH · token"
  segments={[{ label: 'HỆ THỐNG', tokens: 800, tone: 'system' }, { label: 'LỊCH SỬ', tokens: 3200 },
    { label: 'TÀI LIỆU', tokens: 3500, tone: 'amber' }, { label: 'ĐẦU RA', tokens: 1000, tone: 'green' }]}
  frame={frame} start={30} per={20} showSum />
```

Rules: numbers only when the script gives them, and keep `illustrative` on (default) · 3–5 segments
· reserve overflow width + ≈280 px right of x+w for the callout · ≥ 96 px above y for title/tag.
