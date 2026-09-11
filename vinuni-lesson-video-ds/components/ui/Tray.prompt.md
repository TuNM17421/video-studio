# Tray

An inbox tray / column (SVG) where items wait, with a header and a count badge.

**Use for** "khay Bản nháp / Chờ người đọc", "khay đầu vào", a three-column pipeline BẢN NHÁP → CHỜ DUYỆT → ĐÃ GỬI.
**Not for** a single item (→ `EmailCard` / `Card`), a black box that transforms things (→ `GlassBox`), a zone around several cards (→ `ZoneLabel` + dashed frame).

Anatomy: bgAlt body · 3 px stroke in the tone color · radius 22 · 68 px header band in the tone's soft fill: LineIcon (default `inbox`) · label 17 / 700 · count badge (tone fill, white number) · children stacked on `trayItemBox(tray, i, { itemH, gap, pad })`, clipped to the tray (an overflowing last item reads as "more below") · empty → dashed "Trống" slot.

States: `tone` names a role (`memory` amber = waiting, `output` green = done, `input` blue, `check` orange) — outline and header only · `red` = blocked · `active` 0–1 red outline when an item lands (`pulse`) · `opacity`. No MINH HỌA tag of its own — the items carry it.

```jsx
const DRAFTS = { x: 200, y: 300, w: 420, h: 520 };
<Tray {...DRAFTS} label="BẢN NHÁP" icon="pencil" count={revealCount(3, frame, 40, 20)}>
  {[0, 1, 2].map((i) => (
    <Card key={i} {...trayItemBox(DRAFTS, i, { itemH: 110 })} lines={['THƯ NHẮC HẠN', `HS-01${7 + i}`]}
      opacity={appear(frame, 40 + i * 20)} />
  ))}
</Tray>
<Tray x={700} y={300} w={420} h={520} label="CHỜ DUYỆT" icon="hourglass" tone="memory" count={0} active={pulse(frame, 120)} />
```

Rules: same `w`/`h` for trays in one row, ≥ 20 px apart, connected with `Flow` between `anchor(tray, 'right')` / `'left'` · keep `count` in step with the visible items · ≤ 4 visible items per tray.
