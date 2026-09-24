# N1-03 · Mô hình ngôn ngữ tạo văn bản từng mảnh như thế nào?

- **Ngày:** 1
- **Mục tiêu:** hết video người xem kể lại được vòng dự đoán → chọn → nối → lặp, và nói được vì sao đếm khoảng trắng không ra số token.
- **Thời lượng dự kiến:** khoảng ba phút mười giây.
- **Giọng đọc:** Nhật Phong (xem `npm run voices`).
- **Phạm vi:** phần một đến phần ba của kịch bản gốc (câu một đến câu hai mươi lăm). Phần bốn đến phần sáu để lại cho một video khác.
- **Kịch bản gốc:** `ngay-01-video-03-llm-sinh-tung-token.md`, bản rà 07/09/2026 — chuyển từ mẫu cũ (khối "Lời đọc nguyên văn") sang mẫu `templates/kich-ban-co-ban.md`, lời đọc giữ nguyên từng chữ.

## Dữ liệu đã chốt

- Câu xuyên suốt: "Tôi mang ô vì trời…". Bộ tách của GPT-5 cắt ra **sáu token** — `T` 51 · `ôi` 23865 · `␣mang` 18033 · `␣ô` 27598 · `␣vì` 60010 · `␣trời` 177808. Năm tiếng, sáu token; khoảng trắng nằm **trong** token.
- Phần nối tiếp: `␣đang` 49804 · `␣m` 284 · `ưa` 43653 — chữ "mưa" tốn **hai** token.
- Bảng khả năng minh hoạ: mưa 60%, nắng 20%, lạnh 10%, khác 10% — do người viết kịch bản đặt, không phải phép đo từ mô hình (câu mười bốn và mười lăm nói rõ điều này thành tiếng).
- Màn hình phải ghi tên bộ tách (GPT-5) ở cảnh token, vì câu bảy nói cách chia là do bộ tách quyết định.

## 1 · Mở đầu — chữ xuất hiện từ đâu

### Câu 1
- **Lời:** Khi một trợ lý hội thoại trả lời, các bạn thường thấy chữ xuất hiện dần trên màn hình.
- **Trên màn hình:** Chữ xuất hiện dần
- **Chuyển động:** Một bong bóng trò chuyện hiện từng mảnh, không cho thấy đoạn hoàn chỉnh ngay từ đầu.

### Câu 2
- **Lời:** Trong bài này, mình xét cách mô hình tạo từng mảnh văn bản rồi dùng phần vừa có để viết tiếp.
- **Trên màn hình:** Tiếp tục chuỗi từ ngữ cảnh
- **Chuyển động:** Mở hộp mô hình; chuỗi đầu vào nối qua vòng lặp đến một thẻ đầu ra.

### Câu 3
- **Kiểu:** ke
- **Lời:** Hãy nhìn câu chưa hoàn thành trên màn hình: tôi mang ô vì trời.
- **Trên màn hình:** Tôi mang ô vì trời…
- **Chuyển động:** Hiện nguyên câu “Tôi mang ô vì trời…” với khoảng trống cuối, gắn MINH HỌA.

### Câu 4
- **Kiểu:** nhan
- **Lời:** Điều cần hiểu cuối video là mô hình chọn mảnh tiếp theo như thế nào và vì sao câu nghe hợp lý vẫn có thể sai.
- **Trên màn hình:** Hợp lý chưa chắc đúng
- **Chuyển động:** Hai nhãn “Tạo câu” và “Kiểm chứng” đặt thành hai bước riêng.

## 2 · Token — đơn vị mô hình xử lý

### Câu 5
- **Lời:** Trước tiên, văn bản được chia thành những mảnh nhỏ để xử lý, gọi là token.
- **Trên màn hình:** Token: mảnh văn bản để xử lý
- **Chuyển động:** Câu văn đi vào hộp bộ tách văn bản thành token rồi ra thành dãy ô đánh số.

