-- TODO: replace placeholder with production schema for deployment_history.
CREATE TABLE IF NOT EXISTS deployment_history (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployment_history_tenant_created_at ON deployment_history (tenant_id, created_at DESC);
