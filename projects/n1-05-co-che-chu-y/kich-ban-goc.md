# N1-05 · Cơ chế chú ý: một từ cần cả câu xung quanh

- **Ngày:** 1
- **Mục tiêu:** hết video người xem nói được vì sao một từ chỉ hiểu đúng khi nhìn cả câu, và kể lại ba việc của cơ chế chú ý: cần tìm gì, so mức phù hợp, lấy nội dung để kết hợp.
- **Thời lượng dự kiến:** khoảng ba phút, nhịp chậm — mỗi phép biến hình cần thời gian đứng yên sau đó.
- **Giọng đọc:** Nhật Phong (xem `npm run voices`).
- **Phạm vi:** rút gọn phần một đến phần ba của kịch bản gốc (câu một đến câu hai mươi lăm) còn mười lăm câu. Phần bốn đến phần sáu — nhiều nhánh xử lý, mặt nạ, quay lại ví dụ, câu hỏi — để cho một video khác.
- **Kịch bản gốc:** `ngay-01-video-05-attention-va-ngu-canh.md`, bản rà 07/09/2026, bốn mươi sáu câu. Bản này **rút gọn** cho style Illustrated: nhịp chậm hơn để mỗi phép biến hình kịp ngấm. Câu chữ giữ nguyên từ bản gốc ở mọi chỗ giữ được; chỗ gộp hai câu thì nối bằng liên từ, không thêm ý mới.

## Câu bị bỏ và vì sao

| Câu gốc | Bỏ vì |
|---|---|
| 04 | "biết thêm hoàn cảnh thì cách hiểu vẫn có thể thay đổi" — ý phụ, đã hàm trong câu 02 và 03 |
| 08 | "số ban đầu có được từ quá trình học" — thuộc bài embedding, không phải bài này |
| 10 | tên gọi "tự chú ý" — một tên riêng nữa làm nặng, ý đã nằm ở câu về kết hợp |
| 12 | "lấy từ nhiều mảnh chứ không chỉ một" — hình đã nói điều đó rõ hơn lời |
| 14 | "có dãy số mới để chuyển sang bước sau" — gộp vào câu chốt cuối |
| 20, 21 | hai câu cảnh báo "chữ trên hình chỉ để hiểu" — gộp thành một câu 13 |
| 22 | "truy vấn so với so khớp của từng mảnh" — hình diễn được, lời thành thừa |
| 25 | câu tóm ba thẻ — trùng câu chốt cuối |

## 1 · Một từ cần cả câu xung quanh

### Câu 1
- **Kiểu:** ke
- **Lời:** Các bạn hãy đọc câu này: Lan không nhét vừa cuốn sách vào túi vì nó quá dày.
- **Trên màn hình:** Lan không nhét vừa cuốn sách vào túi vì nó quá dày.
- **Chuyển động:** Câu hiện thành một hàng ô, mỗi ô một mảnh; ô "nó" và ô "dày" để dành chỗ nhấn về sau.

### Câu 2
- **Lời:** Một cách hiểu hợp lý là từ nó chỉ cuốn sách, vì sách quá dày nên không vừa túi.
- **Trên màn hình:** nó → cuốn sách
- **Chuyển động:** Một đường cong nối ô "nó" về ô "sách"; hai ô cùng sáng lên.

### Câu 3
- **Kiểu:** ke
- **Lời:** Nếu đổi thành quá nhỏ, ta lại hiểu từ nó chỉ chiếc túi, vì túi quá nhỏ nên không chứa được sách.
- **Trên màn hình:** nó → chiếc túi
- **Chuyển động:** Ô "dày" BIẾN HÌNH tại chỗ thành ô "nhỏ"; đường cong rời ô "sách", chuyển sang ô "túi".

### Câu 4
- **Kiểu:** nhan
- **Lời:** Những phần giúp ta hiểu từ nó được gọi là ngữ cảnh, và cơ chế chú ý là cách mô hình kết hợp thông tin giữa các phần trong câu.
- **Trên màn hình:** Ngữ cảnh · Cơ chế chú ý
- **Chuyển động:** Camera lùi ra thấy cả câu; ngoặc nhọn ôm cả hàng ô, nhãn "ngữ cảnh".

## 2 · Vì sao phải kết hợp thông tin

