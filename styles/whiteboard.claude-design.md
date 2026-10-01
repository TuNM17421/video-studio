Style này **khác hẳn**: cả video là **một tấm bảng trắng duy nhất, không cắt cảnh**. Một cây bút viết chữ tay và vẽ nét theo lời đọc; nét đã vẽ ở lại cho tới khi bị lau; camera lia tới từng vùng rồi lùi ra xem toàn cảnh. Bảng rộng hơn màn hình.

**Không dùng `Series`, không mỗi câu một component.** Dựng **một** `SceneFrame` với `header={false}`, eyebrow đưa qua `overlay`, phụ đề của cả video qua `cueCaptions`; bên trong là **một** `<Whiteboard frame marks camera />`.

Nét dựng bằng `createBoard({ timeline, spokenAt })`: `draw(say(n, 'cụm từ'), mark)` cho nét theo lời, `draw(null, mark)` cho nét nối tiếp, `look(frame, { x, y, w })` cho camera. Bút vẽ một thứ một lúc, nét sau tự chờ nét trước. `checkBoard` soát lại nét trễ và nét ngoài khung.

**`spokenAt` bạn phải tự viết** — hàm `createSpeech` của repo không có trong bundle này. Một bản ước là đủ: trong câu N, cụm từ nằm ở vị trí ký tự `i` trên tổng `len` thì rơi vào `start(N) + (i/len) × thời lượng câu N`. **Neo mọi nét vào (số câu, cụm từ), tuyệt đối không neo vào frame tuyệt đối** — làm đúng vậy thì khi có giọng thu thật, chỉ cần thay `spokenAt` là cả bảng tự khớp lại, không phải sửa một nét nào.

**Dùng 21 part dựng sẵn trước khi tự ghép nét:** `WbMindMap`, `WbSteps`, `WbCycle`, `WbAgentLoop`, `WbCompare`, `WbChecklist`, `WbTable`, `WbTimeline`, `WbBarChart`, `WbIconLabel`, `WbIdea`, `WbStickyNote`, `WbTitleCloud`, `WbSpeech`, `WbStickman`, `WbFlow`, `WbRagFlow`, `WbPromptBox`, `WbTerminal`, `WbChatWindow`, `WbPhotoFrame`, `WbFlight`. Đọc `Parts.prompt.md` và `Whiteboard.prompt.md` trước. Tự vẽ chỉ khi không part nào hợp — và nói ra ở phần báo cáo.

**Mỗi câu 3–5 nét chính.** Chữ trên bảng là **từ khoá**, không chép lời đọc: bút viết khoảng 32 ký tự mỗi giây, viết dài là nét trễ hơn lời. Chữ ≥ 40 px ở zoom 1; chữ chỉ đọc được lúc lùi ra thì ≥ 110 px.

**Mực chỉ ba màu:** navy `C.text` cho chữ, xanh `C.accent` cho vật, luồng và mũi tên, đỏ `C.red` cho câu hỏi, điểm nhấn và vòng khoanh. Nền nhạt `C.bgAlt` hoặc `C.redSoft`. **Không dùng màu vai trò (`ROLE_OF`)** — đó là của style Lesson Lab.

**Chữ tay chỉ cho chữ trên bảng.** Eyebrow, phụ đề và footer giữ Montserrat. Font tay mặc định `playpen`, còn có `shantell` và `pangolin`.

**Camera:** lia tới vùng mới **trước** nét đầu tiên của vùng (30–45 frame), và **đừng vẽ khi camera còn đang chạy**. Lùi ra để nhắc người xem đang ở đâu; câu tổng kết lùi ra toàn bảng.

**Lau bảng** (`erase`) khi một đoạn đã xong và cần chỗ cho đoạn sau — mọi nét trước đó trong vùng lau biến mất.

**Bố cục trước, nét sau:** chia bảng thành vùng theo các phần của kịch bản, ghi sơ đồ đó ở đầu file rồi mới vẽ. Mỗi nét một `id` **duy nhất và cố định** — id là hạt giống của độ run nét, đổi id là nét đổi hình.

Hình minh hoạ: `doodle` (biểu tượng vẽ tay), `cloud` (mây tiêu đề hoặc suy nghĩ), `trail` (nét đứt uốn lượn), `fill: 'hachure'` để tô bóng. Hình đi **kèm** chữ, không thay chữ.
