# Nhật ký sản xuất · D10-03 · Dữ liệu đạt chất lượng nghĩa là gì? (24 cảnh · 09:01)

## Nguồn và phạm vi bài học
- **Kịch bản**: `kich-ban-chi-tiet.md` gồm 24 câu chuẩn hóa sư phạm chuyên sâu, đào sâu bản chất kiểm định chất lượng dữ liệu phục vụ Agent và hệ thống AI.
- **Thuyết minh đồng bộ trực quan**: Mọi bảng biểu, thẻ so sánh, 6 khía cạnh, 4 vị trí Quality Gates, Data Contract và cơ chế triệt tiêu Ghost Vectors đều được giới thiệu chi tiết, dẫn dắt mạch lạc trong lời bình (voiceover).
- **Phạm vi slide**: Slide 048–067 của giáo trình Day 10 (Bộ bài giảng 138 trang của VinUni).
- **5 Trọng tâm kiến thức cốt lõi**:
  1. **Nghịch lý Quality (Valid ≠ Accurate)**: Ví dụ nhập thừa số 0 ở cột lương — dữ liệu vượt qua kiểm tra cấu trúc kỹ thuật (schema valid) nhưng sai lệch bản chất nghiệp vụ (business inaccurate). Dữ liệu đạt chất lượng là dữ liệu đủ độ tin cậy để Agent hành động.
  2. **Bộ 6 khía cạnh chất lượng dữ liệu & Data Profiling**: Khám phá 6 chiều (Completeness, Accuracy, Consistency, Timeliness, Validity, Uniqueness) chiếu trên tài liệu Chính sách nghỉ phép. Quy trình Data Profiling tự động đo lường phân phối thống kê, phát hiện tỷ lệ Null, Min/Max và dị biệt Anomaly trước khi nạp vào kho tri thức.
  3. **4 Vị trí cắm Quality Gates trên Pipeline**:
     - Cổng 1 (Ingestion): Kiểm tra Schema & Availability.
     - Cổng 2 (Staging / Post-transform): Kiểm tra Completeness & Logic nghiệp vụ.
     - Cổng 3 (Pre-embedding / Vector Store): Kiểm tra Semantic Chunking, Metadata & Token Bounds.
     - Cổng 4 (Production / Runtime): Kiểm tra độ trôi phân phối dữ liệu (Data Drift).
     - Cơ chế tự vệ: Fail-Fast (chặn đứng sự cố diện rộng) vs Quarantined / DLQ (cách ly bản ghi hỏng để tiếp tục dòng chảy).
  4. **Data Contract & Triết lý Shift-Left**: Chuyển dịch trách nhiệm chất lượng từ hạ nguồn lên gốc nguồn (Upstream Ownership). Thỏa thuận phân định rõ Schema, SLA, Semantics, ngăn chặn tình trạng nhà phát triển backend tự ý đổi API làm đổ vỡ Agent.
  5. **Debug triệu chứng Agent & Ghost Vectors**: Cây phân loại lỗi (Retrieval fail, Generation hallucination, Upstream dirty data). Kỹ thuật truy vết ngược nguồn gốc (Lineage / Provenance). Đặc trị hiện tượng "Ghost Vectors" — vector ma sót lại sau khi văn bản gốc đã bị xóa hoặc sửa, bằng cơ chế Atomic Versioning / Shadow Index.
- **Cầu nối sang D10-04**: Đặt nền móng vững chắc cho bước tiếp theo — Đánh giá hệ thống RAG với các chỉ số Retrieval, Generation và phương pháp LLM-as-a-Judge.
- **Style**: `lesson`; tuân thủ nghiêm ngặt design system chung ở chế độ đọc (`vinuni-lesson-video-ds`), không can thiệp code dùng chung.

## Voice & Âm thanh
- **Công nghệ**: OmniVoice cục bộ (`k2-fsa/OmniVoice`), giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không phụ thuộc API bên ngoài.
- **Tốc độ**: `atempo=0.88` (nhịp điệu sư phạm rõ ràng, truyền cảm, dễ dàng tiếp thu các khái niệm kỹ thuật trừu tượng).
- **Khoảng thở giữa cue**: 1,4 giây (đảm bảo không gian suy ngẫm cho người học và đồng bộ mượt mà với hoạt cảnh).
- **Chuẩn hóa phát âm (`pronounce.json`)**: Hơn 70 thuật ngữ tiếng Anh chuyên ngành được phiên âm chính xác sang ngữ âm tiếng Việt tự nhiên (Data Contract, Shift-Left, Ghost Vectors, Quality Gate, Fail-Fast, DLQ, PII, Semantic Chunking, Metadata, Shadow Index, Atomic Versioning, Ingestion, Staging, Pre-embedding, Data Drift, Profiling, Outlier, Anomaly, SLA, Completeness, Accuracy, Consistency, Timeliness, Validity, Uniqueness...).
- **Quy mô âm thanh**: 24/24 câu, 16.240 frame, 541,33 giây (09:01.33).

## Visual & Animation
- **24 Cảnh bài giảng chuyên sâu** được tổ chức và hiển thị trong `QualityScene.jsx`.
- **Thanh định hướng Ribbon 5 chặng**: 
  - `1. VALID ≠ ACCURATE` (Cảnh 01–02)
  - `2. 6 DIMENSIONS & PROFILING` (Cảnh 03–09)
  - `3. 4 VỊ TRÍ QUALITY GATES` (Cảnh 10–15)
  - `4. DATA CONTRACT & SHIFT-LEFT` (Cảnh 16–18)
  - `5. DEBUG & GHOST VECTORS` (Cảnh 19–24)
- **Linh vật VinUni**: Nằm ở vị trí an toàn (`x = 1515, y = 500, w = 275`) trên nền trong suốt (floating transparent), cử động nhún thở nhẹ (`bob` / `pulse`), tạo cảm giác đồng hành thân thiện.
- **Bố cục & Thẩm mỹ**:
  - Tận dụng tối đa không gian màn hình 1920×1080 px nền trắng VinUni chuẩn.
  - Phân tầng thông tin rõ rệt bằng thẻ đổ bóng nhẹ, viền tinh tế, mã màu phân loại trực quan (Xanh lá: Passed/Clean; Vàng/Cam: Quarantined/Warning; Đỏ: Broken/Ghost Vector).
  - Loại bỏ hoàn toàn thanh màu trang trí thừa ở đáy và nhãn câu số cứng nhắc ("Câu 1", "Câu 2").
  - Đảm bảo an toàn không gian cho phụ đề ở đáy màn hình (`y >= 960`).

## Kiểm tra & Nghiệm thu
- **Build**: Bundle runtime `day10.js` biên dịch thành công (1528.8 KiB).
- **Visual QA**: Toàn bộ 24 ảnh tĩnh tại thời điểm settled (`s01-settled.png` đến `s24-settled.png`) được chụp tự động bằng CDP và mở kiểm tra trực quan chi tiết bằng tool `view_file`.
- **Render MP4**: Render tự động với 6 Chrome worker song song, gắn ghép trực tiếp với narration master `voice.wav`, đồng bộ tuyệt đối 16.240 frame (541,33 giây).
- **Phụ đề**: `2_Transcript_D10_03.txt` (157 đoạn phụ đề có timestamp chi tiết).
- **Chương mục**: `3_Chapters_D10_03.txt` (7 mốc chương lớn chuẩn hóa theo định dạng `MM:SS: Tiêu đề`).
- **Gói nộp hoàn chỉnh**: Bộ 4 file chuẩn tại thư mục `day10/05-final-package/d10-03-bo-4-file-nop/`.
