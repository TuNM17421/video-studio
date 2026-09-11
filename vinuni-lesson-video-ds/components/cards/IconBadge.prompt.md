# IconBadge (legacy icon-in-circle)

White circle, 3 px stroke, line icon at 52 % of the diameter, optional 25 px label below; `filled`
= solid circle with a white icon (hub center).

**Use for** secondary labels — capabilities at the end of a flow ("Sinh văn bản", "Viết code"),
a hub center, a closing icon. **Do not** tell a core concept with icon circles + arrows — build a
glassbox, a flow or a reshaping chart instead (house rule since the 3Blue1Brown switch).

```jsx
<IconBadge name="edit" x={1560} y={340} size={48} color={C.red} scale={1 + bump} />
```

Pop in with `popScale(frame, start)` (spring 13 / 140).
