# Nhật ký sản xuất · D10-04 · Làm sao biết dữ liệu hỏng trước người dùng? (22 cảnh · 13:32)

## Nguồn và phạm vi bài học
- **Kịch bản**: `kich-ban-chi-tiet.md` gồm 22 câu chuẩn hóa sư phạm chuyên sâu, đào sâu bản chất giám sát dữ liệu (Data Observability), truy vết dòng chảy (Lineage), đo độ trôi (Drift/Anomaly Detection) và tuân thủ pháp lý (Compliance) phục vụ Agent và hệ thống AI.
- **Thuyết minh đồng bộ trực quan**: Mọi thẻ so sánh, 5 trụ cột Observability, 4 thước đo thời kỳ Agent, công thức thống kê (Z-Score, MAD, STL, PSI, KL Divergence), OpenLineage và khung pháp lý Việt Nam/Quốc tế đều được giảng giải chi tiết, mạch lạc trong lời bình (voiceover).
- **Phạm vi slide**: Slide 068–088 của giáo trình Day 10 (Bộ bài giảng 138 trang của VinUni).
- **5 Trọng tâm kiến thức cốt lõi**:
  1. **Vì sao cần Data Observability? & 5 Trụ cột tiêu chuẩn (Barr Moses)**: Biến sự cố âm thầm (Silent Failure - không crash, không exception nhưng dữ liệu sai) thành cảnh báo rõ ràng (Loud Alert). Khung 5 trụ cột: Freshness (Độ tươi), Quality (Chất lượng), Volume (Khối lượng), Schema (Cấu trúc), Lineage (Dòng chảy).
  2. **Bộ 4 Thước đo thời kỳ Agent & Freshness SLI**: Bổ sung cho kho tri thức RAG: Embedding coverage %, Index version consistency (tuyệt đối không trộn model), Retrieval staleness, Contradiction rate. Ba cạm bẫy Freshness ngây thơ: giả định nhịp đều, đúng giờ nhưng toàn rác (on-time but garbage), clock-skew timezone.
  3. **Phát hiện dị biệt: Rule-Based vs ML & Z-Score vs MAD vs STL**: Rule-based bắt lỗi đã biết và hard invariants; ML/Statistical tự học mùa vụ và xu hướng (Trend, Seasonal, Residual). Khắc phục Masking effect của Z-Score bằng MAD (Median Absolute Deviation) thống kê bền vững. Bẫy khởi đầu lạnh (Cold-start).
  4. **Đo độ trôi phân phối với PSI vs KL Divergence & Lineage Blast Radius**: PSI (Population Stability Index / Jeffreys divergence) đo trôi vector/thuộc tính đối xứng hai chiều. Schema drift (đặc biệt là Added column làm trôi thông tin nhạy cảm). Data Lineage (Table-level vs Column-level), chuẩn mở OpenLineage & Marquez UI. Phân tích bán kính ảnh hưởng (Blast Radius) để phân tầng cảnh báo P1/P2/P3 chống kiệt sức cảnh báo (Alert Fatigue).
  5. **Tuân thủ pháp lý tại Việt Nam & Quốc tế**: Ba tầng quy chuẩn Việt Nam: Luật An ninh mạng (Nghị định 147), Luật Dữ liệu số 60 (hiệu lực 01/07/2025), Luật Bảo vệ dữ liệu cá nhân PDPL 91 & Nghị định 356 (hiệu lực 01/01/2026 - cơ chế consent-centric, đánh giá tác động DPIA). Quốc tế: EU AI Act, GDPR, HIPAA, SOC 2. Chiến lược Retention & Quyền được lãng quên (Right-to-be-Forgotten) trên Vector Store.
- **Cầu nối sang Module 3**: Khi phát hiện dữ liệu hỏng, hệ thống tự động phản ứng và cô lập ra sao? Mở ra cánh cửa Module 3 về Vận hành (Airflow DAG, Circuit Breakers, Alerting thông minh & FinOps).
- **Style**: `lesson`; tuân thủ nghiêm ngặt design system chung ở chế độ đọc (`vinuni-lesson-video-ds`), không can thiệp code dùng chung.

