# Timeline

Milestones on one rail, filled left to right; the milestone being discussed is red (`current`). Drive
`progress` with one smooth() per step and hold between steps. Labels ≤ ~16 characters at 4 milestones.
Years/labels are the script's — do not invent dates.

```jsx
<Timeline x={220} y={600} w={1480} progress={p}
  items={[{ year: '2017', label: 'TRANSFORMER' }, { year: '2020', label: 'MÔ HÌNH LỚN' },
    { year: '2023', label: 'TRỢ LÝ HỘI THOẠI', current: true }, { year: 'NAY', label: 'TÁC TỬ' }]} />
```
