---
category: player
---
# Series

Hard-cut sequence of scenes — the equivalent of Remotion `<Series>`. Each entry is
`{ component, duration, authoredDuration?, name? }` in frames; the active scene reads a scene-local
frame through `useFrame()`. `authoredDuration` rescales that frame linearly, so a scene authored for
N frames can play inside a narration cue of M frames without touching its beat constants.

```jsx
const sequences = [
  { component: HookScene, duration: 150, name: 'hook' },
  { component: TitleScene, duration: 90, name: 'title' },
];
function Video() {
  const frame = useFrame();
  return <Series sequences={sequences} frame={frame} />;
}
<Player scene={Video} duration={seriesDuration(sequences)} />
```

Helpers: `seriesDuration(sequences)` → total frames · `seriesStarts(sequences)` → start frame of each.
