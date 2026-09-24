# N1-03 · Storyboard

Mô hình tạo văn bản từng mảnh · 25 câu (phần 1–3 của kịch bản gốc) · 03:12 · **chưa có giọng** — mốc dưới đây là ước tính trong kịch bản, sẽ đổi khi có bản thu. Yêu cầu: `projects/n1-03-llm-sinh-tung-token/REQUEST.md`.

Vật liệu xuyên suốt: câu "Tôi mang ô vì trời" cắt bằng bộ tách GPT-5 thành sáu token. Hàng token xuất hiện ở câu 05 và sống tới câu 25 — toạ độ gốc khai một lần ở `shared.jsx` (`ROW`), cảnh nào cũng dùng lại.

## Phần 1 · Mở đầu — chữ xuất hiện từ đâu

| Câu | Mốc | Tiêu đề | Lời đọc | Hình |
|---|---|---|---|---|
| 01 | 00:00–00:07 | Chữ xuất hiện dần | Khi một trợ lý hội thoại trả lời, các bạn thường thấy chữ xuất hiện dần trên màn hình. | Một bong bóng trò chuyện hiện từng mảnh, không cho thấy đoạn hoàn chỉnh ngay từ đầu. |
| 02 | 00:07–00:15 | Tiếp tục chuỗi từ ngữ cảnh | Trong bài này, mình xét cách mô hình tạo từng mảnh văn bản rồi dùng phần vừa có để viết tiếp. | Mở hộp mô hình; chuỗi đầu vào nối qua vòng lặp đến một thẻ đầu ra. |
| 03 | 00:15–00:21 | Tôi mang ô vì trời… | Hãy nhìn câu chưa hoàn thành trên màn hình: tôi mang ô vì trời. | Hiện nguyên câu “Tôi mang ô vì trời…” với khoảng trống cuối, gắn MINH HỌA. |
| 04 | 00:21–00:31 | Hợp lý chưa chắc đúng | Điều cần hiểu cuối video là mô hình chọn mảnh tiếp theo như thế nào và vì sao câu nghe hợp lý vẫn có thể sai. | Hai nhãn “Tạo câu” và “Kiểm chứng” đặt thành hai bước riêng. |
## Phần 2 · Token — đơn vị mô hình xử lý

| Câu | Mốc | Tiêu đề | Lời đọc | Hình |
|---|---|---|---|---|
| 05 | 00:31–00:37 | Token: mảnh văn bản để xử lý | Trước tiên, văn bản được chia thành những mảnh nhỏ để xử lý, gọi là token. | Câu văn đi vào hộp bộ tách văn bản thành token rồi ra thành dãy ô đánh số. |
| 06 | 00:37–00:46 | Token không cố định bằng một từ | Một mảnh có thể là cả một từ, chỉ một phần của từ hoặc một dấu câu, tùy cách chia của mô hình. | Một từ nằm trong một ô, một từ khác trải qua hai ô; dấu câu có ô riêng. |
| 07 | 00:46–00:54 | Mảnh chữ = cách hình dung | Tên gọi mảnh văn bản giúp mình dễ hình dung, còn token được chia ở đâu là do bộ tách quyết định. | Thêm nhãn “Mảnh chữ: cách gọi trực giác”, không hiển thị phân tách như kết quả thật. |
| 08 | 00:54–01:02 | Khoảng trắng không phải bộ đếm token | Đặc biệt với tiếng Việt, các bạn không nên đếm khoảng trắng rồi mặc định mỗi tiếng là đúng một token. | Bộ đếm khoảng trắng và bộ đếm token đặt cạnh nhau với dấu không đồng nhất. |
| 09 | 01:02–01:09 | Mảnh văn bản → mã số → dãy số | Mỗi mảnh được chuyển thành mã số, rồi thành một dãy số để mô hình thực hiện phép tính. | Các thẻ chữ lật mặt sau thành mã và dãy số, ghi “Sơ đồ đơn giản hóa”. |
| 10 | 01:09–01:18 | Dùng phần văn bản được phép | Qua nhiều bước tính toán, những dãy số này kết hợp thông tin từ phần văn bản mà mô hình được phép dùng. | Dãy thẻ đi qua các lớp; đánh dấu vị trí và chỉ nối các phần đã có, không vẽ đường từ văn bản chưa sinh. |
| 11 | 01:18–01:26 | Sau “trời” có thể là gì? | Hãy nhìn vào ô trống sau chữ trời và thử đoán xem những cách nối tiếp nào nghe có vẻ phù hợp. | Phóng lớn khoảng trống cuối câu; các thẻ ứng viên chờ phía dưới. |
## Phần 3 · Dự đoán, chọn, nối rồi lặp

