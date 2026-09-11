# ApprovalStep

The human-in-the-loop step: a draft waits for a person before its action button unlocks.

**Use for** "Thẻ Chờ duyệt đứng trước nút Lưu đang khóa", "Minh duyệt", a refund the agent may
propose but not execute, a draft email that needs sign-off before `GỬI`.
**Not for** a bare checkpoint on a connector (→ `Gate` state `pending`), a stop condition of an
agent loop (→ `StopGate` "CẦN NGƯỜI"), a generic input/output card (→ `Card`).

Anatomy (default 440×260): card radius 22, 3 px stroke in the state hue, bgAlt fill · header =
state LineIcon + 17/700 status label · title 24/700 · ≤ 2 body lines 20/500 muted · footer:
reviewer micro label (user-check) left · action button right (50 px pill; locked = dotInactive +
lock + muted text; unlocked = accent fill + white send icon + text).

States: `waiting` amber hourglass, locked · `approved` green user-check, unlocked · `rejected`
red x, locked · `edited` purple pencil, unlocked. With `frame` + `at` the card shows `waiting`
until `at`, then `state` with a 54-frame pulse and the button popping in.

```jsx
<Card x={220} y={450} w={380} h={170} label="MÔ HÌNH" lines={['BẢN NHÁP', 'ghi chú cuộc họp']} />
<Flow points={[{ x: 600, y: 535 }, { x: 800, y: 535 }]} frame={f} start={30} end={60} />
<ApprovalStep x={810} y={405} w={560} h={260} title="Ghi chú cuộc họp"
  lines={['3 việc cần làm,', 'hạn chót thứ Sáu']} reviewer="Người duyệt: Minh" action="LƯU"
  state="approved" frame={f} at={120} opacity={appear(f, 40)} illustrative />
```

Rules: title ≤ ~26 chars at w 440 (widen `w` for longer) · the card is on screen (waiting) before
the decision frame · only one ApprovalStep changes state per beat · the action stays locked for
`rejected` — never animate a rejected send · role hues are on the outline/header only.