### Câu 6
- **Lời:** Một mảnh có thể là cả một từ, chỉ một phần của từ hoặc một dấu câu, tùy cách chia của mô hình.
- **Trên màn hình:** Token không cố định bằng một từ
- **Chuyển động:** Một từ nằm trong một ô, một từ khác trải qua hai ô; dấu câu có ô riêng.

### Câu 7
- **Lời:** Tên gọi mảnh văn bản giúp mình dễ hình dung, còn token được chia ở đâu là do bộ tách quyết định.
- **Trên màn hình:** Mảnh chữ = cách hình dung
- **Chuyển động:** Thêm nhãn “Mảnh chữ: cách gọi trực giác”, không hiển thị phân tách như kết quả thật.

### Câu 8
- **Kiểu:** nhan
- **Lời:** Đặc biệt với tiếng Việt, các bạn không nên đếm khoảng trắng rồi mặc định mỗi tiếng là đúng một token.
- **Trên màn hình:** Khoảng trắng không phải bộ đếm token
- **Chuyển động:** Bộ đếm khoảng trắng và bộ đếm token đặt cạnh nhau với dấu không đồng nhất.

### Câu 9
- **Lời:** Mỗi mảnh được chuyển thành mã số, rồi thành một dãy số để mô hình thực hiện phép tính.
- **Trên màn hình:** Mảnh văn bản → mã số → dãy số
- **Chuyển động:** Các thẻ chữ lật mặt sau thành mã và dãy số, ghi “Sơ đồ đơn giản hóa”.

### Câu 10
- **Lời:** Qua nhiều bước tính toán, những dãy số này kết hợp thông tin từ phần văn bản mà mô hình được phép dùng.
- **Trên màn hình:** Dùng phần văn bản được phép
- **Chuyển động:** Dãy thẻ đi qua các lớp; đánh dấu vị trí và chỉ nối các phần đã có, không vẽ đường từ văn bản chưa sinh.

### Câu 11
- **Kiểu:** hoi
- **Lời:** Hãy nhìn vào ô trống sau chữ trời và thử đoán xem những cách nối tiếp nào nghe có vẻ phù hợp.
- **Trên màn hình:** Sau “trời” có thể là gì?
- **Chuyển động:** Phóng lớn khoảng trống cuối câu; các thẻ ứng viên chờ phía dưới.

## 3 · Dự đoán, chọn, nối rồi lặp

### Câu 12
- **Lời:** Từ phần câu đã có, mô hình tính khả năng xuất hiện của từng mảnh có thể nối tiếp.
- **Trên màn hình:** 1. Tính khả năng của từng mảnh tiếp theo
- **Chuyển động:** Hộp mô hình xuất ra nhiều thanh khả năng, không xuất thẳng một từ duy nhất.

### Câu 13
- **Lời:** Bảng minh họa có các lựa chọn mưa, nắng, lạnh và một nhóm gom những cách nối khác.
- **Trên màn hình:** Vài cách nối để minh họa
- **Chuyển động:** Bốn thanh hiện với nhãn mưa, nắng, lạnh, khác; giữ MINH HỌA ở góc.

### Câu 14
- **Kiểu:** ke
- **Lời:** Mình đặt khả năng của mưa cao hơn để dựng ví dụ dễ hình dung; các tỷ lệ này không được lấy từ một mô hình thật.
- **Trên màn hình:** MINH HỌA: khả năng nối tiếp văn bản
- **Chuyển động:** Thanh mưa 60% cao hơn ba thanh còn lại; chú thích mô phỏng vẫn rõ.

### Câu 15
- **Kiểu:** nhan
- **Lời:** Các phần trăm trong bảng nói về mảnh văn bản có thể nối tiếp, không đo xem trời thật sự đang mưa hay không.
- **Trên màn hình:** Khả năng nối tiếp văn bản ≠ xác suất thời tiết
- **Chuyển động:** Giữ bảng mưa, nắng, lạnh, khác và nhãn MINH HỌA; thêm tên Bảng nối tiếp văn bản, tách khỏi biểu tượng báo thời tiết chưa có dữ liệu.

