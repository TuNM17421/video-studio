# UnitGrid

A count as filled cells out of a whole ("18 trên 60 lần") so a ratio reads as individual cases. `filled` is
continuous — countUp() fills the grid smoothly and the caption can show the same value rounded. The grid
total (cols × rows) is the number the script names; never pad it.

```jsx
<UnitGrid x={620} y={300} cols={10} rows={6} filled={countUp(f, T.a, T.b, 0, 18)}
  caption="18 TRÊN 60 LẦN CẦN HỎI LẠI" />
```
