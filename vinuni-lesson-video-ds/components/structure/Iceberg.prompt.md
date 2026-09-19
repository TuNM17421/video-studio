# Iceberg

What is visible (the tip, above a red dashed waterline) versus the much larger part underneath. Notes sit
to the right: `above` beside the tip, `below` under the waterline (red label).

Beats: tip + above note first → `depth` 0→1 to reveal what is underneath. Needs ~420 px right of the berg.

```jsx
<Iceberg x={520} y={290} w={560} h={480} depth={appear(f, T.below)}
  above={{ label: 'THẤY ĐƯỢC', lines: ['câu trả lời'] }}
  below={{ label: 'BÊN DƯỚI', lines: ['dữ liệu', 'ràng buộc', 'chi phí'] }} />
```
