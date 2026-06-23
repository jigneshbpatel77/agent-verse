-- TODO: replace placeholder with production schema for kafka_event_log.
CREATE TABLE IF NOT EXISTS kafka_event_log (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kafka_event_log_tenant_created_at ON kafka_event_log (tenant_id, created_at DESC);
