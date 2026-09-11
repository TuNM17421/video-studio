# Recap

Numbered recap rail inside a `SceneFrame` overlay: red rings (60 px, "01"…) on a vertical rail whose
red fill grows as rows reveal; each row = bgAlt card (3 px accentStrong, radius 22) with an UPPERCASE
strong-blue title column and a bold body; optional closing line in a red-outlined box.

```jsx
<SceneFrame frame={frame} eyebrow="…" title="Tóm lại: bốn ý cần nhớ" tag="TÓM LẠI"
  overlay={<Recap frame={frame} reveals={[30, 90, 150, 210]} closingAt={270}
    items={[{ title: 'Hai kỳ vọng', body: 'Phần mềm theo quy tắc: cùng điều kiện → cùng kết quả…' }, …]}
    closing="Biến thiên hữu ích khi phần nghĩa quan trọng vẫn đúng." />} />
```

Rules: 3–5 items; titles ≤ 3 words; bodies ≤ 2 lines (≈ 90 characters); reveal one per narrated point.
