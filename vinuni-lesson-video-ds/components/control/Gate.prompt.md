# Gate

A checkpoint barrier sitting on a connector — permission, human approval, validation or source check.

**Use for** the point where a flow is let through or stopped: `CỔNG QUYỀN` chặn công cụ, `CỔNG DUYỆT`
trước nút gửi, `ĐỐI CHIẾU NGUỒN` trước khi câu trả lời đến người dùng.
**Not for** a whole permitted zone (→ `PermissionBoundary`), a human review card with a draft
(→ `ApprovalStep`), an agent loop's stop condition (→ `StopGate`), a plain "blocked" tag (→ `Chip` tone red).

Anatomy: 64 px-thick rounded post (default 64×164, radius 18, 3 px stroke in the state hue, soft
fill) · 52 px white disc at the center with the state LineIcon · 17/700 uppercase label 34 px below.

States: `open` green + lock-open · `blocked` red + lock + red-soft fill · `error` orange +
triangle-alert · `pending` amber + hourglass. `frame` + `at` → one 54-frame `pulse()` when
something arrives (stroke 3→5 + halo). `orientation="horizontal"` for a vertical connector.

Stopping a particle: end the Flow at `gateStop(gate)` (left edge − 10 px), and draw the path the
item never takes as a dashed `StaticPath` in `C.dotInactive` from `gateStop(gate, 'right')` to a
dashed / muted target card.

```jsx
const M = { x: 300, y: 430, w: 380, h: 170 }, T = { x: 1240, y: 430, w: 380, h: 170 };
const G = { x: 960, y: 515 };
<Card {...M} label="MÔ HÌNH" lines={['ĐỀ XUẤT', 'gửi thư cho khách']} />
<Flow points={[anchor(M, 'right'), gateStop(G)]} frame={f} start={30} end={70} color={C.red} />
<Gate {...G} state="blocked" label="CỔNG QUYỀN" frame={f} at={70} opacity={appear(f, 10)} />
<StaticPath points={[gateStop(G, 'right'), anchor(T, 'left')]} color={C.dotInactive} dashed />
<Card {...T} label="CÔNG CỤ" lines={['GỬI THƯ', 'không được chạy']} dashed muted={0.7} />
```

Rules: put the gate's `y` on the connector's y · it is visible before the particle arrives ·
`at` = the Flow's `end` · a blocked gate never has a live Flow on its far side · label ≤ ~18
characters (it is centered under a 64 px post; keep ≥ 180 px between neighbouring gates) ·
role hues only on the gate itself, never on the particle.
