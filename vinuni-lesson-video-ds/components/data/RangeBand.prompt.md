# RangeBand

A point estimate with its plausible range. Show the dot first; `spread` 0→1 grows the band when the
narration introduces uncertainty. To show the range narrowing, animate `lo` / `hi` toward `value`.

```jsx
<RangeBand x={650} y={560} w={620} value={0.72} lo={0.63} hi={0.81} spread={appear(f, T.band)}
  label="KHOẢNG DAO ĐỘNG" readout="72% ± 9" left="0%" right="100%" />
```
