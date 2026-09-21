# PhotoCard

A documentary picture — "ảnh tư liệu" — on a white mat with its credit line: a historical photo
(Alan Turing, hội thảo Dartmouth 1956), a real object whose shape is the point (chip, máy, robot), or a
paper figure shown exactly as published (Figure 1 of "Attention Is All You Need").

**Use only** for a slot the video editor approved in the video's `images.js` (kind `use`). Copy `src`,
`credit`, `caption`, `width`/`height` → `imgW`/`imgH` from there. **Never** search for, download or add
a picture yourself, and never use one to illustrate what an animation can explain (a process, a
comparison, a loop) — animation stays the default. A slot of kind `reference` is **not** drawn with
PhotoCard: Read the picture and redraw the idea with components.

Anatomy: white card (radius 22, 3 px dotInactive) · picture on a 14 px mat, radius 12, bgAlt field
behind `contain` letterboxing · caption 20/700 · credit 14/600 muted, wrapped, never cut. No "ẢNH TƯ LIỆU" / MINH HỌA label on
or beside the picture — a real photo reads as one.

```jsx
import { IMAGES } from './images.js';
const s3 = IMAGES.s3;
<PhotoCard x={180} y={270} w={620} h={660} src={s3.src} credit={s3.credit} caption={s3.caption}
  imgW={s3.width} imgH={s3.height} kenBurns={linearProgress(frame, 0, 240)} opacity={appear(frame, 8)} />
```

Rules: the picture is the subject of the scene — give it ≥ 40 % of the content zone, put the narrated
idea beside it (a `Card`, a timeline mark), not on top of it · the credit stays readable and inside the
content zone (y 250–960), never under the subtitle bar · `fit="contain"` for people and paper figures
(do not crop a face or a figure label); `cover` only for a scene/object photo with room to spare · no
filters, tints, fake-vintage frames, no text drawn over the picture · `kenBurns` slow (a whole cue),
never on a paper figure · one PhotoCard per scene.
