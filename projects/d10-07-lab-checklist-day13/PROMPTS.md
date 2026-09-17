# Nhật ký sản xuất · D10-07 · Lab 10, Checklist & Cầu nối Day 13 (20 cảnh · ~7 phút 45 giây)

## Nguồn và phạm vi bài học
- **Kịch bản**: `kich-ban-chi-tiet.md` gồm 20 câu chuẩn hóa sư phạm chuyên sâu, hướng dẫn chi tiết bảng kiểm vận hành 7 chốt an toàn trước khi ship pipeline vào phục vụ Agent thực tế, nhiệm vụ thực hành Lab 10 (xây pipeline RAG, thử nghiệm tiêm lỗi corrupt có chủ đích, chuẩn hóa Great Expectations GX 1.x), nguyên tắc liêm chính trong đo lường số liệu, cấu trúc bản ghi sự cố Incident Record 5 phần, 4 đúc kết cốt tử của toàn bộ giáo trình Day 10, và mở cầu nối kiến thức sang Day 13 (Agent Observability qua Trace & Span).
- **Thuyết minh đồng bộ trực quan**: Mọi thẻ so sánh, bảng kiểm 7 chốt, chuỗi 6 mắt xích pipeline, 3 kịch bản tiêm lỗi, khối code chuẩn Great Expectations GX 1.x vs cú pháp cũ, sơ đồ Trace & Span, và chuỗi 5 bước truy vết ngược dòng từ Answer về Source Row đều được giảng giải chi tiết, rõ ràng từng thuật ngữ trong lời bình (voiceover) cho người mới bắt đầu.
- **Phạm vi slide**: Slide 127–138 của giáo trình Day 10 (Bộ bài giảng 138 trang của VinUni).
- **4 Chặng kiến thức cốt lõi**:
  1. **Checklist Vận Hành Trước Khi Ship Pipeline (Cảnh 01–05)**:
     - Nghịch lý Pipeline Xanh: Job chạy thành công (Exit code 0) chưa chắc dữ liệu đã đúng khi nạp vào AI Agent. Silent Failure nguy hiểm hơn Loud Failure.
     - 7 Chốt kiểm định an toàn sống còn:
       1. Freshness SLI đo trực tiếp trên artifact Agent đọc + SLO có Error Budget linh hoạt.
       2. Quality Gate đặt TRƯỚC khi ghi vào Gold/Serving layer, luôn hành xử theo cơ chế fail-closed (nghi ngờ là cách ly).
       3. Idempotent re-run: Chạy lại nhiều lần không sinh bản ghi trùng, không nhân đôi side-effects.
       4. Schema Drift tự động phát hiện cột mới hoặc đổi kiểu ngầm.
       5. Data Lineage lưu vết phả hệ end-to-end từ nguồn đến đích để khoanh vùng blast radius.
       6. Incident Runbook 6 bước đã viết và diễn tập sẵn sàng lúc 2h sáng.
       7. Tested Erasure Path: Kiểm thử thực tế quy trình xóa dữ liệu cá nhân (PDPL 91 / GDPR), xóa cả index và embedding phái sinh.
     - Bài toán Ghost Vectors trong HNSW: Soft-delete chỉ ẩn logic trên đồ thị, mảng float thô vẫn nằm trên đĩa và có thể bị khôi phục lại (cần Re-indexing và Hard Delete định kỳ).
  2. **Thực Hành Lab 10: Xây Dựng & Thử Lửa Pipeline RAG (Cảnh 06–10)**:
     - Chuỗi 6 mắt xích nạp corpus cho Agent Ngày 8 và Ngày 9: Ingest ➔ Clean ➔ Validate ➔ Semantic Chunking ➔ Embed ➔ Load Vector Store.
     - Thử thách tiêm lỗi (Fault Injection): Xóa trường bắt buộc, làm dữ liệu bị cũ quá hạn, đổi schema âm thầm để kiểm tra cổng Quality Gate.
     - Chuẩn hóa công nghệ Great Expectations GX 1.x: Cú pháp chuẩn `gx.get_context() -> add_pandas() -> validate()`, cảnh báo lỗi crash `AttributeError` khi dùng code cũ `pandas_default` tiền-1.0 trên Python 3.10–3.13.
     - Bảo đảm tính lũy thừa Idempotency: So sánh Insert thô (nhân đôi vector, loãng cosine, phình đĩa) so với Upsert theo Natural Key & Content Hash.
     - Hồ sơ nghiệm thu 4 bằng chứng kỹ thuật: Pipeline script idempotent, Data Quality & Freshness report, Bảng so sánh Before vs After, Bản ghi sự cố Incident Record.
  3. **Tổng Kết Bài Học & Liêm Chính Dữ Liệu (Cảnh 11–14)**:
     - Nguyên tắc liêm chính trong đo lường: Giữ nguyên bộ tiêu chí đánh giá ban đầu (Fixed Baseline), dũng cảm ghi nhận giới hạn thực tế, tuyệt đối không tự ý đổi metric sau khi xem kết quả.
     - Cấu trúc bản ghi sự cố 5 thành phần: User Impact, Detection Signal, Root Cause (3 lớp), Immediate Mitigation, Preventive Action.
     - Bốn đúc kết sống còn của Day 10:
       1. Silent Failure vs Loud Failure trong AI Agent.
       2. Quality Gate phải đứng trước serving layer và luôn fail-closed.
       3. Kỷ luật vận hành Observability (SLO, Lineage, Runbook, Idempotency).
       4. Xóa dòng SQL không xóa vector trên đĩa (Ghost Vectors).
  4. **Cầu Nối Sang Day 13: Agent Observability (Cảnh 15–20)**:
     - Hợp nhất hai nửa: Data Observability (Ngày 10 - dữ liệu trước khi vào Agent) và Agent Observability (Ngày 13 - Agent xử lý dữ liệu trong từng lượt chạy).
     - Khái niệm Trace và Span: 1 Trace là 1 lượt chạy end-to-end; các Span là từng bước cụ thể (Retrieval, Tool Call, Model Generation).
     - Hai góc nhìn trong mỗi Span: Ngữ nghĩa nội dung (Prompt, Chunks, Tool result) và Telemetry vận hành (Tokens, Latency ms, Cost tiền mặt).
     - Đo lường đầu ra thời gian thực: Độ trung thực Faithfulness (so khớp context chống ảo giác) và Sức khỏe Vector Store runtime (Version consistency, Staleness).
     - Chuỗi 5 bước truy vết ngược dòng khép kín: Câu trả lời sai ➔ Chunk trong span ➔ Phiên bản index ➔ Lần chạy pipeline ➔ Dòng dữ liệu gốc ban đầu.
     - Lời chúc mừng hoàn thành toàn bộ khóa học Day 10 và hiệu triệu bắt tay vào bài thực hành Lab 10.
