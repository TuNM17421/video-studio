# QuestionCard

Check-your-understanding prompt in the content zone: 1–3 questions at 44 px bold, revealed 20 frames
apart with a small rise, then a muted hint ("Thử kể lại trước khi xem sơ đồ.").

```jsx
<SceneFrame frame={frame} eyebrow="…" title="Bạn kể lại vòng sinh như thế nào?"
  overlay={<QuestionCard frame={frame} start={20} questions={['Ngữ cảnh đã có đi vào đâu?', 'Token vừa chọn được đưa về đâu?']} hint="Thử kể lại trước khi xem sơ đồ." />} />
```

Pair with the `check-question` pattern when the answer is revealed on screen: keep options neutral
until the named reveal frame.
