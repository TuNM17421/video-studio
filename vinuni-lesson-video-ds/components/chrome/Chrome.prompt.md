# Chrome pieces

The persistent frame of every lesson scene. `SceneFrame` composes all of them — reach for these
only when hand-building an unusual layout.

| Piece | Where | Spec |
|---|---|---|
| `Eyebrow` (HTML) | top 70, centered | 26 px / 700 / +5 tracking / UPPERCASE / red — "NGÀY 0N · CHỦ ĐỀ NGÀY" |
| `CenterHeader` (SVG) | title baseline 176, divider y 220 | title 50 px / 700; divider 3 px dotInactive x 96→1824 |
| `CornerTag` (SVG) | top 228, right edge 1792 | 42 px red-soft pill, 2 px red stroke, 17 px red — `MINH HỌA`, `SO SÁNH` |
| `Watermark` (HTML) | top 46, right 56 | 9 px red dot + "VinUni · AI in Action 20K" 21 px / 700 at 75 % |
| `SceneFooter` (HTML) | bottom 48, x 120→1800 | "01 / 06 · Tên video" 17 px muted; hidden under subtitles |
| `SubtitleBar` (HTML) | y 984–1080 | navy bar, 2 px accent top rule, white 29 px / 600, one line ≤ 78 chars |
| `EditorialGrid` (SVG) | full frame | 120 px grid from 80 px, dotInactive 1 px at 38 % |
| `EditorialHeader` (HTML) | left 86 | kicker 22 px red · title 54 px −1.4 tracking + red accent phrase · subtitle 24 px muted |

Rules: the watermark is on every scene (also title cards); never place content under y 960;
the corner tag states what kind of image this is (illustrative data, comparison, glassbox).
