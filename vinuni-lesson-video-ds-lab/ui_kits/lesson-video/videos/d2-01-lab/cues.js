/**
 * D2-01 (lab) · Tách yêu cầu giải pháp khỏi vấn đề cần giải quyết.
 * Source: projects/d2-01-lab/kich-ban-goc.md (N2-01, bản rà 07/09/2026), 46 câu đọc + 1 khoảng dừng.
 *
 * One cue = one narrated sentence = one scene. `text` is the locked narration — verbatim from the
 * script except the edits asked for in the DAY02 feedback (listed in projects/d2-01-lab/PROMPTS.md):
 *   · the support agent "Minh" is renamed "Dũng" (Minh sounds like "mình", the narrator's pronoun);
 *   · câu 04 says who Lan is; câu 15 and 18 say who meets the difficulty / who waits.
 * `voice` = delivery direction sent to ElevenLabs eleven_v3 only (audio tag; never shown, never captioned).
 * `silent` = a held pause with no narration (câu 42). `pauseAfter` = seconds of silence after the câu
 * (default 1.4 s — the feedback asked for slower scene changes).
 * `frames` / `speech` = measured voice (frames at 30 fps) written by tools after TTS; before that the
 * script estimate `seconds` is used. `section` = the script's part (1–6), used for chapters.
 */
