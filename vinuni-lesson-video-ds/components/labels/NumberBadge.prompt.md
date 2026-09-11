# NumberBadge · StatusDot

**NumberBadge** — round step marker (r 24): dotInactive fill, 2 px accent stroke, 17 px bold
accentStrong value ("01", "A"). `active` → red-soft fill, red stroke and text. Keep the same radius,
type size and optical center across sibling badges; put it on a card's top edge or left gutter.

**StatusDot** — 9 px dot: accent (normal) or red (`active`, alert). Rows of five dots make a
thinking-pause countdown.

```jsx
<NumberBadge x={card.x + 36} y={card.y} value="02" active={frame >= T.reveal} />
```
