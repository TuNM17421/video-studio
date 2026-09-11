# DecisionNode

The flowchart diamond: one question, two or more exits.

**Use for** "ĐỦ THÔNG TIN?", "CẦN GỌI TOOL?", "trả lời ngay hay gọi tool" — a yes/no or multi-way check an
agent/app makes before acting.
**Not for** routing by a score into several labeled lanes (→ `BranchRouter`), a permission barrier
(→ `Card` with a lock icon, or the control-group gate component), a step (→ `Card`).

Anatomy: centered on (x, y), `size` = tip-to-tip diagonal (default 220) · rotated square, radius 14, bgAlt fill,
3 px tone stroke · 21/700 uppercase question inside (1–2 lines, array = line breaks) or `labelPos="below"`
(circle-help icon inside, question under the bottom tip) · `decisionPorts(props)` → `{top, right, bottom, left}`.

States: `idle` · `active` (red-soft fill, 5 px red stroke; with `frame`/`at` a red ring pulses once, 54 f) ·
`resolved` (neutral again + red `answer` chip beside `answerSide` tip; top/bottom chips sit left of the tip).

```jsx
const D = { x: 900, y: 600, size: 220 }, P = decisionPorts(D);
<DecisionNode {...D} label={['CẦN', 'GỌI TOOL?']}
  state={frame < 120 ? 'active' : 'resolved'} frame={frame} at={90} answer="CÓ" answerSide="bottom" />
<Flow points={[P.bottom, { x: P.bottom.x, y: 800 }, anchor(TOOL, 'left')]} frame={frame} start={120} end={160} color={C.red} />
```

Rules: question ≤ 2 lines of ~12 chars at size 220 (else `labelPos="below"`) · exits start at the ports and
carry the branch meaning on the target cards · the chosen exit is red, the other muted.