const RAW = [
  // ── Phần 1 · Mở đầu — đề nghị làm trợ lý hội thoại ──────────────────────────
  {
    n: 1, frames: 209, speech: 167, seconds: 10, section: 1, voice: '[curious]',
    title: 'Giải pháp hay vấn đề?', tag: 'MINH HỌA',
    text: 'Nếu đội hỗ trợ muốn làm phần mềm để học viên nhắn hỏi và nhận trả lời, bạn đã biết khó khăn cần giải quyết chưa?',
    visual: 'Thẻ CẦN TRỢ LÝ HỘI THOẠI hiện giữa Lan và Dũng; dấu hỏi nối về hai nhân vật.',
  },
  {
    n: 2, frames: 214, speech: 172, seconds: 9, section: 1, voice: '[thoughtful]',
    title: 'Chưa rõ lý do', tag: 'MINH HỌA',
    text: 'Phần mềm trò chuyện như vậy gọi là trợ lý hội thoại, nhưng tên gọi chưa cho biết học viên đang vướng điều gì.',
    visual: 'Đặt thẻ trợ lý hội thoại và hai bong bóng trao đổi ở bên phải; ô khó khăn cần giải quyết bên trái còn trống.',
  },
  {
    n: 3, frames: 213, speech: 171, seconds: 9, section: 1, voice: '[warmly]',
    title: 'Minh họa: hỗ trợ nộp bài', tag: 'MINH HỌA',
    text: 'Mình sẽ theo tình huống minh họa Lan tìm hướng dẫn nộp bài, bắt đầu từ khó khăn rồi mới chọn cách giải quyết.',
    visual: 'Vẽ bốn chặng: làm rõ vấn đề → tìm phương án → phân công người và máy → chọn cách tổ chức; tô chặng đầu.',
  },
  {
    n: 4, frames: 209, speech: 167, seconds: 8, section: 1, voice: '[thoughtful]',
    title: 'Hướng dẫn phân tán', tag: 'MINH HỌA',
    text: 'Lan là học viên mới, sắp nộp bài lần đầu, nhưng hướng dẫn nằm rải rác trên nhiều trang của khóa học.',
    visual: 'Lan (học viên mới) mở lần lượt trang bài, tài liệu và hộp thư; mỗi nơi lộ một mảnh hướng dẫn.',
  },
  {
    n: 5, frames: 247, speech: 205, seconds: 9, section: 1, voice: '[sighs]',
    title: 'Dũng phải trả lời lại', tag: 'MINH HỌA',
    text: 'Dũng là nhân viên hỗ trợ phải trả lời những câu hỏi lặp lại, như gửi đường dẫn rồi hỏi Lan học lớp nào.',
    visual: 'Dũng (nhân viên hỗ trợ) kéo thẻ đường dẫn vào ô trả lời rồi thêm câu hỏi mã lớp.',
  },
  {
    n: 6, frames: 228, speech: 168, seconds: 8, section: 1, voice: '[confident]', pauseAfter: 2,
    title: 'Nêu khó khăn · Chọn cách đo',
    text: 'Cuối video, bạn sẽ viết một câu nêu rõ khó khăn và chọn cách đo xem khó khăn ấy có giảm không.',
    visual: 'Hai ô đầu ra hiện cạnh nhau: câu vấn đề và đồng hồ đo kết quả.',
  },

  // ── Phần 2 · Tách công việc, trở ngại và giải pháp ──────────────────────────
  {
    n: 7, frames: 153, speech: 111, seconds: 6, section: 2, voice: '[calm]',
    title: 'Công việc cần hoàn thành', tag: 'MINH HỌA',
    text: 'Công việc Lan muốn hoàn thành là gửi đúng bài vào đúng nơi trước thời hạn.',
    visual: 'Hiện đích nộp đúng bài; trợ lý hội thoại nằm ngoài đường từ Lan tới đích.',
  },
  {
    n: 8, frames: 146, speech: 104, seconds: 6, section: 2, voice: '[thoughtful]',
    title: 'Giá trị gắn với công việc', tag: 'MINH HỌA',
    text: 'Trò chuyện với máy chỉ có ích nếu giúp Lan hoàn thành công việc ấy.',
    visual: 'Bong bóng hội thoại chỉ sáng khi nối được tới nút nộp đúng nơi.',
  },
  {
    n: 9, frames: 155, speech: 113, seconds: 7, section: 2, voice: '[serious]',
    title: 'Trở ngại cụ thể', tag: 'MINH HỌA',
    text: 'Trở ngại hiện tại là Lan chưa xác định được hướng dẫn nào áp dụng cho lớp của mình.',
    visual: 'Ba tài liệu có nhãn lớp khác nhau trượt vào; Lan phân vân trước ba nhánh.',
  },
  {
    n: 10, frames: 236, speech: 194, seconds: 10, section: 2, voice: '[serious]',
    title: 'Giải pháp là cách giải quyết được chọn', titleSize: 46, tag: 'MINH HỌA',
    text: 'Đề nghị làm trợ lý hội thoại đã nói đến cách giải quyết, trong khi nhóm còn cần xác nhận vì sao Lan gặp khó khăn.',
    visual: 'Đưa thẻ trợ lý hội thoại vào ngăn GIẢI PHÁP, tách khỏi hai ngăn công việc và trở ngại.',
  },
  {
    n: 11, frames: 189, speech: 147, seconds: 8, section: 2, voice: '[concerned]',
    title: 'Làm rõ trước khi xây', tag: 'MINH HỌA',
    text: 'Nếu chỉ lo xây phần mềm trò chuyện, nhóm có thể bỏ qua chỗ khiến Lan không tìm được đúng hướng dẫn.',
    visual: 'Thẻ phần mềm trò chuyện che mất bước Lan chọn hướng dẫn; kéo thẻ sang bên để lộ chỗ chọn nhầm lớp.',
  },
  {
    n: 12, frames: 198, speech: 156, seconds: 8, section: 2, voice: '[serious]',
    title: 'Nhanh chưa đủ', tag: 'MINH HỌA',
    text: 'Trợ lý hội thoại trả lời nhanh nhưng gửi nhầm hướng dẫn thì Lan vẫn chưa nhận được kết quả cần thiết.',
    visual: 'Bong bóng trả lời hiện nhanh; đường dẫn sai dẫn Lan tới hướng dẫn của lớp khác, chưa tới đúng nơi nộp bài.',
  },
  {
    n: 13, frames: 196, speech: 154, seconds: 8, section: 2, voice: '[curious]',
    title: 'Giữ nhiều hướng giải quyết', tag: 'MINH HỌA',
    text: 'Một nút hướng dẫn đặt đúng chỗ cũng có thể giúp Lan, dù phương án này không dùng trí tuệ nhân tạo.',
    visual: 'Đặt nút cạnh bài tập; đường từ Lan tới hướng dẫn đúng rút ngắn.',
  },
  {
    n: 14, frames: 236, speech: 176, seconds: 9, section: 2, voice: '[confident]', pauseAfter: 2,
    title: 'Nêu vấn đề trước, chọn cách giải quyết sau', titleSize: 44,
    text: 'Vì vậy, mình viết rõ Lan vướng điều gì trước, còn cách giải quyết sẽ chọn sau khi đã hiểu khó khăn đó.',
    visual: 'Giữ người dùng, trở ngại và hậu quả trong câu vấn đề; mở ba hướng giải pháp bên cạnh.',
  },

  // ── Phần 3 · Tìm bằng chứng bằng câu hỏi cụ thể ─────────────────────────────
  {
    n: 15, frames: 188, speech: 146, seconds: 8, section: 3, voice: '[curious]',
    title: 'Ai gặp vấn đề?', tag: 'MINH HỌA',
    text: 'Trước tiên là ai gặp khó khăn, vì học viên mới có thể vướng những chỗ mà học viên cũ không gặp.',
    visual: 'Hai thẻ học viên mới và học viên cũ cạnh cùng giao diện; tô nhóm mới.',
  },
  {
    n: 16, frames: 195, speech: 153, seconds: 7, section: 3, voice: '[curious]',
    title: 'Vướng ở bước nào?', tag: 'MINH HỌA',
    text: 'Tiếp theo, mình xác định Lan vướng ở bước tìm hướng dẫn, chọn nơi nộp hay tải tệp.',
    visual: 'Hiện ba bước tìm hướng dẫn → chọn nơi nộp → tải tệp; đánh dấu đúng bước mà phiếu quan sát ghi nhận.',
  },
  {
    n: 17, frames: 204, speech: 162, seconds: 9, section: 3, voice: '[thoughtful]',
    title: 'Có lặp lại ở người khác?', tag: 'MINH HỌA',
    text: 'Mình cũng hỏi những học viên khác có thường gặp khó khăn này không, vì một trường hợp chưa nói lên tình hình cả lớp.',
    visual: 'Một phiếu quan sát nhân thành hàng phiếu trống, nhắc cần thêm trường hợp.',
  },
  {
    n: 18, frames: 242, speech: 200, seconds: 8, section: 3, voice: '[serious]',
    title: 'Hậu quả là gì?', tag: 'MINH HỌA',
    text: 'Sau đó, mình tìm hậu quả cụ thể, như Lan phải chờ lâu, nộp nhầm nơi, hoặc Dũng phải trả lời lại.',
    visual: 'Từ ô khó tìm tỏa ba mũi tên tới đồng hồ (Lan chờ lâu), nơi nộp sai (Lan nộp nhầm) và thư lặp (Dũng trả lời lại).',
  },
  {
    n: 19, frames: 198, speech: 156, seconds: 8, section: 3, voice: '[calm]',
    title: 'Nghe kể và xem cách làm', tag: 'MINH HỌA',
    text: 'Nhóm xem học viên tự tìm hướng dẫn và ghi chỗ họ dừng lại, rồi đối chiếu với điều họ kể.',
    visual: 'Con trỏ Lan di chuyển trên giao diện; người quan sát đánh dấu lần quay lại trang trước.',
  },
  {
    n: 20, frames: 196, speech: 154, seconds: 8, section: 3, voice: '[curious]',
    title: 'Hỏi việc đã xảy ra', tag: 'MINH HỌA',
    text: 'Khi trao đổi, mình hỏi Lan đã tìm hướng dẫn ở đâu trước tiên, để biết điều thực sự xảy ra.',
    visual: 'Phiếu phỏng vấn hiện câu “Bạn đã tìm hướng dẫn ở đâu trước tiên?”; nối câu hỏi tới chuỗi thao tác của Lan.',
  },
  {
    n: 21, frames: 233, speech: 191, seconds: 10, section: 3, voice: '[thoughtful]',
    title: 'Xem lại các yêu cầu đã lưu', tag: 'MINH HỌA',
    text: 'Các yêu cầu hỗ trợ đã lưu giúp mình thấy câu hỏi nào lặp lại, nhưng cần đọc kỹ và hỏi thêm để hiểu lý do.',
    visual: 'Các phiếu hỗ trợ gom theo chủ đề; mở một phiếu để thấy chi tiết bên trong.',
  },
  {
    n: 22, frames: 200, speech: 158, seconds: 8, section: 3, voice: '[thoughtful]',
    title: 'Xem số câu hỏi trên mỗi học viên', titleSize: 46, tag: 'MINH HỌA',
    text: 'Nếu số học viên tăng, số câu hỏi cũng có thể tăng dù mỗi người không gặp khó khăn nhiều hơn.',
    visual: 'Vẽ hai cột số học viên và số câu hỏi cùng tăng; đặt câu hỏi về số lượt hỏi tính trên mỗi học viên.',
  },
  {
    n: 23, frames: 193, speech: 133, seconds: 7, section: 3, voice: '[calm]', pauseAfter: 2,
    title: 'Minh họa, không phải khảo sát thật', tag: 'MINH HỌA',
    text: 'Những ghi chép trên màn hình minh họa cách tìm bằng chứng, không phải kết quả khảo sát thật.',
    visual: 'Gắn nhãn MINH HỌA cố định trên toàn bộ phiếu và biểu đồ vừa dùng.',
  },

  // ── Phần 4 · Ví dụ hoàn chỉnh — viết và đo câu vấn đề ───────────────────────
  {
    n: 24, frames: 201, speech: 159, seconds: 9, section: 4, voice: '[thoughtful]',
    title: 'Yêu cầu ban đầu còn chung chung', titleSize: 46, tag: 'MINH HỌA',
    text: 'Yêu cầu ban đầu chỉ nói làm trợ lý hội thoại hỗ trợ học viên, nên mình cần viết lại cho rõ khó khăn.',
    visual: 'Hiện nguyên văn thẻ “Làm trợ lý hội thoại hỗ trợ học viên” ở cột trước.',
  },
  {
    n: 25, frames: 155, speech: 113, seconds: 7, section: 4, voice: '[calm]',
    title: 'Người dùng: học viên mới', tag: 'MINH HỌA',
    text: 'Mình bắt đầu bằng người đang gặp khó khăn, ở đây là học viên mới trong khóa học.',
    visual: 'Điền học viên mới vào mảnh đầu của mẫu câu, tô nhân vật Lan.',
  },
  {
    n: 26, frames: 158, speech: 116, seconds: 7, section: 4, voice: '[calm]',
    title: 'Khó việc gì, vào lúc nào?', tag: 'MINH HỌA',
    text: 'Tiếp theo, mình nêu họ khó tìm đúng hướng dẫn khi chuẩn bị nộp bài lần đầu.',
    visual: 'Điền trở ngại và bối cảnh; nối tới ba trang hướng dẫn phân tán.',
  },
  {
    n: 27, frames: 136, speech: 94, seconds: 6, section: 4, voice: '[calm]',
    title: 'Hậu quả trong ví dụ', tag: 'MINH HỌA',
    text: 'Cuối cùng là hậu quả phải chờ hỗ trợ và hỏi lại nhiều lần.',
    visual: 'Điền hậu quả; đồng hồ và hai bong bóng hỏi thêm hiện dưới câu.',
  },
  {
    n: 28, frames: 206, speech: 164, seconds: 9, section: 4, voice: '[confident]',
    title: 'Một câu vấn đề rõ', tag: 'MINH HỌA',
    text: 'Học viên mới khó tìm đúng hướng dẫn cho lớp mình trước lần nộp bài đầu tiên, nên phải chờ hỗ trợ và hỏi lại.',
    visual: 'Hiện nguyên câu thành ba cụm; lần lượt tô Học viên mới · khó tìm đúng hướng dẫn trước lần nộp đầu · phải chờ và hỏi lại.',
  },
  {
    n: 29, frames: 216, speech: 174, seconds: 9, section: 4, voice: '[thoughtful]',
    title: 'Chưa chọn công nghệ', tag: 'MINH HỌA',
    text: 'Câu vừa viết giúp nhóm hiểu cần giải quyết việc gì, còn trợ lý hội thoại có giúp được hay không vẫn phải thử.',
    visual: 'Đặt thẻ trợ lý hội thoại dưới mục giả thuyết giải pháp, cách câu vấn đề bằng đường chấm.',
  },
  {
    n: 30, frames: 198, speech: 156, seconds: 9, section: 4, voice: '[confident]',
    title: 'Chỉ số: thời gian tìm đúng hướng dẫn', titleSize: 44, tag: 'MINH HỌA',
    text: 'Mình chọn theo dõi thời gian tìm đúng hướng dẫn, gọi là một chỉ số để kiểm tra việc này có nhanh hơn không.',
    visual: 'Đồng hồ bắt đầu cạnh thao tác tìm; dừng cạnh hướng dẫn được đối chiếu đúng lớp.',
  },
  {
    n: 31, frames: 202, speech: 160, seconds: 8, section: 4, voice: '[calm]',
    title: 'Minh họa: 19:00 → 19:08', tag: 'MINH HỌA',
    text: 'Trong phiếu minh họa, Lan bắt đầu lúc bảy giờ tối và tìm đúng hướng dẫn của lớp sau đó tám phút.',
    visual: 'Trục thời gian MINH HỌA 19:00 → 19:08; đầu mốc là bắt đầu tìm, cuối mốc là xác nhận đúng hướng dẫn.',
  },
  {
    n: 32, frames: 196, speech: 154, seconds: 8, section: 4, voice: '[serious]',
    title: 'Tính cả thời gian chờ', tag: 'MINH HỌA',
    text: 'Thời gian tìm trong ví dụ là tám phút, chứ không chỉ là thời gian Dũng gõ câu trả lời cuối cùng.',
    visual: 'Tô cả khoảng tám phút; đoạn Dũng gõ chỉ là một đoạn ngắn nằm bên trong.',
  },
  {
    n: 33, frames: 200, speech: 158, seconds: 9, section: 4, voice: '[calm]',
    title: 'Hai lượt hỏi thêm', tag: 'MINH HỌA',
    text: 'Mình ghi vị trí và nội dung hai lượt hỏi lại trên trục thời gian để tìm hiểu Lan vướng ở bước nào.',
    visual: 'Gắn hai bong bóng hỏi thêm cùng nội dung câu hỏi vào đúng vị trí trên trục thời gian; giữ nhãn MINH HỌA.',
  },
  {
    n: 34, frames: 248, speech: 188, seconds: 9, section: 4, voice: '[serious]', pauseAfter: 2,
    title: 'Cùng việc · Cùng điểm dừng', tag: 'MINH HỌA',
    text: 'Khi thử cách mới, nhóm vẫn giao cùng việc tìm hướng dẫn và chỉ dừng đồng hồ khi tìm đúng hướng dẫn của lớp.',
    visual: 'Hai phiếu trước và sau cạnh nhau; cùng điểm bắt đầu, cùng điểm dừng; ô thời gian cách mới còn trống.',
  },

  // ── Phần 5 · Giữ lại điều chưa biết ─────────────────────────────────────────
  {
    n: 35, frames: 208, speech: 166, seconds: 8, section: 5, voice: '[thoughtful]',
    title: 'Đang cho là đúng, còn cần kiểm tra', titleSize: 46, tag: 'MINH HỌA',
    text: 'Nhóm cho rằng hướng dẫn khó tìm là nguyên nhân chính, nhưng đây mới là một giả định cần kiểm tra.',
    visual: 'Thẻ “Nhóm đang cho rằng: hướng dẫn khó tìm” cạnh câu vấn đề; dưới thẻ: Giả định = điều chưa được xác nhận.',
  },
  {
    n: 36, frames: 232, speech: 190, seconds: 9, section: 5, voice: '[thoughtful]',
    title: 'Tìm thấy khác với hiểu', tag: 'MINH HỌA',
    text: 'Nếu Lan đã thấy hướng dẫn nhưng không hiểu từ ngữ bên trong, việc đổi vị trí đường dẫn có thể chưa giúp nhiều.',
    visual: 'Lan mở đúng tài liệu nhưng dừng ở đoạn khó hiểu; nút truy cập vẫn xanh.',
  },
  {
    n: 37, frames: 226, speech: 184, seconds: 8, section: 5, voice: '[curious]',
    title: 'Lan đang thiếu điều gì?', tag: 'MINH HỌA',
    text: 'Mình cần xem thêm để biết Lan thiếu đường dẫn, thiếu thông tin hay đã thấy hướng dẫn mà vẫn không hiểu.',
    visual: 'Tách ba thẻ nguyên nhân; mũi tên từ phiếu quan sát nối từng thẻ.',
  },
  {
    n: 38, frames: 216, speech: 174, seconds: 9, section: 5, voice: '[warmly]',
    title: 'Lan tìm dễ hơn · Dũng bớt trả lời lại', titleSize: 44, tag: 'MINH HỌA',
    text: 'Điều nhóm muốn đạt là Lan tìm đúng hướng dẫn dễ hơn, còn Dũng bớt phải trả lời những câu hỏi lặp lại.',
    visual: 'Ghép đích Lan tìm đúng với Dũng ít xử lý lặp; bỏ biểu tượng số tin nhắn máy tạo.',
  },
  {
    n: 39, frames: 246, speech: 204, seconds: 10, section: 5, voice: '[serious]',
    title: 'Nhiều câu trả lời chưa chắc giúp được', titleSize: 44, tag: 'MINH HỌA',
    text: 'Số câu trả lời máy tạo ra chưa chứng minh khó khăn đã giảm, vì Lan có thể phải hỏi nhiều lần mới nhận được hướng dẫn đúng.',
    visual: 'Bộ đếm câu trả lời tăng trong khi vòng hỏi lại vẫn quay; đánh dấu chưa đủ bằng chứng.',
  },
  {
    n: 40, frames: 235, speech: 175, seconds: 9, section: 5, voice: '[confident]', pauseAfter: 2,
    title: 'Khó khăn · Cách đo · Điều chưa rõ',
    text: 'Trước khi xây, hãy ghi cạnh nhau khó khăn cần giải quyết, con số sẽ đo và điều nhóm còn chưa xác nhận.',
    visual: 'Ba thẻ hoàn chỉnh xếp thành bộ trên bàn nhóm thiết kế.',
  },

  // ── Phần 6 · Kiểm tra — quyết định đã đủ cơ sở chưa? ────────────────────────
  {
    n: 41, frames: 203, speech: 185, seconds: 10, section: 6, voice: '[curious]', pauseAfter: 0.6,
    title: 'Còn thiếu thông tin nào?', tag: 'CÂU HỎI',
    text: 'Đề nghị làm một trợ lý được tự chọn cách xử lý rồi gửi thư điện tử còn thiếu thông tin gì để quyết định có nên xây?',
    visual: 'Thẻ “Trợ lý tự chọn cách xử lý và gửi thư điện tử”; các ô Ai cần, Khó việc gì, Có bằng chứng gì, Muốn kết quả gì để trống.',
  },
  {
    n: 42, frames: 150, speech: 0, seconds: 5, section: 6, silent: 5,
    title: 'Dừng 5 giây', tag: 'CÂU HỎI',
    text: '',
    visual: 'Giữ nguyên câu hỏi, hiện năm chấm sáng rồi tắt từng chấm theo giây; không phát lời đọc.',
  },
  {
    n: 43, frames: 210, speech: 168, seconds: 9, section: 6, voice: '[calm]',
    title: 'Người dùng · khó khăn · bằng chứng', titleSize: 46,
    text: 'Mình cần biết ai gặp vấn đề, khó khăn ở bước nào và có bằng chứng gì cho thấy khó khăn ấy đang xảy ra.',
    visual: 'Điền lần lượt người gặp vấn đề, bước bị vướng và bằng chứng; giữ đề nghị gửi thư ở ngăn giải pháp chưa chọn.',
  },
  {
    n: 44, frames: 164, speech: 122, seconds: 7, section: 6, voice: '[serious]',
    title: 'Kết quả và hậu quả sai',
    text: 'Mình cũng cần biết kết quả mong muốn và hậu quả của việc gửi thư điện tử sai.',
    visual: 'Điền ô kết quả; ba biểu tượng lỗi thư điện tử hiện dưới ô hậu quả.',
  },
  {
    n: 45, frames: 192, speech: 150, seconds: 9, section: 6, voice: '[serious]',
    title: 'Chưa đủ cơ sở chọn',
    text: 'Tên giải pháp chưa cho biết những điều đó, nên nhóm chưa đủ cơ sở quyết định có nên xây hệ thống ấy.',
    visual: 'Giữ dấu hỏi trên thẻ giải pháp; đặt bộ câu hỏi tìm hiểu vấn đề lên trước.',
  },
  {
    n: 46, frames: 215, speech: 173, seconds: 9, section: 6, voice: '[warmly]',
    title: 'Nêu khó khăn và cách đo', tag: 'BÀI TẬP',
    text: 'Bạn hãy viết lại yêu cầu ấy thành một câu nêu rõ khó khăn và chọn một con số để theo dõi kết quả.',
    visual: 'Mẫu Người dùng… khó… khi… dẫn tới… hiện cùng ô chỉ số còn trống.',
  },
  {
    n: 47, frames: 200, speech: 140, seconds: 7, section: 6, voice: '[warmly]', pauseAfter: 2,
    title: 'Bắt đầu từ vấn đề',
    text: 'Từ câu vấn đề và cách kiểm tra, mình sẽ tìm các hướng giải quyết ở video sau.',
    visual: 'Giữ bộ ba thẻ, mở sang hình hai viên kim cương của bài tiếp theo.',
  },
];

export const SECTIONS = [
  'Mở đầu — đề nghị làm trợ lý hội thoại',
  'Tách công việc, trở ngại và giải pháp',
  'Tìm bằng chứng bằng câu hỏi cụ thể',
  'Ví dụ hoàn chỉnh — viết và đo câu vấn đề',
  'Giữ lại điều chưa biết',
  'Kiểm tra — quyết định đã đủ cơ sở chưa?',
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
 * Scene-local frame at which `phrase` starts being spoken in cue `n`. With the measured `speech` frames
 * the position is the phrase's syllable share of the recorded sentence; before recording, 3 syllables/s.
 * Use it to sync beats: a card appears 4–8 frames before its words.
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
