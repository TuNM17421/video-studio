# PhoneFrame

A generic, fictional mobile-app screen mock (SVG) whose body holds any SVG screen content — the
phone counterpart of `BrowserFrame`.

**Use for** a mock phone screen the script describes: "màn hình điện thoại", "app điện thoại giả
định", "ứng dụng chat trên di động", so sánh Do/Don't kiểu app.
**Not for** a web/desktop window (→ `BrowserFrame`), an ảnh chụp NGUỒN THẬT (→ `Evidence`), a chat
app rendered full-window without a phone body (→ `ChatWindow` alone).

Anatomy: white body · 3 px accent stroke · radius 44 (fixed, device shape — not a scaling knob) ·
bgAlt status bar (48 px; 40 px compact when `w < 300`) with `time` (left, 16/700), optional
`appName` (center, 15/700, hidden when compact) and a right-aligned icon cluster — signal bars,
wifi, battery, all hand-drawn primitives, **never a real OS glyph** · body = `children` in scene
coordinates, clipped to the phone · `variant` bottom decoration drawn OVER children · MINH HỌA tag
in the content box's top-right (drawn above children).

States: `opacity` for entrances. `illustrative` **defaults to true** (pass a string for another
label, `false` only if the scene tag already covers it).

## `variant`

| Variant | Bottom decoration |
|---|---|
| `'plain'` (default) | Just a home-indicator pill. |
| `'chat'` | Footer input pill ("Nhắn tin…") + accent send button, plus the home indicator. |
| `'camera'` | Toolbar: flip-camera glyph, shutter ring, gallery-thumbnail swatch, plus the home indicator. |

The bottom decoration is drawn **after** `children`, so it always sits on top — when using `'chat'`
or `'camera'`, leave ~90–140 px of empty space near the bottom of your content so nothing gets
covered.

```jsx
const PHONE = { x: 220, y: 160, w: 320, h: 693 };
const b = phoneContentBox(PHONE, 24); // where content goes
<PhoneFrame {...PHONE} appName="Flora" variant="chat">
  <SvgText x={b.x} y={b.y + 30} size={17} weight={700} anchor="start" color={C.accent}>HÔM NAY</SvgText>
  <SvgText x={b.x} y={b.y + 70} size={24} weight={700} anchor="start">Tưới cây lúc 7:00 sáng</SvgText>
</PhoneFrame>
```

Rules: always place children with `phoneContentBox(box, pad)` — never eyeball below the status bar
· `appName` is a fictional name (never a real product/brand — pick something short that doesn't
collide with an existing app, e.g. `Flora`, `ChefAI`, `Nhật Ký`) · no Apple/Samsung/Android glyphs
or logos, status icons are hand-drawn primitives only · keep content sparse (one heading + 2–4 rows)
so it reads at video size · side by side for comparison: `w ≈ 260–320` each.

## Ví dụ Do/Don't (hai khung cạnh nhau + thẻ chú thích)

Bố cục chuẩn cho một so sánh Do/Don't: hai `PhoneFrame` cùng kích thước, cạnh nhau, mỗi khung có
một `Card` chú thích ngay phía dưới (label + accent màu theo ý nghĩa — `C.accent` cho "NÊN",
`C.red` cho "KHÔNG NÊN"). Copy khối này và đổi nội dung `children` theo cảnh của bạn:

```jsx
const GAP = 60;
const PW = 280;
const PH = 606;
const Y = 140;
const LEFT = { x: 260, y: Y, w: PW, h: PH };
const RIGHT = { x: LEFT.x + PW + GAP, y: Y, w: PW, h: PH };
const CAP_H = 84;
const CAP_Y = Y + PH + 28;

<>
  {/* NÊN — một CTA rõ ràng, nội dung thưa */}
  <PhoneFrame {...LEFT} appName="Flora" variant="chat">
    {(() => {
      const b = phoneContentBox(LEFT, 26);
      return (
        <>
          <SvgText x={b.x} y={b.y + 28} size={16} weight={700} anchor="start" color={C.accent}>
            HÔM NAY
          </SvgText>
          <SvgText x={b.x} y={b.y + 68} size={22} weight={700} anchor="start">
            Tưới cây lúc 7:00
          </SvgText>
          <UIButton x={b.x} y={b.y + 108} w={b.w} label="Xác nhận" icon="check" />
        </>
      );
    })()}
  </PhoneFrame>
  <Card x={LEFT.x} y={CAP_Y} w={PW} h={CAP_H} icon="check" accent={C.accent}
        lines={['NÊN', 'Một hành động, một CTA rõ']} />

  {/* KHÔNG NÊN — nhồi quá nhiều dòng, không CTA nào nổi bật */}
  <PhoneFrame {...RIGHT} appName="Flora" variant="chat">
    {(() => {
      const b = phoneContentBox(RIGHT, 20);
      return (
        <>
          {['Tưới cây 7:00', 'Bón phân thứ Ba', 'Kiểm tra sâu bệnh', 'Cắt tỉa cuối tuần', 'Đo pH đất'].map((t, i) => (
            <SvgText key={i} x={b.x} y={b.y + 26 + i * 30} size={16} weight={600} anchor="start" color={C.textMuted}>
              {t}
            </SvgText>
          ))}
        </>
      );
    })()}
  </PhoneFrame>
  <Card x={RIGHT.x} y={CAP_Y} w={PW} h={CAP_H} icon="x" accent={C.red}
        lines={['KHÔNG NÊN', 'Liệt kê hết, không hành động nào nổi bật']} />
</>
```

`Card` cần một `icon` hợp lệ trong `LINE_ICON_NAMES` (`check`, `x`, …) và nhận `accent` để tô
viền/nhãn theo màu NÊN/KHÔNG NÊN — xem `components/cards/Card.jsx`.
