# HookOverlay

The opening hook: one 72 px question over a white backdrop for the first 150 frames of scene 1.

Timing (frames): question in 8→28 (rises 18 px, out ease) · red underline 30→58 (0→184 px) ·
question out 116→132 · backdrop out 134→149 · returns null from 150.

```jsx
const c = frame - 150;   // authored scene content runs on c
<SceneFrame frame={frame} eyebrow="…" title="…" captions={CAPTIONS}
  overlay={<HookOverlay frame={frame} question={'Cùng một câu hỏi, AI trả lời\nhai cách khác nhau: đó có phải lỗi?'} />}>
  <Card … opacity={appear(c, 6)} />
</SceneFrame>
```

Rules: ≤ 2 lines, a real question the scene answers; content must not start before the hook clears;
the narration's first caption usually repeats the question.
