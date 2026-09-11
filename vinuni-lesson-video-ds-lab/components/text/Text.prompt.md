# SvgText · Multiline · RichText

Text inside the scene SVG. `y` is the **baseline** (SvgText) or the **middle of the block** (Multiline).

- `SvgText` — one line; defaults 25 px / 600 / centered / `C.text`. Pass `family={MONO}` for code.
- `Multiline` — 1–3 centered lines; defaults 24 px, line height 33; `firstWeight={700}` for the
  "UPPERCASE noun / lowercase explanation" card pattern.
- `RichText` — one sentence where a key word changes color: `spans={[{ text: 'Trời hôm nay thật nắng và ' }, { text: 'đẹp', color: C.red }]}`.

Type roles (px): title 50 · headline 40 · body 24 · card-sub 21 muted · label 18 · micro 17 (UPPERCASE).
Only weights 500 / 600 / 700. Nothing below 16 px except heatmap axis labels (14 px).

```jsx
<SvgText x={960} y={464} size={21} weight={700} color={C.accentStrong}>CÙNG ĐIỀU KIỆN → CÙNG TRẠNG THÁI</SvgText>
<Multiline x={630} y={360} lines={['CÔNG TẮC', 'đóng mạch']} firstWeight={700} />
```

SVG text does not wrap: break lines yourself and size boxes for the longest line
(≈ 0.6 × size px per character for lowercase, ≈ 0.72 × size for UPPERCASE; `textWidth()` estimates).
