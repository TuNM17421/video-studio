# SectionCard

Chapter break: red eyebrow · optional icon in a 90 px red-ringed circle · red 92 px number · 54 px
navy label beside it. Opacity over 16 f, spring damping 14 / stiffness 120. ~90–120 frames.

```jsx
<SceneFrame frame={frame} header={false}
  overlay={<SectionCard frame={frame} number={2} label="Transformer & Self-Attention" eyebrow="Phần 2 · Bên trong mô hình" icon="layers" />} />
```

Only for videos with explicit parts ("Phần 1 · 2 · 3"); single-topic videos go straight to scenes.
