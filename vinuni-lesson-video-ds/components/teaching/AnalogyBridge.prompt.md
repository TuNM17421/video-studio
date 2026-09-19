# AnalogyBridge

An everyday situation (ĐỜI THƯỜNG, accent) beside the concept it explains (KHÁI NIỆM, red), joined by
an arc labelled GIỐNG NHƯ. One analogy per scene; the titles are the two nouns being compared, the sub
lines say what they share.

Beats: everyday card first → `reveal` the concept → `bridge` 0→1 (~30 f) when the narration says
"giống như". The arc rises above the cards, so keep `y` ≥ 400.

```jsx
<AnalogyBridge x={300} y={420} w={1320}
  reveal={appear(f, T.concept)} bridge={smooth(f, T.bridge, T.bridge + 30)}
  everyday={{ title: 'HỎI ĐƯỜNG', sub: 'người lạ đoán ý bạn' }}
  concept={{ title: 'PROMPT', sub: 'mô hình đoán ý bạn' }} />
```
