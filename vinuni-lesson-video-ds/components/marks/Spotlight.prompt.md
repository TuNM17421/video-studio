# Spotlight

Dims the whole frame except one region, to point the eye without moving anything. Render it after the
content it dims. Fade with `amount` (appear / fadeWindow); move the hole with smooth() on the region's
numbers. Use for dense diagrams where one part is being discussed — not as a transition.

```jsx
<Spotlight region={{ x: 740, y: 440, w: 440, h: 200 }} amount={fadeWindow(f, T.focus, T.release)} />
```
