# Layer

Thang độ đậm nhạt — **ba mức, không hơn**.

| Mức | Độ đặc | Dùng cho |
|---|---|---|
| `main` | 100 % | thứ lời đọc đang nói tới |
| `context` | 40 % | thứ vừa nói xong hoặc sắp nói, còn để giữ mạch |
| `frame` | 15 % | khung: trục toạ độ, lưới, nhãn vùng |

```jsx
<Layer level="frame"><Axes o={O} ticks={4} /></Layer>
<Layer level="context" fade={appear(frame, T.vao)}><Strip … /></Layer>
```

Mắt chỉ phân biệt được vài mức. Dùng ba mức này thay cho `opacity` tự đặt thì mọi cảnh trong một video —
và mọi video trong style — tách lớp giống nhau, người xem học được quy ước sau vài giây. `fade` nhân thêm
để vào/ra mềm, không phải để tạo mức thứ tư.
