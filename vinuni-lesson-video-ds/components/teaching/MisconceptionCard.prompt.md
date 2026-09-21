# MisconceptionCard

"Nhiều người nghĩ… / thực ra…": the common belief on a muted card, struck through in red, then the
correction on a red card underneath. Use it when the narration names a wrong intuition before fixing it.

Beats: show the belief (≥ 45 f to read) → `strike` 0→1 over ~20 f when the narration says it is wrong →
`reveal` the correction when it is spoken. Never show the correction before the strike.

```jsx
<MisconceptionCard x={460} y={330} w={1000}
  strike={smooth(f, T.strike, T.strike + 20)} reveal={appear(f, T.fix)}
  wrong={{ title: 'MÔ HÌNH TRA CỨU CÂU TRẢ LỜI', sub: 'có sẵn trong một kho dữ liệu' }}
  right={{ title: 'MÔ HÌNH DỰ ĐOÁN TỪNG MẢNH CHỮ', sub: 'theo xác suất, không tra bảng' }} />
```
