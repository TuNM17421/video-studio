# VinUni Lesson Video — how to build with this kit

Everything here renders **lesson-video scenes: a fixed 1920×1080 stage at 30 fps**, white background,
Vietnamese copy. It is NOT a responsive web-UI kit — there are no buttons, inputs or layout grids.

## Setup: stage → SceneFrame → absolute SVG

1. **A scene is a component that renders a pure function of the frame** — read it with `useFrame()`
   and drive every value with the motion helpers (`appear`, `fade`, `pulse`, `interpolate`, `spring`,
   `smooth`). Never use CSS transitions, timers, wall-clock time or `Math.random`.
2. **Show a scene with `Player`** inside a positioned 16:9 box (`Player` is `position:absolute; inset:0`
   and scales the 1920×1080 stage to fit). Without a sized, `position:relative` parent it collapses to 0 px.
3. **Wrap scene content in `SceneFrame`**: it draws the header (eyebrow · title · divider · corner
   `tag`), watermark, footer and the burned-in subtitle bar, and gives children an `<svg>` in the
   1920×1080 viewBox plus an `overlay` slot for HTML beats. `variant="editorial"` = Day28 look (grid, `kicker`, `titleAccent`, `subtitle`).
4. **Diagram components are SVG fragments placed with absolute scene px** (`x`, `y`, `w`, `h`) —
   `Card`, `GlassBox`, `GlassNode`, `Flow`, `Pill`, `Chip`, `TokenChip`, `ProbabilityBars`, `Icon`…
   Render them only inside `SceneFrame` children or your own `<svg viewBox>`. Never flex/grid them.
5. **Font gotcha:** `SvgText` / `Multiline` / `RichText` (used inside every card) set no font — they
   inherit Montserrat from `.vk-scene`. In a bare `<svg>` outside `SceneFrame`, set
   `style={{ fontFamily: 'var(--font-sans)' }}` on the svg or all text falls back to serif.

```jsx
const { Player, SceneFrame, Card, Flow, anchor, appear, pulse, useFrame, C } = window.VK;
const A = { x: 300, y: 380, w: 420, h: 170 }, B = { x: 1200, y: 380, w: 420, h: 170 };
function Scene() {
  const f = useFrame();
  return (
    <SceneFrame frame={f} eyebrow="NGÀY 03 · TỪ MÔ HÌNH ĐẾN TÁC TỬ" title="Nhận thức và suy luận"
      tag="MINH HỌA" caption="Mình gắn bốn nhóm việc với bốn tên trong sơ đồ.">
      <Card {...A} label="NHẬN THỨC" lines={['NHẬN THÔNG TIN', 'câu hỏi · tài liệu']} opacity={appear(f, 0)} />
      <Flow points={[anchor(A, 'right'), anchor(B, 'left')]} frame={f} start={30} end={80} color={C.red} />
      <Card {...B} accent={C.red} label="SUY LUẬN" lines={['CHỌN VIỆC TIẾP', 'hỏi lại mã lớp']}
        opacity={appear(f, 20)} active={pulse(f, 80)} />
    </SceneFrame>
  );
}
<div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9' }}>
  <Player scene={Scene} duration={150} />
</div>
```

## Styling idiom: tokens as JS props, not classes

- **Color = the 9 `C` tokens** for everything by default, passed as props (`accent`, `color`, `fill`): `C.bg`, `C.bgAlt`,
  `C.text`, `C.textMuted`, `C.accent`, `C.accentStrong`, `C.red`, `C.redSoft`, `C.dotInactive`.
  Meaning: `accent` blue = data / neutral · `red` = emphasis / chosen / blocked / risk / answer · `bgAlt` = card
  body · `dotInactive` = tracks, dividers, inactive. Tints only via `alpha('red', 0.24)`. No new hex, no gradients.
- **Role hues `ROLE` / `ROLE_OF`** (purple · green · orange · amber + `…Soft`) exist ONLY for zone labels, outlines and
  soft fills that name a role the lesson color-codes: `ROLE_OF.input` blue · `process`/`reasoning` purple · `output` green ·
  `check`/`action` orange · `memory` amber (`const [stroke, fill] = ROLE_OF.reasoning`). Never body text, numbers or particles.
- **Honesty:** illustrative data, mock screens, logs and numbers carry `IllustrativeStamp` — or set the component's
  `illustrative` prop (true or a label: 'TÓM TẮT MINH HỌA', 'LỖI MINH HỌA', 'CHƯA CHẠY THẬT', 'PHƯƠNG ÁN THIẾT KẾ', 'GIỚI HẠN MINH HỌA').
- **Icons:** every `icon` prop and `<Icon name>` accepts the 20 hand-drawn names AND the 40 `LineIcon` (Lucide) names
  (`lock`, `mail`, `server`, `wrench`, `braces`, `search`, `octagon-x`… — see `LINE_ICON_NAMES`). A named product uses
  `<Brand name="claude|anthropic|gemini|meta|mcp|github|python|huggingface">` in its own colors, never a look-alike icon.
- **Geometry = `LAYOUT`** (safe content area y 250–960, x 80–1840; nothing important below y 984 —
  the subtitle bar). Connect cards with `anchor(box, 'left'|'right'|'top'|'bottom')`, never eyeballed points.
- **Type = Montserrat 500/600/700** at canvas px; CSS vars `--font-sans`, `--fs-title` (50), `--fs-body` (24),
  `--fs-micro` (17)… for any HTML you add in `overlay`. Colors in CSS: `--color-accent`, `--color-red`, `--color-bg-alt`, `--color-text`.
- Copy: line 1 UPPERCASE noun, line 2 lowercase explanation; ≤ 3 lines per card; captions ≤ 78 chars;
  illustrative numbers carry `MINH HỌA`.

## Where the truth lives

- `tokens/colors_and_type.css` (all tokens + type scale) and `_ds_bundle.css` (the `.vk-*` scene/player classes).
- `components/<group>/<Name>/<Name>.prompt.md` — per-component use / not-for / anatomy / states; read before using one.
- `guidelines/` — motion & connector rules (`Flow` particle contract, beat timings), content & copy, workflow.
