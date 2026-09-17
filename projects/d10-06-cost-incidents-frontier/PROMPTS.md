# Nhật ký sản xuất · D10-06 · Tối ưu chi phí FinOps, Bài học sự cố thực chiến & Radar Frontier 2026 (20 cảnh · ~11 phút)

## Nguồn và phạm vi bài học
- **Kịch bản**: `kich-ban-chi-tiet.md` gồm 20 câu chuẩn hóa sư phạm chuyên sâu, giảng giải cặn kẽ về quản trị chi phí FinOps trên pipeline dữ liệu, phân tích bài học từ các sự cố kinh điển thế giới (PHE COVID-19, Zillow Offers), phương pháp thẩm định tính xác thực của số liệu kỹ thuật, và radar xu hướng công nghệ dữ liệu đón đầu 2026.
- **Thuyết minh đồng bộ trực quan**: Toàn bộ các mô hình, bảng so sánh chi phí, tam giác đánh đổi (Latency, Cost, Complexity), cấu trúc lỗi PHE & Zillow, 3 lớp Root Cause, bẫy trích dẫn vòng tròn, thang đo 5 mức độ trưởng thành (Maturity Radar), và giao thức MCP đều được giảng giải chi tiết, rõ ràng từng thuật ngữ trong lời bình (voiceover) cho người mới bắt đầu.
- **Phạm vi slide**: Slide 105–126 của giáo trình Day 10 (Bộ bài giảng 138 trang của VinUni).
- **4 Chặng kiến thức cốt lõi**:
  1. **FinOps & Quản trị chi phí Pipeline dữ liệu (Cảnh 01–06)**:
     - 7 Tầng chi phí dồn tích: Ingestion API call, Network Egress, Compute Transform, Quality Validation, Embedding Generation, Vector Storage, Query & Re-ranking.
     - Full Refresh vs Incremental Sync: Đánh đổi độ phức tạp O(N) toàn phần so với O(delta) theo mốc thời gian thay đổi (`updated_at` / Change Data Capture - CDC).
     - Tam giác đánh đổi kiến trúc: Độ trễ (Latency), Chi phí (Cost) và Độ phức tạp (Complexity).
     - Bài toán kinh tế Re-indexing: Quản lý phiên bản dữ liệu thô (Raw data versioning) để không phải trích xuất lại, và kỹ thuật Shadow Indexing chuyển đổi mượt mà trong 1 mili-giây.
     - Triết lý TCO (Total Cost of Ownership): Chi phí cho một câu trả lời đáng tin cậy bao gồm cả rủi ro ảo giác và chi phí pháp lý.
  2. **Bài học sự cố thực chiến kinh điển (Cảnh 07–12)**:
     - Case Study 1: Public Health England (PHE, tháng 10/2020) - 15.841 ca mắc COVID-19 bị bỏ sót do nạp báo cáo qua file định dạng XLS cũ bị giới hạn ở 65.536 hàng.
     - 3 Bài học kỹ thuật đắt giá: Tránh âm thầm cắt tỉa dữ liệu (Silent Truncation), Đối soát số lượng hai đầu (Pipeline Reconciliation), và Giám sát dị biệt số liệu (Anomaly Detection).
     - Case Study 2: Zillow Offers (2021) - Thất bại của dịch vụ lướt nhà tự động iBuying dẫn đến khoản lỗ hơn 500 triệu USD và sa thải 25% nhân sự.
     - Phân định 3 lớp Root Cause: Bất định mô hình thuật toán (Model Uncertainty), Biến động thị trường vĩ mô và Giới hạn vận hành thực địa (Operational Bottlenecks).
     - Nguyên tắc "Nguồn nói đến đâu, Kết luận đến đó" (Fact-based Post-mortem) & Sự liêm chính trong phân tích dữ liệu.
  3. **Thẩm định con số & Nguồn tài liệu (Cảnh 13–15)**:
     - Hiện tượng "Bẫy trích dẫn vòng tròn" (Circular Citation) và sự thật về huyền thoại "80% thời gian dành cho chuẩn bị dữ liệu".
     - Bộ tiêu chí vàng 5 câu hỏi thẩm định số liệu (5 Golden Questions): Ai đo? Đo khi nào? Phương pháp gì? Định nghĩa thế nào? Có tái lập được không?
  4. **Radar Frontier & Xu hướng công nghệ 2026 (Cảnh 16–20)**:
     - Thang đo 5 trạng thái trưởng thành công nghệ: Shipped (Thương mại hóa), Preview (Thử nghiệm), Announced (Công bố lộ trình), Proposed (Đề xuất ý tưởng), Marketing (Truyền thông thổi phồng).
     - Agentic Data Pipeline: Phân biệt AI-Assisted (AI hỗ trợ viết code, con người kiểm duyệt) vs Autonomous Self-Healing (Hệ thống tự chẩn đoán và tự sửa lỗi runtime).
     - Giao thức MCP (Model Context Protocol) cho Data Warehouse: 3 chốt chặn bảo mật Auth, RBAC, và Audit Trail.
     - Nguy cơ Tấn công gián tiếp qua Prompt (Indirect Prompt Injection) khi Agent truy vấn cơ sở dữ liệu mở.
     - Xu hướng Data Curation chất lượng cao (FineWeb-Edu).
     - Kafka Diskless Topics (KIP-1150/1163) tách biệt tính toán và lưu trữ (Tiered Storage).
     - Bộ khung 4 tiêu chí thẩm định công nghệ mới (Evidence, Status, Risk, Value) và Lời đúc kết chuyển giao trọn vẹn toàn bộ giáo trình Day 10.
