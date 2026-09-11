# LineIcon

Lucide line icons normalised to the kit's icon style (40 generic concepts), placed like `Icon`.

**Use for** generic system concepts the 20 hand-drawn icons don't cover: `lock`, `lock-open`, `shield-check`, `mail`,
`send`, `search`, `server`, `plug`, `wrench`, `braces`, `terminal`, `app-window`, `mouse-pointer`, `inbox`, `archive`,
`clock`, `hourglass`, `octagon-x`, `circle-help`, `user-check`, `stamp`, `git-branch`, `refresh-cw`, `triangle-alert`…
**Not for** a named product or technology (→ `Brand`), or a concept already in the hand-drawn set (→ `Icon`:
document, database, robot, users, gear, code, check…) — prefer `Icon` when both exist so a scene keeps one hand.

Anatomy: 24-grid Lucide glyph drawn at stroke 1.125, which equals the hand-drawn set's 3 px on a 64 grid ·
round caps and joins · no fill · stroke = `color` (a `C` token; tints via opacity) · centered on (x, y).

```jsx
<LineIcon name="lock" x={960} y={420} size={56} color={C.red} />
<LineIcon name="server" x={1500} y={300} size={48} />
```

Rules: size 30 inside a card label row, 48 standalone, 96 max · same color rules as `Icon` (accent by default, red only
for emphasis / blocked) · don't mix more than one icon family inside a single card.