## Voice & Âm thanh
- **Công nghệ**: OmniVoice cục bộ (`k2-fsa/OmniVoice`), giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không phụ thuộc API bên ngoài.
- **Tốc độ**: `atempo=0.88` (nhịp điệu sư phạm rõ ràng, truyền cảm, dễ dàng tiếp thu các khái niệm kỹ thuật và pháp lý phức tạp).
- **Khoảng thở giữa cue**: 1,4 giây (đảm bảo không gian suy ngẫm cho người học và đồng bộ mượt mà với hoạt cảnh).
- **Chuẩn hóa phát âm (`pronounce.json`)**: Hơn 70 thuật ngữ tiếng Anh chuyên ngành và pháp lý được phiên âm chính xác sang ngữ âm tiếng Việt tự nhiên (Data Observability, Freshness, Schema, Lineage, Barr Moses, Monte Carlo, Embedding Coverage, Index Version Consistency, Retrieval Staleness, Contradiction Rate, Z-Score, MAD, STL, PSI, KL Divergence, OpenLineage, Marquez, Blast Radius, Alert Fatigue, PDPL, Nghị định 356, EU AI Act, Right-to-be-Forgotten...).
- **Quy mô âm thanh**: 22/22 câu, 24.384 frame, 812,8 giây (13:32.8).

## Visual & Animation
- **22 Cảnh bài giảng chuyên sâu** được tổ chức và hiển thị trong `ObservabilityScene.jsx`.
- **Thanh định hướng Ribbon 4 chặng**: 
  - `1. 5 PILLARS OBSERVABILITY` (Cảnh 01–06)
  - `2. ANOMALY & DRIFT METRICS` (Cảnh 07–12)
  - `3. LINEAGE & BLAST RADIUS` (Cảnh 13–17)
  - `4. COMPLIANCE & LEGAL` (Cảnh 18–22)
- **Linh vật VinUni**: Nằm ở vị trí an toàn (`x = 1515, y = 490, w = 275`) trên nền trong suốt (floating transparent), cử động nhún thở nhẹ (`bob` / `pulse`), tạo cảm giác đồng hành thân thiện.
- **Bố cục & Thẩm mỹ**:
  - Tận dụng tối đa không gian màn hình 1920×1080 px nền trắng VinUni chuẩn.
  - Phân tầng thông tin rõ rệt bằng thẻ đổ bóng nhẹ, viền tinh tế, mã màu phân loại trực quan (Xanh dương: Observability/Architecture; Xanh lá: Safe/Pillars/Compliant; Đỏ: Silent Failure/Risk/Alert; Vàng/Cam: Drift/Warning).
  - Loại bỏ hoàn toàn thanh màu trang trí thừa ở đáy và nhãn câu số cứng nhắc ("Câu 1", "Câu 2").
  - Đảm bảo an toàn không gian cho phụ đề ở đáy màn hình (`y >= 960`).

## Kiểm tra & Nghiệm thu
- **Build**: Bundle runtime `day10.js` biên dịch thành công (1654.7 KiB).
- **Visual QA**: Toàn bộ 22 ảnh tĩnh tại thời điểm settled (`s01-settled.png` đến `s22-settled.png`) được chụp tự động bằng CDP và mở kiểm tra trực quan chi tiết bằng tool `view_file`.
- **Render MP4**: Render tự động với 6 Chrome worker song song, gắn ghép trực tiếp với narration master `voice.wav`, đồng bộ tuyệt đối 24.384 frame (812,8 giây).
- **Phụ đề**: `2_Transcript_D10_04.txt` (đoạn phụ đề có timestamp chi tiết).
- **Chương mục**: `3_Chapters_D10_04.txt` (10 mốc chương lớn chuẩn hóa theo định dạng `MM:SS: Tiêu đề`).
- **Gói nộp hoàn chỉnh**: Bộ 4 file chuẩn tại thư mục `day10/05-final-package/d10-04-bo-4-file-nop/`.
