# Figures · Person, DocumentSheet, FormSheet, SpeechBubble, Stopwatch

Story figures from the Day02 rebuild videos. Use them for self-authored situations (a learner looking for
guidance, an observer taking notes, a user with a job to do) and put `tag="MINH HỌA"` on the scene.

- **Person** — bgAlt circle (r 66), head + shoulders, bold name and muted role below. `active` or
  `color={C.red}` for the person the scene is about (the one affected, the one who is stuck).
- **DocumentSheet** — a folded-corner page with text lines; `fill` 0–1 writes the lines in. Pages the
  learner opens, a finished description, a source document.
- **FormSheet** — "phiếu": header + rows of question → answer slot. Rows without `value` show an empty
  dashed slot: use it when the script says the result is not measured yet ("các ô chưa có kết quả đo").
  Highlight the row being spoken with `active`. Labels (and values) shrink together, never below 16 px,
  when one would overflow its column; widen `labelW` rather than relying on it.
- **SpeechBubble** — a question or a request in someone's words (tail left or right).
- **Stopwatch** — "measure the time" without digits: the hand sweeps with `sweep`, the red-soft wedge shows
  the elapsed share. Never add numbers the script does not give.

```jsx
<Person x={300} y={620} name="Học viên" role="tìm hướng dẫn nộp bài" />
<FormSheet x={640} y={430} w={760} title="PHIẾU MÔ TẢ" rows={[{ label: 'Ai gặp khó?' }, { label: 'Vướng bước nào?' }]} active={1} />
<SpeechBubble x={1180} y={440} w={420} lines={['Bước nào làm', 'bạn mất thời gian?']} tail="left" />
<Stopwatch x={520} y={640} sweep={linearProgress(frame, 40, 120)} label="Hiện nay" />
```
