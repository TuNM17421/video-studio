# StepCounter

An agent-loop counter — "0/3 → 3/3" with pips — for tool calls, retries or steps against a limit.

**Use for** `LƯỢT GỌI CÔNG CỤ 2/3`, `LẦN THỬ LẠI 3/3` reaching the limit, "chờ người dùng — bộ
đếm không tăng" while the loop is paused.
**Not for** the stop rule itself (→ `StopGate`, pair them), a measured quantity or percentage
(→ `MiniBar` / `ProbabilityBars`), a step number badge (→ `NumberBadge`).

Anatomy: card (radius 22, 3 px stroke, bgAlt) · 17/700 label top-left · optional MINH HỌA tag
top-right · `max` pips (r 13, 40 px pitch; filled accent, empty white + dotInactive ring) · count
"2/3" 36/700 right · `paused` footer: divider + amber pause icon + muted note. Width auto-fits.

States: ok (value < max, accent) · limit (value ≥ max → red stroke, pips, number) · paused.
Timing: the scene computes `value` from the frame; pass `at` = the frame the latest pip was
added and that pip pops (popScale).

```jsx
const calls = [60, 110, 160];              // frames at which the agent calls a tool
const n = calls.filter((t) => f >= t).length;
<StepCounter x={1300} y={300} value={n} max={3} label="LƯỢT GỌI CÔNG CỤ"
  illustrative="GIỚI HẠN MINH HỌA" frame={f} at={calls[n - 1]} opacity={appear(f, 20)} />
<StopGate x={1480} y={560} label="ĐỦ 3 LẦN" frame={f} at={calls[2]} />
```

Rules: limits are illustrative → tag them (`illustrative`) · max ≤ 8 pips · the number is ink, not
a role hue · when `paused`, do not increase `value` · the counter reaching max and the paired
`StopGate` triggering happen on the same frame.
