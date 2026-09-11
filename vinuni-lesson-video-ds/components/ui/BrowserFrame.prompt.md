# BrowserFrame

A generic, fictional app / web window mock (SVG) whose body holds any SVG screen content.

**Use for** a mock screen the script describes: "Bốn màn hình giả lập (trang LMS, hộp thư)", "màn hình người dùng nhỏ", a page an agent opens.
**Not for** a chat app (→ `ChatWindow`), a single email (→ `EmailCard`), a named real product (→ `Brand`, never a look-alike), a plain diagram box (→ `Card`).

Anatomy: white body · 3 px accent stroke · radius 22 · bgAlt title bar 56 px (44 px when `w < 480`) with three window dots, optional tab `title` (17 / 700 accent), address pill (lock/globe + `url`, 17 / 600 muted, ellipsized) · hairline divider · body = `children` in scene coordinates, clipped to the window · MINH HỌA tag in the body's top-right (drawn above children).

States: `active` 0–1 → 5 px red outline (drive with `pulse`) · `opacity` for entrances · `illustrative` **defaults to true** (pass a string for another label, `false` only if the scene tag already covers it).

```jsx
const LMS = { x: 180, y: 290, w: 900, h: 560 };
const b = browserContentBox(LMS, 28); // where content goes
<BrowserFrame {...LMS} title="Lớp CLASS-A" url="lms.truong.edu.vn/lop/CLASS-A/bai-tap" opacity={appear(frame, 10)}>
  <SvgText x={b.x} y={b.y + 26} size={17} weight={700} anchor="start" color={C.accent}>BÀI TẬP TUẦN 3</SvgText>
  <SvgText x={b.x} y={b.y + 66} size={28} weight={700} anchor="start">Bài 3 · hạn 21:00 thứ Sáu</SvgText>
  <UIButton x={b.x} y={b.y + 110} w={200} label="Nộp bài" icon="send" frame={frame} pressAt={96} />
</BrowserFrame>
```

Rules: always place children with `browserContentBox(box, pad)` — never eyeball below the bar · fictional URLs only (`*.truong.edu.vn`), no real brands · keep content sparse (one heading + 2–4 rows) so it reads at video size · several small screens: `w ≈ 360–420` (compact bar).