- **Style**: `lesson`; tuân thủ tuyệt đối design system chuẩn của bài học (`vinuni-lesson-video-ds`), không can thiệp code dùng chung.

## Voice & Âm thanh
- **Công nghệ**: OmniVoice cục bộ (`k2-fsa/OmniVoice`), giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không phụ thuộc API bên ngoài.
- **Tốc độ**: `atempo=0.88` (nhịp điệu sư phạm điềm đạm, gãy gọn, nhấn nhá trọng âm ở các từ khóa kỹ thuật và bài học kinh nghiệm).
- **Khoảng thở giữa cue**: 1,4 giây (khoảng lặng tự nhiên giúp tiếp thu trọn vẹn bài học).
- **Chuẩn hóa phát âm (`pronounce.json`)**: Hơn 60 thuật ngữ chuyên ngành được phiên âm chính xác sang ngữ âm tiếng Việt tự nhiên (SLI, SLO, SLA, Freshness, Error Budget, Fail-closed, Fail-open, Idempotent, Idempotency, Quality Gate, Schema Drift, Lineage, Runbook, Post-mortem, Ghost Vectors, HNSW, Soft-delete, Hard-delete, RAG, Multi-Agent, Vector Store, Ingestion, Semantic Chunking, Great Expectations, GX 1.x, AttributeError, Incident Record, Trace, Span, Retrieval, Tool Call, Latency, Token, Faithfulness, Upsert, Natural Key, Content Hash, Source Row...).
- **Quy mô âm thanh**: 20/20 câu đồng bộ, thời lượng master audio đạt 465,800s (~7 phút 45 giây), 13.974 frame hình ở 30 fps.

## Visual & Animation
- **20 Cảnh bài giảng chuyên sâu** được tổ chức và kết xuất trực tiếp trong `LabScene.jsx`.
- **Thanh định hướng Ribbon 4 chặng**:
  - `1. CHECKLIST VẬN HÀNH` (Cảnh 01–05)
  - `2. THỰC HÀNH LAB 10` (Cảnh 06–10)
  - `3. TỔNG KẾT DAY 10` (Cảnh 11–14)
  - `4. CẦU NỐI DAY 13` (Cảnh 15–20)
- **Linh vật VinUni**: Nằm ở vị trí an toàn (`x = 1515, y = 490, w = 275`) trên nền trong suốt (floating transparent), cử động nhún thở nhẹ (`bob` / `pulse`), tạo cảm giác đồng hành thân thiện.
- **Bố cục & Thẩm mỹ**:
  - Tận dụng tối đa không gian màn hình 1920×1080 px nền trắng VinUni chuẩn.
  - Phân tầng thông tin rõ rệt bằng thẻ đổ bóng nhẹ, viền bo tinh tế, mã màu phân loại trực quan (Đỏ: Cảnh báo sự cố / P1 / Lỗi crash; Cam: Thử thách / Fault injection; Xanh dương: Checklist / Kiến trúc / Ingestion; Xanh lá: GX 1.x chuẩn / Idempotency an toàn / Thành công).
  - Sử dụng bộ bao văn bản thuần SVG `MultilineText` tự động tính toán dòng chữ, loại bỏ hoàn toàn hiện tượng tràn viền.
  - Loại bỏ hoàn toàn thanh màu trang trí thừa ở đáy và nhãn câu số cứng nhắc ("Câu 1", "Câu 2").
  - Đảm bảo an toàn không gian cho phụ đề ở đáy màn hình (`y >= 960`).

## Kiểm tra & Nghiệm thu
- **Build**: Bundle runtime `day10.js` biên dịch thành công (2.157,2 KiB).
- **Visual QA**: Toàn bộ 20 ảnh tĩnh tại thời điểm settled (`s01-settled.png` đến `s20-settled.png`) được chụp tự động bằng CDP và mở kiểm tra trực quan chi tiết bằng tool `view_file`.
- **Render MP4**: Render tự động với 2 Chrome workers kết hợp tính năng keep-frames lưu trữ cache frame, gắn ghép trực tiếp với narration master `voice.wav`.
- **Phụ đề**: `2_Transcript_D10_07.txt` (132 đoạn phụ đề có timestamp chi tiết).
- **Chương mục**: `3_Chapters_D10_07.txt` (20 mốc chương chuẩn hóa theo định dạng `MM:SS: Tiêu đề`).
- **Gói nộp hoàn chỉnh**: Bộ 4 file chuẩn tại thư mục `day10/05-final-package/d10-07-bo-4-file-nop/`.
