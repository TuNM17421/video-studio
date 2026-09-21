# CompareSplit

Two static versions of one thing side by side (BẢN A / BẢN B, trước / sau), split by a dashed divider,
with an optional verdict pill naming the one difference that matters. The right side is where the lesson
lands (red). For two *processes*, use the `flow-compare` scene template instead.

Beats: left → right → verdict, each on its own spoken phrase. Up to 3 short lines per side.

```jsx
<CompareSplit x={200} y={300} w={1520} h={440}
  leftReveal={appear(f, T.a)} rightReveal={appear(f, T.b)} verdictReveal={appear(f, T.verdict)}
  left={{ tag: 'BẢN A', title: 'PROMPT NGẮN', lines: ['trả lời chung chung', 'thiếu ràng buộc'] }}
  right={{ tag: 'BẢN B', title: 'PROMPT CÓ VÍ DỤ', lines: ['bám định dạng', 'ít lệch yêu cầu'] }}
  verdict="KHÁC NHAU Ở RÀNG BUỘC" />
```
