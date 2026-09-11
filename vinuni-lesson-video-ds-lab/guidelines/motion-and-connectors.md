# Motion & connectors

The motion grammar of the lesson videos, distilled from `lib/motion.js`, the Remotion scenes and the
production-QA contract (`visual-motion-contracts.md`). Frames at 30 fps are the only clock.

## 1. The frame clock

```jsx
import { useFrame, appear, pulse, fadeWindow, linearProgress } from '../lib/index.js';

export default function MyScene() {
  const frame = useFrame();            // Remotion: useCurrentFrame() / useAuthoredFrame()
  const T = { card: 20, flow: [40, 100], result: 90 };   // named frame constants, all < duration
  return (
    <SceneFrame frame={frame} eyebrow="NGÀY 02 · …" title="…">
      <Card x={120} y={400} w={360} h={160} lines={['YÊU CẦU']} opacity={appear(frame, T.card)} />
      <Flow points={[…]} frame={frame} start={T.flow[0]} end={T.flow[1]} />
      <Card … opacity={appear(frame, T.result)} active={pulse(frame, T.flow[1])} />
    </SceneFrame>
  );
}
```

- Pure function of `frame`: no `Math.random()` (use a seeded function of the index), no `Date.now()`,
  no CSS transitions / keyframes, no React state for animation.
- One named constant per beat (`T.card`, `T.flow`). Derive dependent beats from upstream constants
  (`T.result = T.flow[1] - 10`), never scattered magic numbers.
- Every constant must fall inside the scene duration — a beat timed past the end silently never shows.
- If a hook runs first, authored content uses `c = frame − 150`.

## 2. Easing & beats

| Name | Definition | Use |
|---|---|---|
| `EASE.out` | `cubic-bezier(0.16, 1, 0.3, 1)` | every reveal (`appear`, `progress`) |
| `EASE.inOut` | in-out cubic ≈ `cubic-bezier(0.65, 0, 0.35, 1)` | smooth moves, slide-ins (`smooth`) |
| `EASE.draw` | `cubic-bezier(0.65, 0, 0.35, 1)` | hook underline, drawn accents |
| `EASE.exit` | `cubic-bezier(0.4, 0, 1, 1)` | hook exit, backdrop |
| linear | — | particle travel, parameter sweeps, count-ups |

| Helper | Frames | Shape |
|---|---|---|
| `appear(f, s, d = 24)` | 24 | 0 → 1 with `EASE.out` |
| `fade(f, s, d = 24)` | 24 | 0 → 1 linear |
| `fadeWindow(f, s, e, span = 24)` | 24 + 24 | 0 → 1 → hold → 0 |
| `pulse(f, at, d = 54)` | 54 | 0 → 1 at 32 % → 0 (drive `active`) |
| `smooth(f, s, e, a, b)` | any | eased value a → b |
| `enterScale(f)` | ~20 | spring damping 200: 0.94 → 1 (title cards) |
| `popScale(f)` | ~25 | spring 13 / 140: small overshoot (icons, badges) |
| `countUp(f, s, e, a, b)` | any | continuous number |

Springs use Remotion's physics (`spring({ frame, config: { damping, stiffness, mass } })`):
damping 200 = smooth settle, 12–14 = gentle pop. Never elastic/bouncy text.

## 3. Scene rhythm

- **Input** 15–20 % of the scene: the data appears (cards, particles enter).
- **Transform** 50–60 %: data passes through the machine, recolors (`accent` → `red`), bars reshape.
- **Output** 20–25 %: the result / distribution / chosen branch, then a readable hold.
- Parameter sweeps hold ≥ 45 f at each extreme; the final state holds ≥ 60 f.
- Scenes are joined by hard cuts. Inside a scene, a replaced diagram leaves by `fadeWindow` and the
  new one enters after it — the overlap must never show two complete diagrams.

## 4. The connector contract

The drawn connector is the geometric authority for anything that moves along it.

1. **Declare rectangles first** for every card, its text-safe inset, icon slot and badge. Derive
   connector endpoints from card anchors: `anchor(card, 'right')` → `anchor(next, 'left')`.
2. **One polyline** (`points`) feeds both the stroke reveal and the particle position:
   `distance = progress × length`, `point = pointAtDistance(points, distance)` — `Flow` does exactly
   this. Never compute a separate `y`, sine bob or floating path for the dot.
3. **Card faces are opaque to particles**: the dot shows only on the empty connector between cards.
   `Flow` hides it within `clearance` (18 px) of both ends and inside any `hideIn` bounds.
4. **Arrival**: the receiving card must already be visible; it pulses exactly once
   (`active={pulse(frame, arrivalFrame)}`); the dot reappears on the exit edge of the next connector.
5. **Speed**: progress is linear and monotonic — no easing, reversing, looping or teleporting. For a
   chain of segments, allocate frames proportional to length so speed looks constant.
6. **Labels travel in a reserved lane** above the path with a fixed gap; hide the label and its
   leader whenever the dot is hidden.
7. **Parallel or converging lines get separate lanes**; junctions meet cleanly, no stubs.
8. **Enclosures** are sized from the union of the enclosed cards plus a consistent margin.
9. Check the first sparse state **and** the densest final state — later reveals often expose overlaps.

```jsx
const req = { x: 120, y: 420, w: 300, h: 150 };
const model = { x: 620, y: 380, w: 420, h: 230 };
<Flow
  points={[anchor(req, 'right'), anchor(model, 'left')]}
  frame={frame} start={40} end={90}
  hideIn={[req, model]}
/>
<GlassBox {...model} label="MÔ HÌNH" active={pulse(frame, 90)} />
```

Particle states along a multi-stop path (the `S1DefScene` pattern) are one pure function
`(index, frame) → { x, y, color, opacity } | null` with one branch per phase
(input → through the machine, recoloring at ~70 % → branching output on a quadratic curve).

## 5. Continuous numeric motion

- Numbers, gauges and bars animate from the same continuous value; round only for display.
- Interpolate through milestones (`20 → 40 → 60`) instead of jumping between them.
- The final number and the threshold marker must agree.

## 6. Reveal timing & state ownership

- Arrival, pulse, content reveal and exit are named constants; one component owns each pulse.
- A downstream action starts from the upstream end constant (`T.reply = T.newData[1] + 12`).
- Never reveal a card after its arrival event has already happened.
- Mutually exclusive states (question vs. answer) are truly exclusive: keep options neutral until the
  reveal frame; check the reveal frame and its ±1 neighbours.

## 7. Hook → scene

The hook (`HookOverlay`, 150 f) belongs to scene 1: text in 8→28, underline 30→58, text out 116→132,
white backdrop out 134→149. Authored content must not start before the hook clears — offset it
(`c = frame − 150`) and check that the first content state is not skipped.

## 8. Anti-patterns

Floating/bobbing dots, dots crossing card faces, a line and its dot with different easings, looping
particles without a "live traffic" meaning, zoom/pan camera moves, rotation, CSS keyframes, random
jitter, count-ups that jump, labels sliding over connectors, content under the subtitle bar.
