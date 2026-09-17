# Nhật ký sản xuất · D10-05 · Phát hiện rồi thì hệ thống phải phản ứng ra sao? (20 cảnh · ~11–12 phút)

## Nguồn và phạm vi bài học
- **Kịch bản**: `kich-ban-chi-tiet.md` gồm 20 câu chuẩn hóa sư phạm chuyên sâu, đào sâu bản chất điều phối (Orchestration), đồ thị DAG, cơ chế tự phục hồi, tính lũy thừa (Idempotency), cảnh báo hành động được (Actionable Alert) và quy trình Incident Runbook 6 bước.
- **Thuyết minh đồng bộ trực quan**: Mọi thẻ so sánh, chuỗi 5 mắt xích Signal-to-Action, 3 cấp độ Severity (P1/P2/P3), 6 bước Runbook, đồ thị DAG, 4 công cụ Orchestration (Airflow, Dagster, Prefect, Temporal) và 2 giải pháp Idempotency đều được giảng giải chi tiết, rõ ràng trong lời bình (voiceover).
- **Phạm vi slide**: Slide 089–104 của giáo trình Day 10 (Bộ bài giảng 138 trang của VinUni).
- **5 Trọng tâm kiến thức cốt lõi**:
  1. **Tín hiệu kỹ thuật vs Cảnh báo hành động (Actionable Alert)**: Chuỗi 5 mắt xích: `SIGNAL ➔ IMPACT ➔ PRIORITY ➔ OWNER ➔ ACTION`. Phân biệt cam kết nghiệp vụ thực tế SLO đo tại artifact Agent đọc so với lịch cron ngầm. Ngân sách dung sai lỗi (Error Budget).
  2. **Phân tầng Severity & Chống kiệt sức cảnh báo (Alert Fatigue)**:
     - P1 (Critical / Page on-call): Vi phạm SLO, Agent trả lời sai trực tiếp ➔ đánh thức kỹ sư ngay lập tức.
     - P2 (High / Jira Ticket): Quality Gate đã cách ly thành công, Agent an toàn trên bản cũ ➔ tạo ticket xử lý ca sáng.
     - P3 (Low / Dashboard): Drift nhẹ chưa chạm ngưỡng ➔ ghi log dashboard review định kỳ.
  3. **Incident Runbook & 6 Bước ứng cứu sự cố**:
     - Kịch bản tác chiến chuẩn hóa khi 2h sáng.
     - 3 Bước đầu (Identify & Mitigate): Xác định tín hiệu, Khoanh vùng phạm vi (Dataset & Agent consumers), Giảm thiểu thiệt hại tức thì.
     - 3 Bước sau (Resolve & Learn): Sửa root cause thượng nguồn, Xác minh lại bằng Quality Gate độc lập, Họp rút kinh nghiệm không đổ lỗi (Blameless Post-mortem).
     - 3 Chiến lược phòng vệ Agent: Duy trì bản cũ (Stale but Safe), Kèm Disclaimer cảnh báo, Tạm ngắt Tool (Circuit Breaker).
     - 3 Cấp độ xử lý lỗi trên Pipeline: Stop (Fail-closed), Quarantine (Dead-Letter Queue / DLQ), Log & Continue.
  4. **Orchestration & Đồ thị DAG (Directed Acyclic Graph)**:
     - Nhạc trưởng điều phối thứ tự, phụ thuộc và phản ứng lỗi.
     - Bản đồ DAG: có hướng (Directed), không chu trình (Acyclic), đồ thị tác vụ (Graph).
     - Hệ sinh thái công cụ 2026: Apache Airflow 3.x, Dagster (Asset-centric), Prefect, Temporal.
     - 3 Kiểu kích hoạt: Schedule-based (Cron), Event-driven (Kafka, Webhook), Data-aware (Upstream dataset ready).
     - Chuỗi 5 chặng cho AI Agent: Ingest ➔ Transform ➔ Quality Gate ➔ Vector Index ➔ Smoke Test & Atomic Cutover.
  5. **Tự phục hồi, Tính lũy thừa (Idempotency) & Backfill**:
     - Timeout, Retry kết hợp Exponential Backoff & Jitter phân tán tải, chống bão yêu cầu (Thundering Herd).
     - Tính lũy thừa Idempotency: Chạy 1 lần hay 10 lần đều ra cùng 1 trạng thái duy nhất. Hiểm họa Duplicate vector của lệnh INSERT thô sơ.
     - 2 Giải pháp kỹ thuật: Upsert theo Natural Key (Chunk ID / Hash) & Shadow Indexing với Atomic Cutover trong 1ms.
     - Chạy bù dữ liệu lịch sử (Backfill an toàn): Phân vùng thời gian (Partitioned) kết hợp Idempotency.
