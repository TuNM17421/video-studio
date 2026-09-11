# BrandTitle

Full-frame title card: red eyebrow · icon in a 120 px bgAlt circle (spring pop) · 62 px title ·
140 × 6 red bar. Entrance: opacity over 18 f + spring (damping 200) 0.94 → 1.

```jsx
<SceneFrame frame={frame} header={false}
  overlay={<BrandTitle frame={frame} eyebrow="AI & LLM Foundation · Ngày 1" title="Bên trong một LLM: dự đoán, chú ý và chi phí" icon="neural-net" />} />
```

Use at the very start of a video (≈ 150 f). Title ≤ 2 lines.
