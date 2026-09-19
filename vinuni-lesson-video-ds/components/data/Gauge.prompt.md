# Gauge

A half-circle dial for one reading against a threshold. The fill turns red when the value crosses the
threshold on the `danger` side. `value` is continuous: derive the arc and the `readout` text from the same
number and hold ≥ 45 f at the reading the narration names. Numbers are the script's examples.

```jsx
<Gauge cx={960} cy={700} r={220} value={v} threshold={0.6} danger="below"
  label="ĐỘ TIN CẬY" readout={formatNumber(v, 2)} min="0" max="1" />
```
