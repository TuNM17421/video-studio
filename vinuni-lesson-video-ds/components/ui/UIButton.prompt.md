# UIButton

A generic app-button mock (SVG) for mock screens, with pressed / disabled / locked states.

**Use for** "Hai nút Gửi thư và Sửa hạn có ổ khóa", nút "CHUYỂN KHOẢN" (danger), "nút thử lại" — an action an agent may or may not take.
**Not for** a label or tag (→ `Pill` / `Chip`), a diagram step (→ `Card`), a real product's button look.

Anatomy: radius 14 rect, h 64 · optional LineIcon (label size + 6) · label 20 / 700, centered as a group. Variants: **primary** accent fill, white text · **secondary** white fill, 2.5 px accent stroke · **danger** red fill (irreversible / money / delete) · **ghost** text only.

States: `default` · `pressed` (darker fill, 96 % scale) · `disabled` (dotInactive fill, muted text) · `locked` (disabled look + red lock badge on the top-right corner = blocked by a rule / needs approval). Timing: `frame` + `pressAt` → press 0→1→0 over 12 frames (peak +4); pair with a `Cursor` click at the same frame. No MINH HỌA tag of its own (the enclosing `BrowserFrame` has it).

```jsx
<UIButton x={640} y={700} w={220} label="Gửi thư" icon="send" state={locked ? 'locked' : 'default'} />
<UIButton x={890} y={700} w={220} label="Sửa hạn" icon="pencil" variant="secondary" state="locked" />
<UIButton x={640} y={800} w={260} label="CHUYỂN KHOẢN" variant="danger" frame={frame} pressAt={120} />
```

Rules: 1–2 words (or one short UPPERCASE verb phrase) · danger only for irreversible actions · leave ≥ 24 px right/top clearance for the lock badge · put buttons inside a `BrowserFrame` body, not loose on the stage.
