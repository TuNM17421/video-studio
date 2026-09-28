-- Lớp metrics cho dashboard: run → video/phase/phiên bản → feedback. Chỉ VIEW/FUNCTION, không đụng dữ liệu;
-- chạy lại bao nhiêu lần cũng được:
--   docker compose exec -T postgres psql -U telemetry -d telemetry < postgres/metrics.sql
--
-- Quy ước đo (đọc trước khi so số):
--   * KHÔNG ĐO ≠ 0. Giá trị không đo được, hoặc bước không phát sinh tiền (Kaggle, model local, audio có sẵn —
--     nguồn `no_charge`), là NULL, không phải 0: trung bình chỉ tính trên giá trị đo được, không bị kéo xuống.
--     Trạng thái chi phí từng run: paid · free (no_charge) · unmeasured (tính phí được mà thiếu số) · none.
--   * "Video đo đủ" = có run tính phí được và không run nào `unmeasured`. KPI chi phí TB chỉ tính các video này.
--   * "Video hoàn tất" = có run render kết thúc `done`.
--   * Thời gian máy = HỢP các khoảng [started_at, finished_at], không phải tổng cột duration_ms. `scenes` (agent)
--     mở job rồi gọi `scenes.gate` và `scenes.qa` ngay bên trong trước khi tự đóng — cộng thẳng ba dòng đó đếm
--     cùng một khoảng thời gian 2–3 lần (đối chiếu 26/09/2026 với bảng chi phí đo tay: cùng lỗi, bảng đó tránh
--     bằng cách hợp khoảng thủ công). `telemetry_active_islands` hợp khoảng một lần, video và phase dùng chung.
--     Lead time = run đầu → run cuối đã kết thúc, gồm lúc chờ duyệt (không hợp khoảng, vì đây vốn đã là một mốc).
--   * USD/phút dùng `video_duration_s` — độ dài MP4 do ffprobe đo và đối chiếu với giọng đọc lúc render (không
--     phải ước tính) — nên so được chi phí giữa các video dài ngắn khác nhau, không chỉ so theo cả video.
--   * Token: Codex báo `input_tokens` ĐÃ gồm cached; Claude thì không. `fresh_input_tokens` quy về cùng nghĩa.
--   * Gen lại: `attempt` = lượt thứ mấy của stage; `version` = phiên bản đang dựng (v1 tới lần render thành
--     công đầu tiên, rồi v2…); `trigger` = initial · feedback · qa_fix · retry. Làm lại = trigger khác initial.

-- View đổi cột thì Postgres không REPLACE được; bỏ view (không phải dữ liệu) rồi tạo lại.
DROP VIEW IF EXISTS telemetry_feedback_trace, telemetry_feedback, telemetry_version_metrics,
  telemetry_video_phase_metrics, telemetry_video_metrics, telemetry_active_islands, telemetry_runs;