- **Cầu nối sang D10-06**: Tự động hóa điều phối, rerun và backfill tiêu tốn tài nguyên Compute và Token API rất lớn ➔ Dẫn nhập sang bài toán Tối ưu hóa chi phí FinOps & Phân tích sự cố thực tế.
- **Style**: `lesson`; tuân thủ nghiêm ngặt design system chung ở chế độ đọc (`vinuni-lesson-video-ds`), không can thiệp code dùng chung.

## Voice & Âm thanh
- **Công nghệ**: OmniVoice cục bộ (`k2-fsa/OmniVoice`), giọng Nhật Phong (`voice-local`); chạy hoàn toàn offline trên GPU, không phụ thuộc API bên ngoài.
- **Tốc độ**: `atempo=0.88` (nhịp điệu sư phạm rõ ràng, truyền cảm, dễ dàng tiếp thu các khái niệm kỹ thuật và quy trình vận hành).
- **Khoảng thở giữa cue**: 1,4 giây (đảm bảo không gian suy ngẫm cho người học và đồng bộ mượt mà với hoạt cảnh).
- **Chuẩn hóa phát âm (`pronounce.json`)**: Hơn 60 thuật ngữ tiếng Anh chuyên ngành được phiên âm chính xác sang ngữ âm tiếng Việt tự nhiên (SLO, SLI, SLA, Error Budget, Alert, Alert Fatigue, Incident Runbook, Post-mortem, Blameless, Mitigation, Circuit Breaker, Dead-Letter Queue, DLQ, Orchestrator, Orchestration, DAG, Airflow, Dagster, Prefect, Temporal, Trigger, Schedule, Event-driven, Data-aware, Smoke Test, Cutover, Timeout, Retry, Exponential Backoff, Jitter, Idempotency, Backfill, Upsert, Natural Key, Shadow Index, FinOps, Asset-centric, Fail-closed, Disclaimer...).
- **Quy mô âm thanh**: 20/20 câu đồng bộ.

## Visual & Animation
- **20 Cảnh bài giảng chuyên sâu** được tổ chức và hiển thị trong `AlertingScene.jsx`.
- **Thanh định hướng Ribbon 4 chặng**: 
  - `1. SLO & ALERT SEVERITY` (Cảnh 01–05)
  - `2. INCIDENT RUNBOOK` (Cảnh 06–10)
  - `3. ORCHESTRATION & DAG` (Cảnh 11–15)
  - `4. IDEMPOTENCY & BACKFILL` (Cảnh 16–20)
- **Linh vật VinUni**: Nằm ở vị trí an toàn (`x = 1515, y = 490, w = 275`) trên nền trong suốt (floating transparent), cử động nhún thở nhẹ (`bob` / `pulse`), tạo cảm giác đồng hành thân thiện.
- **Bố cục & Thẩm mỹ**:
  - Tận dụng tối đa không gian màn hình 1920×1080 px nền trắng VinUni chuẩn.
  - Phân tầng thông tin rõ rệt bằng thẻ đổ bóng nhẹ, viền tinh tế, mã màu phân loại trực quan (Đỏ: P1/Alert/Thundering Herd; Cam: P2/Warning/Backfill; Xanh dương: Signal/SLO/Orchestrator; Xanh lá: P3/Action/Idempotency/Safe).
  - Loại bỏ hoàn toàn thanh màu trang trí thừa ở đáy và nhãn câu số cứng nhắc ("Câu 1", "Câu 2").
  - Đảm bảo an toàn không gian cho phụ đề ở đáy màn hình (`y >= 960`).

## Kiểm tra & Nghiệm thu
- **Build**: Bundle runtime `day10.js` biên dịch thành công.
- **Visual QA**: Toàn bộ 20 ảnh tĩnh tại thời điểm settled (`s01-settled.png` đến `s20-settled.png`) được chụp tự động bằng CDP và mở kiểm tra trực quan chi tiết bằng tool `view_file`.
- **Render MP4**: Render tự động với 6 Chrome worker song song, gắn ghép trực tiếp với narration master `voice.wav`.
- **Phụ đề**: `2_Transcript_D10_05.txt` (đoạn phụ đề có timestamp chi tiết).
- **Chương mục**: `3_Chapters_D10_05.txt` (13 mốc chương lớn chuẩn hóa theo định dạng `MM:SS: Tiêu đề`).
- **Gói nộp hoàn chỉnh**: Bộ 4 file chuẩn tại thư mục `day10/05-final-package/d10-05-bo-4-file-nop/`.
