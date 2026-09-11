/**
 * D2-01 (lab) v2 · "AI chatbot" chưa phải là một bài toán (mở ngày 2 + Module 1 · Bài 1.1).
 * Source: projects/d2-01-lab-v2/kich-ban-goc.md (N2-M1-01), 49 câu đọc + 2 khoảng dừng 3 giây.
 *
 * One cue = one narrated sentence = one scene. `text` is the locked narration, verbatim (the script
 * says its narration is approved). `voice` = delivery direction for ElevenLabs eleven_v3 only (audio
 * tags, never shown or captioned); câu marked *đọc chậm* in the script carry `[slowly]` and a longer
 * pause. `silent` = held pause, no narration. `pauseAfter` = seconds of silence after the câu (default
 * 1.4 s). `frames` / `speech` = measured voice written after TTS; before that `seconds` (script
 * estimate). `section` = the script's part (1–11) → chapters.
 */
const RAW = [
  // ── Phần 1 · Mở ngày · Đặt đúng bài toán ────────────────────────────────────
  { n: 1, frames: 255, speech: 231, seconds: 10, section: 1, voice: '[thoughtful] [slowly]', pauseAfter: 0.8,
    title: 'Đang giải đúng bài toán?',
    text: 'Trước khi các bạn chọn cách xây một giải pháp, có một câu hỏi cần được giữ ở giữa cả ngày học: mình đã chắc là đang giải đúng bài toán chưa?',
    visual: 'Một câu hỏi lớn giữa khung hình, bao quanh là các thẻ gợi ý về bài toán và giải pháp.' },
  { n: 2, frames: 90, speech: 0, seconds: 3, section: 1, silent: 3, title: 'Đang giải đúng bài toán?', text: '',
    visual: 'Giữ nguyên hình của câu trước; không phát lời đọc.' },
  { n: 3, frames: 172, speech: 124, seconds: 5, section: 1, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'Giải pháp không đồng nghĩa với nhu cầu', titleSize: 46,
    text: 'Không phải cứ nhìn thấy một giải pháp là đã nhìn thấy nhu cầu cần giải quyết.',
    visual: 'Hai thẻ cạnh nhau: “Giải pháp” hiện trước, “Nhu cầu cần giải quyết” hiện sau.' },
  { n: 4, frames: 176, speech: 128, seconds: 5, section: 1, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'AI không phải lúc nào cũng cần thiết', titleSize: 46,
    text: 'Cũng không phải cứ có thể đưa AI vào là bài toán đó thật sự cần AI.',
    visual: 'Thay thẻ trái bằng “AI”, giữ thẻ nhu cầu; dấu hỏi giữa hai thẻ.' },
  { n: 5, frames: 329, speech: 269, seconds: 12, section: 1, voice: '[confident] [slowly]', pauseAfter: 2,
    title: 'Làm rõ trước khi đề xuất công nghệ', titleSize: 46,
    text: 'Vậy trước khi nói đến cấp độ giải pháp, trước khi đề xuất công nghệ, chúng ta cần làm rõ điều gì đang xảy ra, điều gì cần thay đổi, và quyết định nào đang được đặt ra.',
    visual: 'Ba thẻ Điều đang xảy ra · Điều cần thay đổi · Quyết định đang được đặt ra xuất hiện trước thẻ Công nghệ.' },

  // ── Phần 2 · Mở ngày · Mục tiêu sau ngày học ────────────────────────────────
  { n: 6, frames: 257, speech: 209, seconds: 9, section: 2, voice: '[warmly] [slowly]', pauseAfter: 1.6,
    title: 'Phân biệt bài toán và giải pháp',
    text: 'Sau ngày này, các bạn sẽ phân biệt được bài toán với giải pháp, và biết đặt câu hỏi làm rõ trước khi đề xuất công nghệ.',
    visual: 'Ba thẻ mục tiêu: phân biệt bài toán với giải pháp → đặt câu hỏi làm rõ → rồi mới đề xuất công nghệ.' },
  { n: 7, frames: 444, speech: 396, seconds: 16, section: 2, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Hiện trạng · Mục tiêu · Cách đo',
    text: 'Các bạn sẽ định lượng hóa được một điểm đau bằng hiện trạng, mục tiêu và cách đo, để điểm đau không chỉ được mô tả chung chung mà có thể được nhìn nhận rõ hơn qua những gì đang có, điều cần đạt tới và cách kiểm chứng.',
    visual: 'Mô tả điểm đau chung chung chuyển thành ba thẻ Hiện trạng · Mục tiêu · Cách đo.' },
  { n: 8, frames: 489, speech: 441, seconds: 18, section: 2, voice: '[thoughtful] [slowly]', pauseAfter: 1.6,
    title: 'AI thay thế, hỗ trợ, hay chưa cần?',
    text: 'Các bạn cũng sẽ áp dụng được ba bước để xác định AI có đáng làm hay không, việc nào nên để AI làm thay con người và việc nào chỉ nên để AI hỗ trợ con người, và giải pháp nên dừng ở cấp độ đơn giản nhất mà vẫn đủ giải quyết bài toán.',
    visual: 'Ba hướng: AI làm thay con người · AI hỗ trợ con người · cấp độ đơn giản nhất vẫn đủ.' },
  { n: 9, frames: 228, speech: 168, seconds: 7, section: 2, voice: '[confident] [slowly]', pauseAfter: 2,
    title: 'Tiêu chí thành công · Ứng xử khi AI sai', titleSize: 46,
    text: 'Sau đó, các bạn sẽ viết được tiêu chí thành công có thể hành động, đồng thời biết ứng xử khi AI sai.',
    visual: 'Thêm thẻ Tiêu chí thành công và Ứng xử khi AI sai vào chuỗi mục tiêu.' },

  // ── Phần 3 · Mở ngày · Từ làm rõ đến quyết định ─────────────────────────────
  { n: 10, frames: 300, speech: 252, seconds: 11, section: 3, voice: '[thoughtful] [slowly]', pauseAfter: 1.6,
    title: 'Giải pháp cần đạt điều gì?',
    text: 'Mục tiêu không dừng ở việc gọi tên một giải pháp, mà là làm rõ giải pháp đó cần đạt điều gì và cần được nhìn nhận ra sao khi kết quả không đúng.',
    visual: 'Thẻ giải pháp nối với hai câu hỏi: cần đạt điều gì · nhìn nhận ra sao khi kết quả không đúng.' },
  { n: 11, frames: 296, speech: 248, seconds: 10, section: 3, voice: '[confident] [slowly]', pauseAfter: 1.6,
    title: 'Bản mô tả bài toán đủ chín mục',
    text: 'Cuối ngày, các bạn sẽ hoàn thành được một bản mô tả bài toán đủ chín mục để quyết định nên triển khai, tạm hoãn hay dừng lại, trong buổi thực hành.',
    visual: 'Bản mô tả bài toán ở trung tâm tách thành ba lựa chọn: triển khai · tạm hoãn · dừng lại.' },
  { n: 12, frames: 487, speech: 427, seconds: 18, section: 3, voice: '[calm] [slowly]', pauseAfter: 2,
    title: 'Từ bài toán đến quyết định triển khai', titleSize: 46,
    text: 'Nghĩa là các bạn có thể đi từ việc nhận diện bài toán, làm rõ điểm đau và khả năng cần AI, đến việc xác định cấp độ giải pháp, tiêu chí thành công, cách ứng xử khi AI thất bại, rồi đưa bài toán về một dạng đủ rõ để quyết định triển khai.',
    visual: 'Dòng chảy: nhận diện bài toán → làm rõ điểm đau → khả năng cần AI → cấp độ giải pháp → quyết định triển khai.' },

  // ── Phần 4 · Mở ngày · Lập trường và bốn câu hỏi ────────────────────────────
  { n: 13, frames: 234, speech: 186, seconds: 8, section: 4, voice: '[confident] [slowly]', pauseAfter: 1.6,
    title: 'Đặt câu hỏi, thay vì vội tìm giải pháp', titleSize: 46,
    text: 'Ngày học này đi theo một lập trường rất rõ: chúng ta sẽ đặt câu hỏi xuyên suốt, thay vì vội đi tìm giải pháp.',
    visual: 'Kính lúp trên thẻ câu hỏi; các thẻ giải pháp lùi xuống phía sau.' },
  { n: 14, frames: 411, speech: 363, seconds: 14, section: 4, voice: '[thoughtful] [slowly]', pauseAfter: 1.6,
    title: 'Bốn câu hỏi dẫn đường',
    text: 'Bốn câu hỏi trọng tâm sẽ lần lượt dẫn đường cho cả ngày: bài toán có thật sự cần AI không, giải pháp nên ở cấp độ nào, bản mô tả bài toán đã đủ rõ chưa, và khi nào nên quyết định triển khai.',
    visual: 'Bốn thẻ câu hỏi xuất hiện lần lượt quanh tâm màn hình.' },
  { n: 15, frames: 248, speech: 200, seconds: 8, section: 4, voice: '[warmly] [slowly]', pauseAfter: 1.6,
    title: 'Không cần kiến thức kỹ thuật sâu',
    text: 'Ngày học không đòi hỏi kiến thức kỹ thuật sâu; điều cần có là khả năng đặt câu hỏi và quan sát một quy trình thật.',
    visual: 'Hai thẻ Đặt câu hỏi · Quan sát một quy trình thật nổi lên; thẻ kiến thức kỹ thuật sâu mờ phía sau.' },
  { n: 16, frames: 252, speech: 192, seconds: 8, section: 4, voice: '[confident] [slowly]', pauseAfter: 2,
    title: 'Bài toán → làm rõ → công nghệ → quyết định', titleSize: 44,
    text: 'Vì vậy, cách tiếp cận của chúng ta là nhìn bài toán trước, làm rõ trước, rồi mới nói đến công nghệ và quyết định.',
    visual: 'Bốn chặng ngang nối bằng mũi tên: bài toán → làm rõ → công nghệ → quyết định.' },

  // ── Phần 5 · Mở ngày · Bước vào Module 1 ────────────────────────────────────
  { n: 17, frames: 222, speech: 180, seconds: 7, section: 5, voice: '[curious]',
    title: 'Khi giải pháp xuất hiện quá sớm',
    text: 'Bây giờ, mình bắt đầu từ điểm dễ bị bỏ qua nhất: khi giải pháp xuất hiện trước khi bài toán được nhìn thấy rõ.',
    visual: 'Thẻ Giải pháp trượt vào trước; thẻ Bài toán phía sau bị che một phần.' },
  { n: 18, frames: 168, speech: 108, seconds: 4, section: 5, voice: '[excited]', pauseAfter: 2,
    title: 'Module 1 · Nhìn thấy giải pháp trước khi thấy bài toán',
    text: 'Chúng ta vào Module 1 · Nhìn thấy giải pháp trước khi thấy bài toán.',
    visual: 'Tiêu đề Module 1 toàn màn hình; thẻ Giải pháp phía trước, thẻ Bài toán phía sau.' },

  // ── Phần 6 · Yêu cầu chưa thành bài toán ────────────────────────────────────
  { n: 19, frames: 157, speech: 115, seconds: 4, section: 6, voice: '[warmly]',
    title: 'Yêu cầu: chatbot AI', tag: 'VÍ DỤ',
    text: 'Các bạn chắc đã gặp một yêu cầu rất quen: xây một chatbot AI.',
    visual: 'Khối chatbot giữa màn hình, nhãn yêu cầu xây chatbot AI.' },
  { n: 20, frames: 212, speech: 170, seconds: 7, section: 6, voice: '[thoughtful]',
    title: 'Đã gọi tên giải pháp', tag: 'VÍ DỤ',
    text: 'Nghe qua, yêu cầu này giống như đã nói rõ việc cần làm, vì nó đã gọi tên một hình hài giải pháp.',
    visual: 'Đường viền quanh chatbot sáng lên như một hình hài giải pháp đã được gọi tên.' },
  { n: 21, frames: 238, speech: 196, seconds: 8, section: 6, voice: '[serious]',
    title: 'Ai dùng? Vướng ở đâu?', tag: 'VÍ DỤ',
    text: 'Nhưng nếu dừng ở đó, chúng ta vẫn chưa biết ai sẽ dùng, họ đang vướng ở đâu, và chatbot cần tham gia vào công việc nào.',
    visual: 'Ba vùng trống quanh chatbot: người dùng · điểm vướng · công việc cần xử lý.' },
  { n: 22, frames: 256, speech: 214, seconds: 8, section: 6, voice: '[serious]',
    title: 'Cùng tên, khác bài toán', tag: 'VÍ DỤ',
    text: 'Điều này đáng bận tâm vì cùng một cái tên chatbot có thể dẫn tới những quy trình, chỉ số và rủi ro rất khác nhau.',
    visual: 'Chatbot tách thành hai nhánh; mỗi nhánh dẫn tới chuỗi bước, vùng chỉ số và vùng rủi ro khác nhau.' },
  { n: 23, frames: 307, speech: 247, seconds: 10, section: 6, voice: '[confident]', pauseAfter: 2,
    title: 'Ai dùng? Vướng ở đâu? Tham gia việc nào?', titleSize: 44, tag: 'VÍ DỤ',
    text: 'Trong module này, mình sẽ tập cho các bạn trả lời ba câu hỏi đó trước: ai sẽ dùng, họ đang vướng ở đâu, và chatbot cần tham gia vào công việc nào.',
    visual: 'Ba vùng người dùng · điểm vướng · công việc sáng lại trên cả hai nhánh; lớp công nghệ lùi xuống nền.' },

  // ── Phần 7 · Đổi đối tượng, đổi workflow ────────────────────────────────────
  { n: 24, frames: 239, speech: 197, seconds: 8, section: 7, voice: '[warmly]',
    title: 'Một yêu cầu, hai nhóm người dùng', tag: 'VÍ DỤ',
    text: 'Bây giờ mình dùng một ví dụ xuyên suốt: cùng một yêu cầu xây chatbot AI, nhưng đặt nó vào hai nhóm người dùng khác nhau.',
    visual: 'Chatbot giữ giữa; hai khung người dùng xuất hiện hai bên.' },
  { n: 25, frames: 179, speech: 137, seconds: 5, section: 7, voice: '[calm]',
    title: 'Khách hàng bên ngoài | Nhân sự nội bộ', titleSize: 46, tag: 'VÍ DỤ',
    text: 'Ở vế thứ nhất là khách hàng bên ngoài; ở vế thứ hai là nhân sự nội bộ.',
    visual: 'Khung trái: khách hàng bên ngoài; khung phải: nhân sự nội bộ.' },
  { n: 26, frames: 183, speech: 159, seconds: 7, section: 7, voice: '[curious]', pauseAfter: 0.8,
    title: 'Đổi đối tượng, workflow có đổi?', tag: 'CÂU HỎI',
    text: 'Các bạn thử dự đoán trước: nếu chỉ đổi đối tượng phục vụ, liệu công việc phía sau có còn giống nhau không?',
    visual: 'Mũi tên phía sau hai khung hiện dấu hỏi thay vì nối giống nhau.' },
  { n: 27, frames: 90, speech: 0, seconds: 3, section: 7, silent: 3, title: 'Đổi đối tượng, workflow có đổi?', tag: 'CÂU HỎI', text: '',
    visual: 'Giữ nguyên hình của câu trước; không phát lời đọc.' },
  { n: 28, frames: 401, speech: 353, seconds: 15, section: 7, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Giải đáp và hỗ trợ mua hàng', tag: 'VÍ DỤ',
    text: 'Khi phục vụ khách hàng bên ngoài, quy trình có thể bắt đầu từ một câu hỏi của khách về sản phẩm hoặc chính sách, rồi đi tới việc giải đáp, tư vấn mua hàng, chăm sóc sau mua, hoặc hỗ trợ bán thêm và bán chéo.',
    visual: 'Khung khách hàng: câu hỏi về sản phẩm/chính sách → giải đáp → tư vấn mua hàng.' },
  { n: 29, frames: 478, speech: 430, seconds: 19, section: 7, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Phân loại và soạn nháp phản hồi', tag: 'VÍ DỤ',
    text: 'Khi hỗ trợ nhân sự nội bộ, cùng yêu cầu chatbot lại có thể bắt đầu từ một yêu cầu hỗ trợ, rồi cần phân loại yêu cầu, tra cứu thông tin nghiệp vụ nhanh, đề xuất nháp phản hồi để con người phê duyệt, hoặc chuyển câu hỏi phức tạp và rủi ro cao cho nhân sự hỗ trợ.',
    visual: 'Khung nội bộ: yêu cầu hỗ trợ → phân loại → nháp phản hồi → con người phê duyệt.' },
  { n: 30, frames: 275, speech: 227, seconds: 10, section: 7, voice: '[thoughtful] [slowly]', pauseAfter: 1.6,
    title: 'Workflow = chuỗi bước xử lý', tag: 'VÍ DỤ',
    text: 'Ở đây, workflow, tức là chuỗi các bước đang diễn ra để xử lý một việc, giúp các bạn nhìn thấy chatbot sẽ đứng ở đâu trong công việc thực tế.',
    visual: 'Đường dẫn bao quanh các bước trong mỗi khung; nhãn workflow trên đường dẫn.' },
  { n: 31, frames: 360, speech: 312, seconds: 11, section: 7, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Hai workflow khác nhau', tag: 'VÍ DỤ',
    text: 'Workflow của khách hàng bên ngoài xoay quanh việc giải đáp và hỗ trợ mua hàng; workflow của nội bộ lại xoay quanh yêu cầu hỗ trợ, tra cứu, soạn nháp và chuyển tiếp.',
    visual: 'Hai workflow cạnh nhau; bên ngoài nhấn giải đáp và mua hàng, bên trong nhấn hỗ trợ và nháp phản hồi.' },
  { n: 32, frames: 244, speech: 184, seconds: 7, section: 7, voice: '[confident] [slowly]', pauseAfter: 2,
    title: 'Chatbot chỉ là một khả năng', tag: 'VÍ DỤ',
    text: 'Vì vậy, đừng coi chatbot là toàn bộ bài toán; nó chỉ là một khả năng được đặt vào một workflow cụ thể.',
    visual: 'Chatbot thu nhỏ thành một mắt xích trong workflow, không còn phủ lên toàn bộ sơ đồ.' },

  // ── Phần 8 · Ba tình huống của chatbot ──────────────────────────────────────
  { n: 33, frames: 104, speech: 56, seconds: 3, section: 8, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Đi sâu thêm một bước', tag: 'VÍ DỤ',
    text: 'Mình đi sâu thêm một bước với ví dụ này.',
    visual: 'Chuyển sang bố cục ba vùng, các vùng xuất hiện lần lượt.' },
  { n: 34, frames: 268, speech: 220, seconds: 10, section: 8, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Chatbot phục vụ khách hàng', tag: 'VÍ DỤ',
    text: 'Tình huống thứ nhất là một chatbot phục vụ khách hàng: nó gặp câu hỏi thường gặp về sản phẩm và chính sách, sau đó hỗ trợ tư vấn mua hàng.',
    visual: 'Tình huống 1 bên trái: câu hỏi thường gặp về sản phẩm và chính sách → tư vấn mua hàng.' },
  { n: 35, frames: 291, speech: 243, seconds: 9, section: 8, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Chatbot hỗ trợ nội bộ', tag: 'VÍ DỤ',
    text: 'Tình huống thứ hai là chatbot phục vụ nội bộ: nó tiếp nhận yêu cầu hỗ trợ, tra cứu thông tin nghiệp vụ và chuẩn bị nháp phản hồi.',
    visual: 'Tình huống 2 bên phải: yêu cầu hỗ trợ → tra cứu thông tin nghiệp vụ → nháp phản hồi.' },
  { n: 36, frames: 294, speech: 246, seconds: 11, section: 8, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'Chuyển cho nhân sự hỗ trợ', tag: 'VÍ DỤ',
    text: 'Tình huống thứ ba là khi câu hỏi phức tạp hoặc rủi ro cao xuất hiện: việc xử lý được chuyển cho nhân sự hỗ trợ, thay vì để chatbot tự đi tiếp.',
    visual: 'Nhánh câu hỏi phức tạp hoặc rủi ro cao đổi hướng sang nhân sự hỗ trợ.' },
  { n: 37, frames: 158, speech: 116, seconds: 5, section: 8, voice: '[thoughtful]',
    title: 'Không chỉ đổi giao diện', tag: 'VÍ DỤ',
    text: 'Các bạn thấy đấy, đối tượng khác nhau không chỉ đổi giao diện hay cách gọi tên.',
    visual: 'Hai tình huống cạnh nhau; cả khung giao diện và các bước phía sau đổi màu, đổi hướng.' },
  { n: 38, frames: 201, speech: 159, seconds: 7, section: 8, voice: '[serious]',
    title: 'Công việc và điểm can thiệp thay đổi', titleSize: 46, tag: 'VÍ DỤ',
    text: 'Nó đổi cả công việc cần xử lý, bước nào được tự động hỗ trợ, và lúc nào con người phải tham gia.',
    visual: 'Bước công việc, vùng tự động hỗ trợ và điểm con người tham gia lần lượt viền sáng.' },
  { n: 39, frames: 253, speech: 193, seconds: 8, section: 8, voice: '[confident]', pauseAfter: 2,
    title: 'Không mặc nhiên dùng chung mô tả', tag: 'VÍ DỤ',
    text: 'Vì thế, cùng một yêu cầu chatbot AI nhưng bên ngoài và bên trong không thể mặc nhiên dùng chung một cách mô tả bài toán.',
    visual: 'Hai mô tả bài toán tách thành hai thẻ riêng, cùng bắt đầu từ chatbot AI.' },

  // ── Phần 9 · Đi ngược từ công nghệ ──────────────────────────────────────────
  { n: 40, frames: 137, speech: 89, seconds: 4, section: 9, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'Dừng ở chỗ dễ hiểu sai',
    text: 'Đến đây, mình muốn dừng lại ở chỗ các bạn dễ nhầm nhất.',
    visual: 'Dừng ở hai thẻ bài toán; một dấu dừng tại điểm dễ hiểu sai.' },
  { n: 41, frames: 170, speech: 122, seconds: 5, section: 9, voice: '[curious] [slowly]', pauseAfter: 1.6,
    title: 'Đừng bắt đầu từ công nghệ',
    text: 'Nếu nói “hãy làm chatbot”, các bạn có thể bắt đầu nghĩ ngay tới công nghệ.',
    visual: 'Bong bóng “hãy làm chatbot” hiện trước; lớp công nghệ phóng to chiếm tiền cảnh.' },
  { n: 42, frames: 449, speech: 401, seconds: 15, section: 9, voice: '[thoughtful] [slowly]', pauseAfter: 1.6,
    title: 'Hỏi ngược từng bước',
    text: 'Nhưng hãy đi ngược lại từng bước: trước hết hỏi người dùng đang mắc ở công đoạn nào; tiếp theo xem quy trình hiện tại đang diễn ra ra sao; rồi xác định ai đang bị quá tải và điểm vướng xuất hiện lặp lại ở đâu.',
    visual: 'Mũi tên đảo chiều: người dùng → công đoạn → quy trình hiện tại → quá tải và điểm vướng lặp lại.' },
  { n: 43, frames: 298, speech: 250, seconds: 10, section: 9, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'Nhận diện pain point trước',
    text: 'pain point, tức là điểm đau cụ thể nơi người dùng gặp khó khăn, phàn nàn hoặc bị tắc nghẽn, là thứ cần được nhận diện trước khi đề xuất giải pháp.',
    visual: 'Vùng điểm đau tại chỗ tắc trong workflow, gom dấu hiệu khó khăn, phàn nàn, nghẽn.' },
  { n: 44, frames: 226, speech: 166, seconds: 7, section: 9, voice: '[serious] [slowly]', pauseAfter: 2,
    title: 'Chưa rõ pain point, chưa chọn giải pháp', titleSize: 46,
    text: 'Khi chưa hiểu pain point, mình chưa có căn cứ để biết chatbot có đang giải quyết đúng việc hay không.',
    visual: 'Chatbot đứng ngoài workflow, chỉ được đưa vào sau khi điểm đau được làm rõ.' },

  // ── Phần 10 · Metric và dấu hiệu cảnh báo ───────────────────────────────────
  { n: 45, frames: 350, speech: 302, seconds: 13, section: 10, voice: '[calm] [slowly]', pauseAfter: 1.6,
    title: 'Metric để theo dõi kết quả',
    text: 'Các bạn cũng cần một metric, tức là chỉ số dùng để theo dõi và đánh giá kết quả của việc cải tiến, vì slide nhấn mạnh rằng các đối tượng khác nhau dẫn tới các chỉ số khác nhau.',
    visual: 'Thẻ metric cạnh mỗi workflow; hai thẻ có dấu hiệu khác nhau, không ghi tên hay giá trị.' },
  { n: 46, frames: 295, speech: 247, seconds: 11, section: 10, voice: '[serious] [slowly]', pauseAfter: 1.6,
    title: 'Không dùng một bộ đo mặc định',
    text: 'Ở đây mình không tự gán tên hay giá trị cụ thể cho chỉ số; điều cần nhớ là không được dùng một bộ đo mặc định cho hai bài toán khác nhau.',
    visual: 'Gạch chéo ngăn việc kéo cùng một bộ đo sang cả hai workflow.' },
  { n: 47, frames: 206, speech: 164, seconds: 6, section: 10, voice: '[serious]',
    title: 'Giải pháp trước điểm đau',
    text: 'Đó là lý do bắt đầu từ giải pháp thay vì điểm đau là dấu hiệu bài toán chưa sẵn sàng.',
    visual: 'Mũi tên từ chatbot gặp dấu cảnh báo trước khi tới vùng pain point còn trống.' },
  { n: 48, frames: 348, speech: 306, seconds: 12, section: 10, voice: '[serious]',
    title: 'Cảnh giác với bài toán chưa sẵn sàng', titleSize: 46,
    text: 'Những dấu hiệu khác cũng cần cảnh giác là chưa làm rõ quy trình vận hành, chưa có căn cứ đánh giá hiệu quả, hoặc chưa xác định ranh giới khi AI sai và thời điểm con người cần phê duyệt.',
    visual: 'Ba dấu cảnh báo phủ lên workflow: hiện trạng chưa rõ · hiệu quả chưa có căn cứ · ranh giới con người chưa xác định.' },
  { n: 49, frames: 264, speech: 204, seconds: 8, section: 10, voice: '[confident]', pauseAfter: 2,
    title: 'Làm rõ Problem Statement trước',
    text: 'Khi gặp các dấu hiệu này, mình quay lại làm rõ Problem Statement, tức phần mô tả bài toán cần giải quyết, trước khi chọn công nghệ.',
    visual: 'Cảnh báo thu lại; Problem Statement xuất hiện trước công nghệ, mũi tên chọn công nghệ đặt sau.' },

  // ── Phần 11 · Mạch suy nghĩ tiếp theo ───────────────────────────────────────
  { n: 50, frames: 446, speech: 404, seconds: 14, section: 11, voice: '[warmly]',
    title: 'Giải pháp · Đối tượng · Workflow · Metric', titleSize: 46,
    text: 'Các bạn hãy giữ lại mạch suy nghĩ này: yêu cầu chatbot chỉ cho chúng ta biết hình hài giải pháp; đối tượng phục vụ và pain point mới giúp làm rõ bài toán; workflow cho thấy công việc thực tế; còn metric giúp theo dõi kết quả.',
    visual: 'Bốn khái niệm xếp thành mạch: yêu cầu chatbot → đối tượng và pain point → workflow → metric.' },
  { n: 51, frames: 332, speech: 272, seconds: 9, section: 11, voice: '[excited]', pauseAfter: 2,
    title: 'Tiếp theo: Double Diamond',
    text: 'Sang “Double Diamond: tìm đúng vấn đề trước khi tìm đúng giải pháp”, mình sẽ nối tiếp bằng cách tìm và định hình đúng vấn đề trước khi lựa chọn giải pháp.',
    visual: 'Mạch khái niệm trượt sang hình hai viên kim cương, mở đầu phần tìm và định hình vấn đề.' },
];