CREATE OR REPLACE FUNCTION telemetry_phase(stage TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN stage IS NULL THEN 'other'
    WHEN stage IN ('align-setup', 'omnivoice-setup', 'kaggle-setup') THEN 'setup'
    WHEN stage LIKE 'script%' THEN 'script'
    WHEN stage IN ('cues', 'dry-run') OR stage LIKE 'cues.%' THEN 'cues'
    WHEN stage IN ('voice', 'voice-script', 'omnivoice-generate', 'kaggle-generate', 'import-scan') OR stage LIKE 'voice.%' THEN 'voice'
    WHEN stage IN ('scenes', 'review', 'images', 'build', 'verify') OR stage LIKE 'scenes.%' THEN 'scenes'
    WHEN stage IN ('render', 'shoot') OR stage LIKE 'render.%' THEN 'render'
    WHEN stage = 'deliver' OR stage LIKE 'deliver.%' THEN 'deliver'
    ELSE 'other'
  END
$$;

CREATE OR REPLACE FUNCTION telemetry_phase_order(phase TEXT) RETURNS INT
LANGUAGE sql IMMUTABLE AS $$
  SELECT array_position(ARRAY['script', 'cues', 'voice', 'scenes', 'render', 'deliver', 'setup', 'other'], phase)
$$;

-- Một dòng = một run: gộp run_started + usage_recorded + run_finished theo run_id.
CREATE VIEW telemetry_runs AS
WITH per_run AS (
  SELECT
    run_id,
    max(video_ref) AS video_ref,
    coalesce(max(stage) FILTER (WHERE event_type = 'run_started'), max(stage)) AS stage,
    coalesce(max(actor_kind) FILTER (WHERE event_type = 'run_started'), max(actor_kind)) AS actor_kind,
    max(model) AS model,
    max(provider) AS provider,
    coalesce(min(occurred_at) FILTER (WHERE event_type = 'run_started'), min(occurred_at)) AS started_at,
    max(occurred_at) FILTER (WHERE event_type = 'run_finished') AS finished_at,
    max((measurement ->> 'duration_ms')::numeric) FILTER (WHERE event_type = 'run_finished') AS duration_ms,
    max(outcome ->> 'status') FILTER (WHERE event_type = 'run_finished') AS status,
    sum((measurement ->> 'input_tokens')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS input_tokens_raw,
    sum((measurement ->> 'cached_input_tokens')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS cached_input_tokens,
    sum((measurement ->> 'output_tokens')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS output_tokens,
    sum((measurement ->> 'characters')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS characters,
    sum((measurement ->> 'credits')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS credits,
    sum((measurement ->> 'gpu_seconds')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS gpu_seconds,
    max((measurement ->> 'video_duration_s')::numeric) FILTER (WHERE event_type = 'usage_recorded') AS video_duration_s,
    sum((measurement -> 'cost' ->> 'amount')::numeric) FILTER (WHERE event_type = 'usage_recorded'
      AND measurement -> 'cost' ->> 'source' IN ('provider_reported', 'gateway_reported', 'server_price_estimate')) AS paid_cost,
    bool_or(measurement -> 'cost' ->> 'source' = 'no_charge') FILTER (WHERE event_type = 'usage_recorded') AS free,
    string_agg(DISTINCT measurement -> 'cost' ->> 'source', ',')
      FILTER (WHERE event_type = 'usage_recorded' AND measurement -> 'cost' ->> 'source' <> 'unavailable') AS cost_source,
    max((payload -> 'run_context' ->> 'attempt')::int) FILTER (WHERE event_type = 'run_started') AS attempt,
    max((payload -> 'run_context' ->> 'version')::int) FILTER (WHERE event_type = 'run_started') AS version,
    max(payload -> 'run_context' ->> 'trigger') FILTER (WHERE event_type = 'run_started') AS trigger,
    (array_agg(payload -> 'run_context' -> 'feedback_ids') FILTER (WHERE event_type = 'run_started'))[1] AS feedback_ids,
    max(payload -> 'run_context' ->> 'session_id') FILTER (WHERE event_type = 'usage_recorded') AS session_id,
    max(payload -> 'run_context' ->> 'prompt_sha256') FILTER (WHERE event_type = 'usage_recorded') AS prompt_sha256,
    max(payload -> 'run_context' ->> 'gateway_status') FILTER (WHERE event_type = 'usage_recorded') AS gateway_status
  FROM telemetry_events
  WHERE event_type IN ('run_started', 'usage_recorded', 'run_finished')
  GROUP BY run_id
), shaped AS (
  SELECT
    per_run.*,
    (input_tokens_raw IS NOT NULL OR output_tokens IS NOT NULL) AS has_usage,
    (input_tokens_raw IS NOT NULL OR output_tokens IS NOT NULL OR characters IS NOT NULL OR credits IS NOT NULL
      OR gpu_seconds IS NOT NULL OR cost_source IS NOT NULL) AS has_billable
  FROM per_run
)
SELECT
  run_id,
  video_ref,
  stage,
  telemetry_phase(stage) AS phase,
  telemetry_phase_order(telemetry_phase(stage)) AS phase_order,
  actor_kind,
  coalesce(provider, actor_kind) AS provider,
  model,
  started_at,
  finished_at,
  duration_ms,
  status,
  coalesce(attempt, 1) AS attempt,
  coalesce(version, 1) AS version,
  coalesce(trigger, 'initial') AS trigger,
  coalesce(feedback_ids, '[]'::jsonb) AS feedback_ids,
  session_id,
  prompt_sha256,
  gateway_status,
  EXISTS (SELECT 1 FROM telemetry_ai_logs l WHERE l.run_id = shaped.run_id) AS has_ai_log,
  has_usage,
  has_billable,
  CASE WHEN paid_cost IS NOT NULL THEN 'paid' WHEN free THEN 'free' WHEN has_billable THEN 'unmeasured' ELSE 'none' END AS cost_state,
  (paid_cost IS NOT NULL OR coalesce(free, false)) AS has_cost,
  CASE WHEN NOT has_usage THEN NULL
       WHEN actor_kind = 'codex' THEN greatest(coalesce(input_tokens_raw, 0) - coalesce(cached_input_tokens, 0), 0)
       ELSE input_tokens_raw END AS fresh_input_tokens,
  CASE WHEN has_usage THEN cached_input_tokens END AS cached_input_tokens,
  CASE WHEN has_usage THEN output_tokens END AS output_tokens,
  CASE WHEN NOT has_usage THEN NULL
       WHEN actor_kind = 'codex' THEN greatest(coalesce(input_tokens_raw, 0), coalesce(cached_input_tokens, 0)) + coalesce(output_tokens, 0)
       ELSE coalesce(input_tokens_raw, 0) + coalesce(cached_input_tokens, 0) + coalesce(output_tokens, 0) END AS total_tokens,
  characters,
  credits,
  gpu_seconds,
  video_duration_s,
  paid_cost AS cost_usd,
  cost_source
FROM shaped;

-- Hợp các khoảng [started_at, finished_at] chồng/lồng nhau thành các khoảng rời nhau ("islands"), rồi tổng độ
-- dài từng island mới ra đúng thời gian máy thật sự bận. `scope`: 'video' hợp mọi run của video; 'phase' hợp
-- theo từng (video, phase) — cần riêng vì scenes/scenes.gate/scenes.qa cùng vào phase 'scenes' và lồng nhau;
-- 'agent' hợp chỉ các run có usage (agent) — scenes (agent) lồng scenes.qa (agent) nên cũng cần hợp riêng.
CREATE VIEW telemetry_active_islands AS
WITH base AS (
  SELECT video_ref, phase, has_usage, started_at, finished_at
  FROM telemetry_runs
  WHERE finished_at IS NOT NULL AND phase <> 'setup'
), video_bounds AS (
  SELECT video_ref, started_at, finished_at,
    max(finished_at) OVER (PARTITION BY video_ref ORDER BY started_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
  FROM base
), video_islands AS (
  SELECT video_ref, started_at, finished_at,
    sum(CASE WHEN prev_end IS NULL OR started_at > prev_end THEN 1 ELSE 0 END)
      OVER (PARTITION BY video_ref ORDER BY started_at) AS island
  FROM video_bounds
), phase_bounds AS (
  SELECT video_ref, phase, started_at, finished_at,
    max(finished_at) OVER (PARTITION BY video_ref, phase ORDER BY started_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
  FROM base
), phase_islands AS (
  SELECT video_ref, phase, started_at, finished_at,
    sum(CASE WHEN prev_end IS NULL OR started_at > prev_end THEN 1 ELSE 0 END)
      OVER (PARTITION BY video_ref, phase ORDER BY started_at) AS island
  FROM phase_bounds
), agent_bounds AS (
  SELECT video_ref, started_at, finished_at,
    max(finished_at) OVER (PARTITION BY video_ref ORDER BY started_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS prev_end
  FROM base WHERE has_usage
), agent_islands AS (
  SELECT video_ref, started_at, finished_at,
    sum(CASE WHEN prev_end IS NULL OR started_at > prev_end THEN 1 ELSE 0 END)
      OVER (PARTITION BY video_ref ORDER BY started_at) AS island
  FROM agent_bounds
)
SELECT 'video' AS scope, video_ref, NULL::text AS phase,
  extract(epoch FROM max(finished_at) - min(started_at)) AS window_s
FROM video_islands GROUP BY video_ref, island
UNION ALL
SELECT 'phase' AS scope, video_ref, phase,
  extract(epoch FROM max(finished_at) - min(started_at)) AS window_s
FROM phase_islands GROUP BY video_ref, phase, island
UNION ALL
SELECT 'agent' AS scope, video_ref, NULL::text AS phase,
  extract(epoch FROM max(finished_at) - min(started_at)) AS window_s
FROM agent_islands GROUP BY video_ref, island;

-- Một dòng = một video.
CREATE VIEW telemetry_video_metrics AS
SELECT
  r.video_ref,
  min(r.started_at) AS first_run_at,
  max(coalesce(r.finished_at, r.started_at)) AS last_run_at,
  extract(epoch FROM max(r.finished_at) - min(r.started_at) FILTER (WHERE r.finished_at IS NOT NULL)) AS lead_time_s,
  coalesce((SELECT sum(window_s) FROM telemetry_active_islands i WHERE i.scope = 'video' AND i.video_ref = r.video_ref), 0) AS active_s,
  (SELECT sum(window_s) FROM telemetry_active_islands i WHERE i.scope = 'agent' AND i.video_ref = r.video_ref) AS agent_s,
  max(r.video_duration_s) FILTER (WHERE r.phase = 'render') AS video_duration_s,
  -- Cần cả chi phí đo đủ lẫn độ dài đã biết; thiếu một trong hai thì để trống, không đoán.
  CASE WHEN (count(*) FILTER (WHERE r.has_billable) > 0 AND count(*) FILTER (WHERE r.cost_state = 'unmeasured') = 0)
        AND max(r.video_duration_s) FILTER (WHERE r.phase = 'render') > 0
       THEN sum(r.cost_usd) / (max(r.video_duration_s) FILTER (WHERE r.phase = 'render') / 60.0) END AS usd_per_minute,
  count(*) AS runs,
  count(*) FILTER (WHERE r.status IS NOT NULL AND r.status <> 'done') AS failed_runs,
  count(*) FILTER (WHERE r.trigger <> 'initial') AS rework_runs,
  max(r.version) AS versions,
  sum(r.fresh_input_tokens) AS fresh_input_tokens,
  sum(r.cached_input_tokens) AS cached_input_tokens,
  sum(r.output_tokens) AS output_tokens,
  sum(r.total_tokens) AS total_tokens,
  sum(r.cost_usd) AS cost_usd,
  sum(r.cost_usd) FILTER (WHERE r.trigger <> 'initial') AS rework_cost_usd,
  sum(r.cost_usd) FILTER (WHERE r.phase = 'voice') AS voice_cost_usd,
  sum(r.characters) AS characters,
  sum(r.credits) AS credits,
  sum(r.gpu_seconds) AS gpu_seconds,
  count(*) FILTER (WHERE r.has_billable) AS billable_runs,
  count(*) FILTER (WHERE r.cost_state = 'unmeasured') AS unmeasured_runs,
  (count(*) FILTER (WHERE r.has_billable) > 0 AND count(*) FILTER (WHERE r.cost_state = 'unmeasured') = 0) AS cost_complete,
  coalesce(bool_or(r.phase = 'render' AND r.status = 'done'), false) AS completed
FROM telemetry_runs r
WHERE r.phase <> 'setup'
GROUP BY r.video_ref;

-- Một dòng = một (video, phase). NULL = phase đó không đo được / không phát sinh; trung bình bỏ qua NULL.
CREATE VIEW telemetry_video_phase_metrics AS
SELECT
  r.video_ref,
  r.phase,
  min(r.phase_order) AS phase_order,
  count(*) AS runs,
  count(*) FILTER (WHERE r.status IS NOT NULL AND r.status <> 'done') AS failed_runs,
  count(*) FILTER (WHERE r.trigger <> 'initial') AS rework_runs,
  coalesce((SELECT sum(window_s) FROM telemetry_active_islands i
            WHERE i.scope = 'phase' AND i.video_ref = r.video_ref AND i.phase = r.phase), 0) AS active_s,
  sum(r.fresh_input_tokens) AS fresh_input_tokens,
  sum(r.cached_input_tokens) AS cached_input_tokens,
  sum(r.output_tokens) AS output_tokens,
  sum(r.total_tokens) AS total_tokens,
  -- Chi phí phase chỉ có khi mọi run tính phí được của phase đều đã đo; thiếu một run → NULL, không cận dưới.
  CASE WHEN count(*) FILTER (WHERE r.cost_state = 'unmeasured') = 0 THEN sum(r.cost_usd) END AS cost_usd,
  count(*) FILTER (WHERE r.has_billable) AS billable_runs,
  count(*) FILTER (WHERE r.cost_state = 'unmeasured') AS unmeasured_runs
FROM telemetry_runs r
GROUP BY r.video_ref, r.phase;

-- Một dòng = một phiên bản của một video: bao nhiêu lượt, làm lại vì feedback bao nhiêu, tốn bao nhiêu.
CREATE VIEW telemetry_version_metrics AS
SELECT
  video_ref,
  version,
  min(started_at) AS started_at,
  max(finished_at) AS finished_at,
  count(*) AS runs,
  count(*) FILTER (WHERE trigger <> 'initial') AS rework_runs,
  count(*) FILTER (WHERE trigger IN ('feedback', 'qa_fix')) AS feedback_rounds,
  bool_or(phase = 'render' AND status = 'done') AS delivered,
  -- Phiên bản gộp trực tiếp từ duration_ms — cùng lồng nhau như active_s ở video/phase, nhưng chia theo phiên
  -- bản (giới hạn bởi run render) hiếm khi lồng chéo hai phiên; giữ tổng đơn giản, chấp nhận sai số nhỏ.
  sum(duration_ms) / 1000 AS active_s,
  sum(total_tokens) AS total_tokens,
  CASE WHEN count(*) FILTER (WHERE cost_state = 'unmeasured') = 0 THEN sum(cost_usd) END AS cost_usd,
  count(*) FILTER (WHERE cost_state = 'unmeasured') AS unmeasured_runs
FROM telemetry_runs
WHERE phase <> 'setup'
GROUP BY video_ref, version;

-- Trạng thái mới nhất của từng feedback (chỉ metadata; lời mô tả nằm ở ledger local của Studio).
CREATE VIEW telemetry_feedback AS
SELECT DISTINCT ON (video_ref, feedback ->> 'feedback_id')
  video_ref,
  feedback ->> 'feedback_id' AS feedback_id,
  feedback ->> 'stage' AS stage,
  telemetry_phase(feedback ->> 'stage') AS phase,
  feedback ->> 'scope' AS scope,
  feedback ->> 'code' AS code,
  feedback ->> 'severity' AS severity,
  feedback ->> 'source' AS source,
  feedback ->> 'qa_provider' AS qa_provider,
  feedback ->> 'status' AS status,
  (feedback ->> 'recurrence')::int AS recurrence,
  NULLIF(feedback ->> 'found_by_run', '')::uuid AS found_by_run,
  feedback ->> 'resolved_by_run' AS resolved_by_run,
  (feedback ->> 'created_at')::timestamptz AS created_at,
  occurred_at AS updated_at
FROM (SELECT video_ref, occurred_at, payload -> 'feedback' AS feedback FROM telemetry_events WHERE event_type = 'feedback_state') f
ORDER BY video_ref, feedback ->> 'feedback_id', occurred_at DESC;

-- Truy vết: feedback → lượt agent đã tạo ra phần bị chê (lượt agent cuối cùng của đúng phase trước khi có
-- feedback, không tính lượt QA/gate) → các lượt đã nhận sửa nó.
CREATE VIEW telemetry_feedback_trace AS
SELECT
  f.*,
  culprit.run_id AS culprit_run,
  culprit.stage AS culprit_stage,
  culprit.attempt AS culprit_attempt,
  culprit.version AS culprit_version,
  culprit.provider AS culprit_provider,
  culprit.model AS culprit_model,
  culprit.session_id AS culprit_session,
  culprit.prompt_sha256 AS culprit_prompt,
  culprit.has_ai_log AS culprit_ai_log,
  fixes.fix_runs,
  fixes.fix_attempts,
  fixes.fix_cost_usd
FROM telemetry_feedback f
LEFT JOIN LATERAL (
  SELECT r.* FROM telemetry_runs r
  WHERE r.video_ref = f.video_ref AND r.phase = f.phase AND r.has_usage
    AND r.stage NOT LIKE '%.qa' AND r.stage NOT LIKE '%.gate'
    -- Strictly before, and never a run that answers this very item: Studio records the feedback and starts
    -- the fixing run in the same millisecond.
    AND r.started_at < f.created_at AND NOT (r.feedback_ids ? f.feedback_id)
  ORDER BY r.started_at DESC LIMIT 1
) culprit ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS fix_runs, string_agg(r.stage || ' #' || r.attempt, ', ' ORDER BY r.started_at) AS fix_attempts,
         sum(r.cost_usd) AS fix_cost_usd
  FROM telemetry_runs r
  WHERE r.video_ref = f.video_ref AND (r.feedback_ids ? f.feedback_id OR r.run_id::text = f.resolved_by_run)
) fixes ON true;
