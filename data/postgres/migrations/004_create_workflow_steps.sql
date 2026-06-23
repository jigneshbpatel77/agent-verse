-- TODO: replace placeholder with production schema for workflow_steps.
CREATE TABLE IF NOT EXISTS workflow_steps (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_steps_tenant_created_at ON workflow_steps (tenant_id, created_at DESC);
