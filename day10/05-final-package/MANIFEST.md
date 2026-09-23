# Day 10 · Gói duyệt hiện tại

## Các video đã hoàn thiện (6/8 Video)

### 1. Video D10-00 · Giới thiệu Day 10
- `videos/d10-00-gioi-thieu.mp4` — 1920×1080, 30 fps, H.264 + AAC, 04:00.3 (7.208 frames).
- `transcripts/d10-00-gioi-thieu.txt` — 54 dòng transcript có timecode chuẩn xác.
- `chapters/d10-00-gioi-thieu-chuong.txt` — 7 mốc chương theo từng cụm bài học.
- Trọng tâm: Bản đồ 4 cụm lớn và 18 nội dung thực chiến, đặt vấn đề silent failure lúc 02:00.
- Gói nộp: `day10/05-final-package/d10-00-bo-4-file-nop/`

### 2. Video D10-01 · Pipeline từ nguồn đến Agent
- `videos/d10-01-pipeline-tu-nguon-den-agent.mp4` — 1920×1080, 30 fps, H.264 + AAC, 11:03.2 (19.895 frames).
- `transcripts/d10-01-pipeline-tu-nguon-den-agent.txt` — 146 dòng transcript có timecode chuẩn xác.
- `chapters/d10-01-pipeline-tu-nguon-den-agent-chuong.txt` — 16 mốc chương chi tiết, khớp 100% từng giây với nội dung bài giảng.
- Trọng tâm: Bản mở rộng 34 cảnh sư phạm chất lượng cao; giải thích sâu bản chất Data Pipeline và Data Cascade; 2 quyết định kiến trúc (ETL vs ELT, Batch vs Streaming); 3 bài toán sống còn tại Ingestion (Watermark, Cursor, Backpressure/Jitter, DLQ); 3 bước Transform chuẩn bị cho RAG (bỏ rác HTML, chuẩn hóa Unicode, che PII/CCCD, metadata); và 3 câu hỏi lớn tại Storage/Serving (Medallion Bronze-Silver-Gold, Vector Store Upsert, Atomic Cutover).
- Gói nộp: `day10/05-final-package/d10-01-bo-4-file-nop/`

### 3. Video D10-02 · Ingestion & Transform an toàn
- `videos/d10-02-ingestion-transform.mp4` — 1920×1080, 30 fps, H.264 + AAC, 07:40.0 (13.800 frames).
- `transcripts/d10-02-ingestion-transform.txt` — 140 dòng transcript có timecode chuẩn xác.
- `chapters/d10-02-ingestion-transform-chương.txt` — 7 mốc chương lớn chuẩn hóa.
- Trọng tâm: 26 cảnh trực quan; quản trị kiểu hỏng 4 nguồn dữ liệu (Database, API, File, Event Stream); đồng bộ tăng dần (Offset vs Cursor, CDC); cơ chế tự vệ (Rate Limit 429, Backoff, Jitter, Backpressure, DLQ); quản lý tệp (Content Hash, Logical Version); 5 dạng dữ liệu bẩn & 3 luồng xử lý; Transform cho Agent/RAG (Clean text, PII Redaction, Semantic Chunking, Rich Metadata).
- Gói nộp: `day10/05-final-package/d10-02-bo-4-file-nop/`

### 4. Video D10-03 · Quality Gates, Data Contracts & Debug Agent Symptom
- `videos/d10-03-quality-contracts.mp4` — 1920×1080, 30 fps, H.264 + AAC, 09:01.3 (16.240 frames).
- `transcripts/d10-03-quality-contracts.txt` — 157 dòng transcript có timecode chuẩn xác.
- `chapters/d10-03-quality-contracts-chương.txt` — 7 mốc chương lớn chuẩn hóa.
- Trọng tâm: 24 cảnh trực quan; nghịch lý Valid ≠ Accurate (ví dụ nhập nhầm số 0 cột lương); bộ tiêu chuẩn 6 khía cạnh chất lượng dữ liệu; Data Profiling tự động phát hiện Anomaly; 4 vị trí cắm Quality Gates (Ingestion, Staging, Pre-embedding, Runtime) với chiến lược Fail-Fast vs Quarantined DLQ; Hợp đồng dữ liệu (Data Contract) 3 phần & Triết lý Shift-Left; Debug triệu chứng Agent & cơ chế triệt tiêu Ghost Vectors (Atomic Versioning, Shadow Index).
- Gói nộp: `day10/05-final-package/d10-03-bo-4-file-nop/`

### 5. Video D10-04 · Làm sao biết dữ liệu hỏng trước người dùng? (Observability, Lineage & Compliance)
- `videos/d10-04-observability-lineage.mp4` — 1920×1080, 30 fps, H.264 + AAC, 13:32.8 (24.384 frames).
- `transcripts/d10-04-observability-lineage.txt` — 232 dòng transcript có timecode chuẩn xác.
- `chapters/d10-04-observability-lineage-chương.txt` — 10 mốc chương lớn chuẩn hóa.
- Trọng tâm: 22 cảnh trực quan; biến Silent Failure thành Loud Alert; Khung 5 Trụ cột Barr Moses (Monte Carlo); Bộ 4 thước đo thời kỳ Agent (Embedding coverage, Index consistency, Retrieval staleness, Contradiction rate); Freshness SLI & 3 bẫy ngây thơ; Rule-based vs ML & Z-Score vs MAD (Robust statistics); Phân rã STL & Cold-start; Đo độ trôi phân phối với PSI vs KL Divergence; Schema drift (Added column rủi ro PII); Data Lineage (Table vs Column-level) & Chuẩn mở OpenLineage/Marquez; Phân tích bán kính ảnh hưởng (Blast Radius) chống Alert Fatigue; Khung pháp lý Việt Nam (Luật 60, PDPL 91, Nghị định 356 & 147) & Quốc tế; Chiến lược Retention & Right-to-be-Forgotten trên Vector DB.
- Gói nộp: `day10/05-final-package/d10-04-bo-4-file-nop/`

