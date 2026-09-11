# StopGate

One stop condition of an agent loop — an octagon that turns red when the loop must stop.

**Use for** the row of stop rules beside a loop: `HẾT BƯỚC`, `ĐỦ 3 LẦN`, `CẦN NGƯỜI`, `HẾT GIỜ` —
and the moment one of them fires.
**Not for** a permission checkpoint on a connector (→ `Gate`), a human review card (→
`ApprovalStep`), the call count itself (→ `StepCounter`).

Anatomy: octagon (circumradius 48, flat top, 3 px stroke) · 40 px LineIcon inside (preset:
list-checks · repeat · user-check · clock; else `icon`, fallback x) · 17/700 label 34 px below ·
optional lowercase `detail` (17/500 muted) under it.

States: idle = white fill, accent stroke + icon, ink label · triggered = red-soft fill, 5 px red
stroke, red icon + label. `frame` + `at` → triggers at `at` with a 54-frame pulse halo.

```jsx
{['HẾT BƯỚC', 'ĐỦ 3 LẦN', 'CẦN NGƯỜI', 'HẾT GIỜ'].map((label, i) => (
  <StopGate key={label} x={1260 + i * 170} y={560} label={label}
    opacity={appear(f, 20 + i * 8)} frame={f} at={label === 'ĐỦ 3 LẦN' ? 150 : undefined} />
))}
```

Rules: space gates ≥ 170 px apart (labels are centered, ≤ ~14 chars; `detail` ≤ ~16) · at most
one triggers per beat · trigger on the frame the counter/particle reaches it · limits in `detail`
are illustrative — put a `MINH HỌA` tag on the scene (SceneFrame `tag`) or the paired `StepCounter`.