### Câu 16
- **Lời:** Mô hình thật có nhiều mảnh để chọn hơn, và một từ trên thẻ có thể cần tách thành nhiều mảnh.
- **Trên màn hình:** Sơ đồ đã giản lược
- **Chuyển động:** Phía sau bốn thanh mở ra nhiều hàng mờ; thẻ từ tách thử thành nhiều mảnh.

### Câu 17
- **Lời:** Sau khi có bảng khả năng, hệ thống dùng một quy tắc để chọn ra mảnh tiếp theo.
- **Trên màn hình:** 2. Chọn một token
- **Chuyển động:** Một bộ chọn đứng giữa bảng phân bố và đầu câu, lấy một thẻ.

### Câu 18
- **Lời:** Một cách là luôn chọn mảnh có khả năng cao nhất trong bảng.
- **Trên màn hình:** Cách 1: chọn mức cao nhất
- **Chuyển động:** Khoanh thẻ có khả năng cao nhất ở nhánh thứ nhất; giữ nhánh thứ hai mờ, chưa hiện kết quả.

### Câu 19
- **Lời:** Cách khác là chọn theo các mức khả năng ấy, nên những mảnh ít khả năng hơn vẫn có thể được chọn.
- **Trên màn hình:** Cách 2: chọn theo mức khả năng
- **Chuyển động:** Mở nhánh thứ hai từ cùng bảng khả năng; dùng các vùng chọn có kích thước tương ứng, rồi chọn một thẻ; mọi tỷ lệ vẫn ghi MINH HỌA.

### Câu 20
- **Kiểu:** ke
- **Lời:** Giả sử lần này chọn mưa, hệ thống nối mảnh ấy vào cuối câu đang viết.
- **Trên màn hình:** 3. Nối token vào chuỗi
- **Chuyển động:** Thẻ mưa trượt vào khoảng trống sau trời; con trỏ chuyển sang vị trí mới.

### Câu 21
- **Lời:** Lần dự đoán sau sẽ dùng cả chữ mưa vừa thêm, vì nó đã trở thành một phần của câu.
- **Trên màn hình:** Ngữ cảnh mới gồm token vừa sinh
- **Chuyển động:** Khung ngữ cảnh mở rộng bao gồm mưa; mũi tên quay về hộp mô hình.

### Câu 22
- **Kiểu:** nhan
- **Lời:** Do đó, bảng khả năng phải được tính lại ở mỗi bước, thay vì dùng mãi bảng của bước đầu.
- **Trên màn hình:** 4. Tính lại và lặp
- **Chuyển động:** Bảng phân bố cũ tan đi; bảng mới có dấu câu và từ nối phù hợp.

### Câu 23
- **Lời:** Các bước dự đoán, chọn và nối lặp lại cho đến khi gặp điều kiện dừng.
- **Trên màn hình:** Lặp đến điều kiện dừng
- **Chuyển động:** Vòng lặp chạy thêm vài lượt rồi gặp biển dừng.

### Câu 24
- **Lời:** Hệ thống có thể dừng khi có tín hiệu kết thúc, hoặc khi câu trả lời đã chạm mức độ dài cho phép.
- **Trên màn hình:** Có nhiều điều kiện dừng
- **Chuyển động:** Hai nhánh “Kết thúc” và “Giới hạn đầu ra” cùng dẫn đến dừng.

### Câu 25
- **Kiểu:** nhan
- **Lời:** Vì vậy, câu trả lời có thể bị cắt khi chưa viết xong, chỉ vì đã hết phần độ dài được cấp.
- **Trên màn hình:** Dừng tạo chữ chưa chắc đã trả lời xong
- **Chuyển động:** Một câu đang viết dở gặp vạch ngân sách; gắn nhãn “Cần kiểm tra kết thúc”.

