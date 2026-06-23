-- TODO: replace placeholder with production schema for workflows.
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflows_tenant_created_at ON workflows (tenant_id, created_at DESC);
