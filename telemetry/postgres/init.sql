CREATE TABLE IF NOT EXISTS telemetry_events (
  event_id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  installation_id UUID NOT NULL,
  project_ref TEXT NOT NULL,
  video_ref TEXT NOT NULL,
  run_id UUID NOT NULL,
  stage TEXT,
  actor_kind TEXT,
  provider TEXT,
  model TEXT,
  outcome JSONB,
  measurement JSONB NOT NULL,
  privacy JSONB NOT NULL,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS telemetry_events_video_time_idx ON telemetry_events (video_ref, occurred_at DESC);
CREATE INDEX IF NOT EXISTS telemetry_events_event_type_idx ON telemetry_events (event_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS telemetry_ai_logs (
  log_id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installation_id UUID NOT NULL,
  project_ref TEXT NOT NULL,
  video_ref TEXT NOT NULL,
  run_id UUID NOT NULL,
  kind TEXT NOT NULL,
  consent JSONB NOT NULL,
  content_sha256 TEXT NOT NULL,
  encrypted_content JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS telemetry_ai_logs_video_time_idx ON telemetry_ai_logs (video_ref, occurred_at DESC);

CREATE OR REPLACE VIEW telemetry_video_summary AS
SELECT
  video_ref,
  count(DISTINCT run_id) AS runs,
  count(*) FILTER (WHERE event_type = 'usage_recorded') AS usage_events,
  coalesce(sum((measurement ->> 'input_tokens')::numeric), 0) AS input_tokens,
  coalesce(sum((measurement ->> 'output_tokens')::numeric), 0) AS output_tokens,
  coalesce(sum((measurement -> 'cost' ->> 'amount')::numeric) FILTER (WHERE measurement -> 'cost' ->> 'source' <> 'unavailable'), 0) AS known_cost_usd,
  count(*) FILTER (WHERE measurement -> 'cost' ->> 'source' = 'unavailable') AS cost_unknown_events,
  max(occurred_at) AS last_event_at
FROM telemetry_events
GROUP BY video_ref;

CREATE OR REPLACE VIEW telemetry_ai_log_summary AS
SELECT video_ref, kind, count(*) AS logs, max(occurred_at) AS last_log_at
FROM telemetry_ai_logs
GROUP BY video_ref, kind;

CREATE OR REPLACE VIEW telemetry_stage_summary AS
SELECT
  video_ref,
  coalesce(stage, '(unknown)') AS stage,
  count(*) FILTER (WHERE event_type = 'run_started') AS runs_started,
  count(*) FILTER (WHERE event_type = 'run_finished') AS runs_finished,
  count(*) FILTER (WHERE event_type = 'run_finished' AND coalesce(outcome ->> 'status', '') <> 'done') AS failures,
  round(coalesce(sum((measurement ->> 'duration_ms')::numeric) FILTER (WHERE event_type = 'run_finished'), 0) / 1000, 1) AS duration_seconds,
  coalesce(sum((measurement ->> 'input_tokens')::numeric) FILTER (WHERE event_type = 'usage_recorded'), 0) AS input_tokens,
  coalesce(sum((measurement ->> 'output_tokens')::numeric) FILTER (WHERE event_type = 'usage_recorded'), 0) AS output_tokens
FROM telemetry_events
GROUP BY video_ref, coalesce(stage, '(unknown)');

CREATE OR REPLACE VIEW telemetry_cost_summary AS
SELECT
  video_ref,
  coalesce(measurement -> 'cost' ->> 'source', 'unavailable') AS cost_source,
  count(*) AS usage_events,
  coalesce(sum((measurement -> 'cost' ->> 'amount')::numeric), 0) AS cost_usd
FROM telemetry_events
WHERE event_type = 'usage_recorded'
GROUP BY video_ref, coalesce(measurement -> 'cost' ->> 'source', 'unavailable');
