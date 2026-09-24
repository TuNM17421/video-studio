# PathTrace

Một chấm chạy theo đường và **để lại vệt**.

Đây là hình của gradient descent: viên bi lăn xuống dốc, vệt phía sau là lịch sử các bước đã đi. Vệt mới
là phần quan trọng — không có nó thì chỉ là một chấm di chuyển; có nó thì người xem đọc được **đường đi**,
tức là thuật toán.

```jsx
<PathTrace d={curvePath(points)} t={linearProgress(frame, T.lan, T.het)} steps={8} />
```

- `steps > 0` thì chấm **nhảy từng nấc** thay vì trượt đều, và mỗi nấc để lại một chấm mờ. Dùng cho
  thuật toán lặp: mỗi nấc là một vòng lặp, và số nấc phải khớp con số kịch bản đưa.
- Đường đầy đủ luôn hiện ở mức khung 15 %: người xem biết có một con dốc, chưa biết sẽ dừng ở đâu.
- Dùng với `Plot` để chấm chạy đúng trên đường cong loss.
