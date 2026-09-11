---
category: player
---
# Player

Plays (or freezes) one 1920×1080 · 30 fps scene inside its container, scaled to fit, with optional
play / scrub / frame-step controls and burned-in subtitles. A scene is a React component that renders a
pure function of the frame — it reads the frame with `useFrame()` (Remotion: `useCurrentFrame()`).

**Use for** previewing a finished scene or a whole video (`Series`) in a design. **Not for** laying
out a scene — build the scene with `SceneFrame` + SVG components and hand it to `Player`.

```jsx
function HookScene() {
  const frame = useFrame();
  return (
    <SceneFrame frame={frame} eyebrow="NGÀY 02 · AI TẠO SINH" title="Máy đoán chữ tiếp theo thế nào?" tag="MINH HỌA">
      <Card x={780} y={460} w={360} h={150} label="ĐẦU VÀO" lines={['CÂU HỎI', 'của người học']} opacity={appear(frame, 12)} />
    </SceneFrame>
  );
}

<Player scene={HookScene} duration={150} />          // plays + loops, with controls
<Player scene={HookScene} duration={150} frame={90} controls={false} />  // frozen frame
```

Rules: every motion value is a function of the frame (`appear`, `pulse`, `interpolate`, `spring`) —
never wall-clock time, CSS transitions or `Math.random`. `duration` is in frames (30 fps).
