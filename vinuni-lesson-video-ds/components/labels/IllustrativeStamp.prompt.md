# IllustrativeStamp

The standard honesty mark for illustrative data, mock screens, logs, numbers and designed options.

**Use for** every figure the script marks as not real: `MINH HỌA`, `TÓM TẮT MINH HỌA` (a summarised model "reason"),
`LỖI MINH HỌA` (a staged error), `CHƯA CHẠY THẬT` (a prepared, not-run test), `PHƯƠNG ÁN THIẾT KẾ` (a design option),
`GIỚI HẠN MINH HỌA` (an example limit). **Not for** the scene-type tag in the header (→ SceneFrame `tag`) or a generic label (→ `Pill`).

Anatomy: `tag` = red-soft pill, 2 px red stroke, 17/700 letter-spaced red text · `stamp` = double red outline, −6°
rotation, white 85 % fill — laid over a table or result · `watermark` = 8 % red diagonal text behind a whole mock.

Many components take `illustrative` (true | label) and place this tag at their top-right corner themselves —
use that prop instead of positioning a stamp by hand.

```jsx
<IllustrativeStamp x={1792} y={228} anchor="top-right" />
<IllustrativeStamp x={960} y={600} label="LỖI MINH HỌA" variant="stamp" anchor="center" />
<DataTable … illustrative="CHƯA CHẠY THẬT" />
```

Rules: one stamp per illustrative object, visible for the whole time the object is on screen · wording verbatim from
the list · never on real sourced data (then cite with `SourceCard`).