| Câu | Mốc | Tiêu đề | Lời đọc | Hình |
|---|---|---|---|---|
| 12 | 01:26–01:33 | 1. Tính khả năng của từng mảnh tiếp theo | Từ phần câu đã có, mô hình tính khả năng xuất hiện của từng mảnh có thể nối tiếp. | Hộp mô hình xuất ra nhiều thanh khả năng, không xuất thẳng một từ duy nhất. |
| 13 | 01:33–01:40 | Vài cách nối để minh họa | Bảng minh họa có các lựa chọn mưa, nắng, lạnh và một nhóm gom những cách nối khác. | Bốn thanh hiện với nhãn mưa, nắng, lạnh, khác; giữ MINH HỌA ở góc. |
| 14 | 01:40–01:50 | MINH HỌA: khả năng nối tiếp văn bản | Mình đặt khả năng của mưa cao hơn để dựng ví dụ dễ hình dung; các tỷ lệ này không được lấy từ một mô hình thật. | Thanh mưa 60% cao hơn ba thanh còn lại; chú thích mô phỏng vẫn rõ. |
| 15 | 01:50–01:59 | Khả năng nối tiếp văn bản ≠ xác suất thời tiết | Các phần trăm trong bảng nói về mảnh văn bản có thể nối tiếp, không đo xem trời thật sự đang mưa hay không. | Giữ bảng mưa, nắng, lạnh, khác và nhãn MINH HỌA; thêm tên Bảng nối tiếp văn bản, tách khỏi biểu tượng báo thời tiết chưa có dữ liệu. |
| 16 | 01:59–02:07 | Sơ đồ đã giản lược | Mô hình thật có nhiều mảnh để chọn hơn, và một từ trên thẻ có thể cần tách thành nhiều mảnh. | Phía sau bốn thanh mở ra nhiều hàng mờ; thẻ từ tách thử thành nhiều mảnh. |
| 17 | 02:07–02:14 | 2. Chọn một token | Sau khi có bảng khả năng, hệ thống dùng một quy tắc để chọn ra mảnh tiếp theo. | Một bộ chọn đứng giữa bảng phân bố và đầu câu, lấy một thẻ. |
| 18 | 02:14–02:19 | Cách 1: chọn mức cao nhất | Một cách là luôn chọn mảnh có khả năng cao nhất trong bảng. | Khoanh thẻ có khả năng cao nhất ở nhánh thứ nhất; giữ nhánh thứ hai mờ, chưa hiện kết quả. |
| 19 | 02:19–02:27 | Cách 2: chọn theo mức khả năng | Cách khác là chọn theo các mức khả năng ấy, nên những mảnh ít khả năng hơn vẫn có thể được chọn. | Mở nhánh thứ hai từ cùng bảng khả năng; dùng các vùng chọn có kích thước tương ứng, rồi chọn một thẻ; mọi tỷ lệ vẫn ghi MINH HỌA. |
| 20 | 02:27–02:33 | 3. Nối token vào chuỗi | Giả sử lần này chọn mưa, hệ thống nối mảnh ấy vào cuối câu đang viết. | Thẻ mưa trượt vào khoảng trống sau trời; con trỏ chuyển sang vị trí mới. |
| 21 | 02:33–02:41 | Ngữ cảnh mới gồm token vừa sinh | Lần dự đoán sau sẽ dùng cả chữ mưa vừa thêm, vì nó đã trở thành một phần của câu. | Khung ngữ cảnh mở rộng bao gồm mưa; mũi tên quay về hộp mô hình. |
| 22 | 02:41–02:49 | 4. Tính lại và lặp | Do đó, bảng khả năng phải được tính lại ở mỗi bước, thay vì dùng mãi bảng của bước đầu. | Bảng phân bố cũ tan đi; bảng mới có dấu câu và từ nối phù hợp. |
| 23 | 02:49–02:55 | Lặp đến điều kiện dừng | Các bước dự đoán, chọn và nối lặp lại cho đến khi gặp điều kiện dừng. | Vòng lặp chạy thêm vài lượt rồi gặp biển dừng. |
| 24 | 02:55–03:04 | Có nhiều điều kiện dừng | Hệ thống có thể dừng khi có tín hiệu kết thúc, hoặc khi câu trả lời đã chạm mức độ dài cho phép. | Hai nhánh “Kết thúc” và “Giới hạn đầu ra” cùng dẫn đến dừng. |
| 25 | 03:04–03:12 | Dừng tạo chữ chưa chắc đã trả lời xong | Vì vậy, câu trả lời có thể bị cắt khi chưa viết xong, chỉ vì đã hết phần độ dài được cấp. | Một câu đang viết dở gặp vạch ngân sách; gắn nhãn “Cần kiểm tra kết thúc”. |