export const SECTIONS = [
  'Mở ngày · Đặt đúng bài toán',
  'Mở ngày · Mục tiêu sau ngày học',
  'Mở ngày · Từ làm rõ đến quyết định',
  'Mở ngày · Lập trường và bốn câu hỏi',
  'Mở ngày · Bước vào Module 1',
  'Yêu cầu chưa thành bài toán',
  'Đổi đối tượng, đổi workflow',
  'Ba tình huống của chatbot',
  'Đi ngược từ công nghệ',
  'Metric và dấu hiệu cảnh báo',
  'Mạch suy nghĩ tiếp theo',
];

const FPS = 30;
let cursor = 0;
export const CUES = RAW.map((c) => {
  const start = cursor;
  cursor += c.frames ?? c.seconds * FPS;
  return { ...c, screen: c.title, start, end: cursor };
});
export const DURATION = cursor;

const syllables = (s) => s.trim().split(/\s+/).filter(Boolean).length;

/**
 * Scene-local frame at which `phrase` starts being spoken in cue `n` (syllable share of the measured
 * speech; before recording, 3 syllables/s). Beats: a card appears 4–8 frames before its words.
 */
export function spokenAt(n, phrase) {
  const c = RAW[n - 1];
  const i = c.text.indexOf(phrase);
  if (i < 0) throw new Error(`"${phrase}" is not in the narration of câu ${n}`);
  const before = syllables(c.text.slice(0, i));
  if (c.speech) return Math.round((before / syllables(c.text)) * c.speech);
  return Math.round(before * (FPS / 3));
}

/** Scene-local frame the narration of cue `n` ends (before the trailing pause). */
export const speechEnd = (n) => {
  const c = RAW[n - 1];
  return c.speech ?? Math.round(syllables(c.text) * (FPS / 3));
};
