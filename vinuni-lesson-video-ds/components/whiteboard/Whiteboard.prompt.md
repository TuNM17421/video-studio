# Whiteboard (whiteboard style · lab)

One board for the **whole video** instead of one scene per câu: the marker draws each mark at its own
frame, marks stay until an `erase` wipes them, and a camera pans / zooms over a board larger than the
screen. Use it in `styles/whiteboard.json` videos; the video renders one `SceneFrame` (no header) at the
video frame, not a `Series`.

- **Ink**: navy `C.text` for most writing, blue `C.accent` for things/flows, red `C.red` for the question,
  the emphasis, the loop around the answer. `C.redSoft` highlight swipes under a key phrase.
- **Handwriting** (`HAND`, Pangolin) only for what is written on the board. Eyebrow, captions, footer
  stay Montserrat. Board text ≥ 40 px at zoom 1; headings seen only when zoomed out ≥ 110 px.
- **Timing**: `at` = the frame the phrase is said (`spokenAt`) minus 4–8 frames. Writing runs at about
  32 characters/s, so keep board text short — a keyword, not the sentence. 3–5 marks per câu.
- **Camera**: one key per move, 30–45 frames. Pan to the next area before its first mark; pull back to
  show where we are (e.g. the column header), zoom out at the end to show the whole board.
- **Erase**: a wipe over a region (the eraser scrubs along the edge). Everything drawn before it in that
  region disappears; later marks draw on top. Use it when a section is done and the space is reused.
- Seeds come from `id`, so wobble is deterministic — never reuse an id.

```jsx
const MARKS = [
  { id: 'q', kind: 'text', at: 20, x: 960, y: 300, text: 'Bắt đầu từ đâu?', size: 96, color: C.red, anchor: 'middle' },
  { id: 'q-loop', kind: 'loop', at: 70, cx: 960, cy: 270, rx: 420, ry: 90, color: C.red },
  { id: 'p', kind: 'person', at: 90, x: 400, y: 520, s: 34 },
  { id: 'a', kind: 'arrow', at: 130, points: [{ x: 480, y: 600 }, { x: 800, y: 600 }], color: C.accent },
];
<SceneFrame frame={frame} header={false} captions={captions}>
  <Whiteboard frame={frame} marks={MARKS} camera={[{ at: 0, x: 960, y: 550, w: 1920 }]} />
</SceneFrame>
```