### 6. Video D10-05 · Phát hiện rồi thì hệ thống phải phản ứng ra sao? (Orchestration, Alerting & Runbook)
- `videos/d10-05-alerting-orchestration.mp4` — 1920×1080, 30 fps, H.264 + AAC, 11:06.1 (19.983 frames).
- `transcripts/d10-05-alerting-orchestration.txt` — 194 dòng transcript có timecode chuẩn xác.
- `chapters/d10-05-alerting-orchestration-chương.txt` — 13 mốc chương lớn chuẩn hóa.
- Trọng tâm: 20 cảnh trực quan; Tín hiệu kỹ thuật vs Cảnh báo hành động (Actionable Alert); Chuỗi 5 mắt xích Signal-to-Action; Cam kết nghiệp vụ SLO & Ngân sách dung sai lỗi (Error Budget); Phân tầng cảnh báo P1/P2/P3 chống Alert Fatigue; Kịch bản Incident Runbook 6 bước ứng cứu lúc 2h sáng; 3 Chiến lược phòng vệ Agent (Stale but Safe, Disclaimer, Circuit Breaker); 3 Cấp độ xử lý lỗi (Stop Fail-closed, Quarantine DLQ, Log & Continue); Orchestration & Đồ thị có hướng không chu trình (DAG); Bản đồ công cụ 2026 (Airflow 3.x, Dagster Asset-centric, Prefect, Temporal); 3 Cơ chế Trigger (Schedule, Event-driven, Data-aware); Quy trình 5 chặng cho AI Agent (Smoke test & Atomic Cutover 1ms); Tự phục hồi thông minh (Timeout, Exponential Backoff & Jitter chống Thundering Herd); Tính lũy thừa Idempotency (Upsert Natural Key vs Shadow Indexing); Chiến lược Backfill dữ liệu có kiểm soát.
- Gói nộp: `day10/05-final-package/d10-05-bo-4-file-nop/`

---

### 7. Video D10-06 · Pipeline đáng tin cậy có giá bao nhiêu và nên tin xu hướng nào? (FinOps, Post-mortem & Frontier)
- `videos/d10-06-cost-incidents-frontier.mp4` — 1920×1080, 30 fps, H.264 + AAC, 11:04.6 (19.939 frames).
- `transcripts/d10-06-cost-incidents-frontier.txt` — 189 dòng transcript có timecode chuẩn xác.
- `chapters/d10-06-cost-incidents-frontier-chương.txt` — 20 mốc chương lớn chuẩn hóa.
- Trọng tâm: 20 cảnh trực quan; Nghịch lý pipeline xanh nhưng hóa đơn đỏ; 7 tầng chi phí FinOps (Storage, Compute, Egress, Source APIs, Embedding LLM, Vector DB, Rework on-call); 3 đòn bẩy tiết kiệm 50% chi phí; Phân tích 3 sự cố kinh điển (Full scan triệu đô, Cột enum làm sập hạ nguồn, Re-embedding lãng phí); Đánh giá nguồn tài liệu & thẩm định con số (nghiên cứu Gartner, McKinsey, dbt Labs); Xu hướng Frontier 2026 (Iceberg REST Catalog, Apache Polaris, Data Contracts CI/CD, Agent-native Observability).
- Gói nộp: `day10/05-final-package/d10-06-bo-4-file-nop/`

### 8. Video D10-07 · Lab 10: Sửa pipeline và chứng minh dữ liệu tốt hơn (Checklist & Cầu nối Day 13)
- `videos/d10-07-lab-checklist-day13.mp4` — 1920×1080, 30 fps, H.264 + AAC, 07:45.8 (13.974 frames).
- `transcripts/d10-07-lab-checklist-day13.txt` — 133 dòng transcript có timecode chuẩn xác.
- `chapters/d10-07-lab-checklist-day13-chương.txt` — 20 mốc chương lớn chuẩn hóa.
- Trọng tâm: 20 cảnh trực quan; Bảng kiểm 7 chốt an toàn trước khi ship pipeline; Nghiên cứu Ghost Vectors trên cấu trúc HNSW; Hướng dẫn thực hành Lab 10 (Ingest, Clean text, Quality Gate, Semantic chunking, Embedding, Vector Store); Thiết lập trạm kiểm định chất lượng; Báo cáo chứng minh cải thiện độ chính xác Agent RAG; Cầu nối chuyển tiếp kiến thức sang Day 13 (Fine-tuning & Evaluation).
- Gói nộp: `day10/05-final-package/d10-07-bo-4-file-nop/`

---

## Tổng kết toàn bộ Day 10 (8/8 Video Hoàn Thành 100%)
Toàn bộ 8 video của Day 10 đã được sản xuất, kiểm định QA và đóng gói hoàn chỉnh thành 8 thư mục tiêu chuẩn, mỗi thư mục gồm đầy đủ 4 tệp theo quy định.
