# NumberLine

Trục số có vạch và nhãn.

Thứ quan trọng **không phải cái đường**, mà là `numberToPoint`: có nó thì mọi vật đặt được đúng vị trí
giá trị của nó, và khi giá trị đổi thì vật trượt theo. Không có nó thì mọi thang đo trên màn hình chỉ là
trang trí.

```jsx
const line = { o: { x: 300, y: 820 }, length: 1300, from: 0, to: 1 };
<NumberLine {...line} step={0.25} decimals={2} label="xác suất" />
<circle cx={numberToPoint(line, p).x} cy={line.o.y} r={12} fill={C.red} />
```

Trục nằm ở mức khung (15 %) như `Axes`; nhãn số thì đọc được. Có trục nghĩa là hứa với người xem rằng vị
trí trên màn hình **có nghĩa** — đừng dùng làm đồ trang trí.