- **Cầu nối sang D10-07**: Chuyển giao toàn bộ kiến thức sang bài thực hành Lab 10, bảng kiểm tự đánh giá và lộ trình bước tiếp sang Day 13.
- **Style**: `lesson`; tuân thủ tuyệt đối design system chuẩn của bài học (`vinuni-lesson-video-ds`), không can thiệp code dùng chung.

## Voice & Âm thanh
- **Công nghệ**: OmniVoice cục bộ (`k2-fsa/OmniVoice`), giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không phụ thuộc API bên ngoài.
- **Tốc độ**: `atempo=0.88` (nhịp điệu sư phạm điềm đạm, gãy gọn, nhấn nhá trọng âm ở các từ khóa kỹ thuật và bài học kinh nghiệm).
- **Khoảng thở giữa cue**: 1,4 giây (khoảng lặng tự nhiên giúp tiếp thu trọn vẹn bài học).
- **Chuẩn hóa phát âm (`pronounce.json`)**: Hơn 60 thuật ngữ chuyên ngành được phiên âm chính xác sang ngữ âm tiếng Việt tự nhiên (FinOps, TCO, Full Refresh, Incremental Sync, CDC, Ingestion, Embedding, Re-indexing, Shadow Indexing, Cutover, Egress, Latency, Complexity, PHE, Public Health England, Silent Truncation, Reconciliation, Anomaly Detection, Zillow Offers, iBuying, Root Cause, Circular Citation, Shipped, Preview, Announced, Proposed, Marketing, Agentic Pipeline, Self-Healing, MCP, Model Context Protocol, RBAC, Audit Trail, Indirect Prompt Injection, FineWeb-Edu, Kafka Diskless Topics, KIP, Tiered Storage...).
- **Quy mô âm thanh**: 20/20 câu đồng bộ, thời lượng master audio đạt 664,633s (~11 phút 04 giây), 19.939 frame hình ở 30 fps.

## Visual & Animation
- **20 Cảnh bài giảng chuyên sâu** được tổ chức và kết xuất trực tiếp trong `CostScene.jsx`.
- **Thanh định hướng Ribbon 4 chặng**:
  - `1. FINOPS & CHI PHÍ PIPELINE` (Cảnh 01–06)
  - `2. BÀI HỌC SỰ CỐ THỰC CHIẾN` (Cảnh 07–12)
  - `3. THẨM ĐỊNH CON SỐ & NGUỒN` (Cảnh 13–15)
  - `4. FRONTIER & XU HƯỚNG 2026` (Cảnh 16–20)
- **Linh vật VinUni**: Nằm ở vị trí an toàn (`x = 1515, y = 490, w = 275`) trên nền trong suốt (floating transparent), cử động nhún thở nhẹ (`bob` / `pulse`), tạo cảm giác đồng hành thân thiện.
- **Bố cục & Thẩm mỹ**:
  - Tận dụng tối đa không gian màn hình 1920×1080 px nền trắng VinUni chuẩn.
  - Phân tầng thông tin rõ rệt bằng thẻ đổ bóng nhẹ, viền bo tinh tế, mã màu phân loại trực quan (Đỏ: Cảnh báo sự cố / P1 / Rủi ro bảo mật; Cam: Chi phí / Cân nhắc đánh đổi / Preview; Xanh dương: Kiến trúc / MCP / FinOps; Xanh lá: Thẩm định thành công / Safe / Shipped).
  - Sử dụng bộ bao văn bản thuần SVG `MultilineText` tự động tính toán dòng chữ, loại bỏ hiện tượng tràn viền.
  - Loại bỏ hoàn toàn thanh màu trang trí thừa ở đáy và nhãn câu số cứng nhắc ("Câu 1", "Câu 2").
  - Đảm bảo an toàn không gian cho phụ đề ở đáy màn hình (`y >= 960`).

## Kiểm tra & Nghiệm thu
- **Build**: Bundle runtime `day10.js` biên dịch thành công.
- **Visual QA**: Toàn bộ 20 ảnh tĩnh tại thời điểm settled (`s01-settled.png` đến `s20-settled.png`) được chụp tự động bằng CDP và mở kiểm tra trực quan chi tiết bằng tool `view_file`.
- **Render MP4**: Render tự động với 2 Chrome workers kết hợp tính năng keep-frames lưu trữ cache frame, gắn ghép trực tiếp với narration master `voice.wav`.
- **Phụ đề**: `2_Transcript_D10_06.txt` (201 đoạn phụ đề có timestamp chi tiết).
- **Chương mục**: `3_Chapters_D10_06.txt` (20 mốc chương chuẩn hóa theo định dạng `MM:SS: Tiêu đề`).
- **Gói nộp hoàn chỉnh**: Bộ 4 file chuẩn tại thư mục `day10/05-final-package/d10-06-bo-4-file-nop/`.
