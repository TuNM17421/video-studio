# Cursor

A generic mouse pointer (SVG) that glides between waypoints and shows click ripples.

**Use for** "con trỏ chuột di chuyển trên giao diện" — an agent or user operating a mock screen (click "Nộp bài", open a mail).
**Not for** pointing at a diagram part (→ an arrow / `Flow`), an icon of "computer use" in a card (→ `LineIcon name="mouse-pointer"`).

Anatomy: white arrow, 2.5 px navy (`C.text`) outline, tip = the point · ripple ring r 8 → 38, 3 px `color` (default red), fading over 18 frames, plus a small filled dot for the first 9 frames.

Timing: `path` = `[{x, y, at, click?}]`; the tip eases (EASE.inOut) to each waypoint, arriving at its `at` · `click: true` → the arrow dips to 86 % (3 frames) and back (+9) and the ripple plays · `click: <frame>` clicks later than arrival · no `frame` → settled on the last point · static: `x`, `y`. No MINH HỌA tag (the screen it moves over carries one).

```jsx
<Cursor frame={frame} path={[
  { x: 420, y: 520, at: 60 },
  { x: 812, y: 648, at: 90 },
  { x: 812, y: 648, at: 96, click: true },
]} />
<UIButton x={700} y={616} w={220} label="Nộp bài" icon="send" frame={frame} pressAt={96} />
```

Rules: draw it LAST (above the screen) · sync a `UIButton pressAt` with the click frame · 20–40 frames per move, a 4–8 frame hold before clicking · one cursor per scene.