### Câu 5
- **Lời:** Để tính toán, mô hình dùng một dãy số thay cho mỗi mảnh văn bản.
- **Trên màn hình:** mỗi mảnh — một dãy số
- **Chuyển động:** Camera lia tới ô "nó"; dưới ô mọc ra một dải ô giá trị.

### Câu 6
- **Kiểu:** nhe
- **Lời:** Chỉ có dãy số ban đầu thì chưa đủ để biết mảnh ấy đang được dùng thế nào trong câu.
- **Trên màn hình:** chưa đủ
- **Chuyển động:** Dải số của ô "nó" đứng một mình giữa khung trống; phần còn lại của câu mờ hẳn.

### Câu 7
- **Lời:** Với mỗi mảnh, mô hình tính mức phù hợp của những mảnh được phép dùng, rồi kết hợp thông tin của chúng lại.
- **Trên màn hình:** mức phù hợp → kết hợp
- **Chuyển động:** Từ ô "nó" toả các đường về những ô phía trước, đường dày mảnh khác nhau theo mức phù hợp.

### Câu 8
- **Kiểu:** nhe
- **Lời:** Các nét đậm nhạt trên hình chỉ để minh họa cách tính, không phải số đo lấy từ mô hình thật.
- **Trên màn hình:** nét đậm nhạt: minh họa
- **Chuyển động:** Giữ nguyên hình; dòng chữ nhỏ hiện dưới cụm đường nối.

## 3 · Ba vai trò: tìm gì, so khớp, lấy nội dung

### Câu 9
- **Kiểu:** ke
- **Lời:** Hãy theo dõi ba việc: xác định cần thông tin gì, so mức phù hợp, rồi lấy nội dung để kết hợp.
- **Trên màn hình:** Cần tìm gì? · Phù hợp đến đâu? · Lấy nội dung nào?
- **Chuyển động:** Ba nhãn hiện lần lượt bên phải, thành mục lục cho cả phần.

### Câu 10
- **Lời:** Việc đầu tiên được minh họa bằng thẻ truy vấn, có thể hiểu là thẻ cần tìm thông tin gì.
- **Trên màn hình:** thẻ truy vấn
- **Chuyển động:** Dải số của ô "nó" biến hình thành một tấm thẻ, nhãn "truy vấn".

### Câu 11
- **Lời:** Thẻ so khớp giúp tính xem thông tin ở mỗi mảnh phù hợp đến đâu với điều đang cần tìm.
- **Trên màn hình:** thẻ so khớp
- **Chuyển động:** Mỗi ô phía trước mọc một tấm thẻ nhỏ, nhãn "so khớp"; thẻ truy vấn dò qua từng thẻ.

### Câu 12
- **Lời:** Còn thẻ nội dung chứa phần thông tin sẽ được mang đi kết hợp.
- **Trên màn hình:** thẻ nội dung
- **Chuyển động:** Hàng thẻ thứ ba hiện dưới hàng so khớp, nhãn "nội dung".

### Câu 13
- **Kiểu:** nhe
- **Lời:** Trong mô hình thật, cả ba loại thẻ đều là những dãy số được tính theo cách đã học, không phải chữ do người viết phần mềm gắn sẵn.
- **Trên màn hình:** ba loại thẻ = ba dãy số
- **Chuyển động:** Ba tấm thẻ cùng lật, để lộ mặt sau là ba dải ô giá trị.

### Câu 14
- **Lời:** Từ mức phù hợp vừa tính, mỗi thẻ nội dung nhận một con số gọi là trọng số.
- **Trên màn hình:** trọng số
- **Chuyển động:** Một con số hiện cạnh mỗi thẻ nội dung và chạy lên theo mức phù hợp của thẻ ấy.

### Câu 15
- **Kiểu:** nhan
- **Lời:** Mô hình nhân dãy số trên từng thẻ nội dung với trọng số tương ứng rồi cộng lại, ra một dãy số mới đã mang thông tin của cả câu.
- **Trên màn hình:** nhân theo trọng số → cộng lại → dãy số mới
- **Chuyển động:** Các thẻ nội dung co giãn theo trọng số rồi trượt vào nhau, BIẾN HÌNH thành một dải số duy nhất dưới ô "nó".
