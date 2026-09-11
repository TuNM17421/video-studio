# DayMap — the day map of an overview video

For "video tổng quan / giới thiệu ngày" scripts, where the narration first names the day's questions and
then walks through the day's parts one by one. One map persists through the whole video and lights the
part being introduced ("dùng một bản đồ ngày học, lần lượt làm sáng phần đang được giới thiệu").

**Layouts**
- `dock={0}` full: three 480×300 cards centered in the content zone (y 420–720): zone title (20 px, accent),
  the question (38 px bold, 1–2 lines), arrows between cards. Use in the opening scene; reveal each card
  as its question is spoken (`reveal={[appear(f, t0), appear(f, t1), appear(f, t2)]}`).
- `dock={1}` strip: three 540×96 cards under the header (y 288–384) with the part pills. The active part is
  red; done parts white with an accent stroke; upcoming parts muted and their zone dimmed. Put the scene's
  illustration below, y 410–960.
- Animate `dock` with `smooth(frame, 0, 36)` at the first part scene (full → strip) and back to 0 in the
  closing scene, so the map moves continuously across the hard cuts.

**States**: `activePart` (0-based across zones) · `visited` · `activeGlow={pulse(frame, 4, 60)}` on the first
scene of each part · `pulses` for the closing rhythm (light each card once as its question is spoken, then
hold — never show a decision).

```jsx
<DayMap zones={ZONES} dock={smooth(frame, 0, 36)} activePart={0} activeGlow={pulse(frame, 34, 60)} />
```

Keep zone titles and part labels short (≤ 16 characters) and taken from the script; do not invent parts.
Worked example: `ui_kits/lesson-video/videos/n2-00-gioi-thieu-ngay-2/`.
