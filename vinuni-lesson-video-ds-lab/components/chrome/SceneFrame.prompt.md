# SceneFrame

Wrap **every** lesson scene in `SceneFrame`. It renders the full chrome and gives you a 1920×1080 SVG
for the diagram.

```jsx
export default function MyScene() {
  const frame = useFrame();
  return (
    <SceneFrame
      frame={frame}
      eyebrow="NGÀY 05 · THIẾT KẾ SẢN PHẨM AI"
      title="Hai kiểu kỳ vọng"
      tag="SO SÁNH"
      footer={{ left: '01 / 06 · Sản phẩm AI và ba lớp bất định' }}
      captions={[{ start: 0, end: 118, text: 'Khi bật công tắc đèn, bạn chờ bóng đèn sáng ngay.' }]}
      overlay={<HookOverlay frame={frame} question={'…'} />}
    >
      {/* SVG children: Card, GlassBox, Flow, ProbabilityBars… */}
    </SceneFrame>
  );
}
```

- Children are SVG in the 1920×1080 viewBox; `overlay` is HTML above them (Recap, QuestionCard,
  HookOverlay, BrandTitle, SectionCard, Statement).
- `variant="editorial"` switches to the Day28 look (grid, `kicker`, `title` + `titleAccent`, `subtitle`).
- `header={false}` for full-frame title cards (watermark stays).
- Captions are scene-local frames, contiguous, ≤ 78 characters each; `?captions=0` hides them.
- Layers: SVG → header → overlay → footer → watermark → subtitle bar. Content zone y 250–960.
