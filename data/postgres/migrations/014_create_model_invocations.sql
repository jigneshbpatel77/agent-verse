-- TODO: replace placeholder with production schema for model_invocations.
CREATE TABLE IF NOT EXISTS model_invocations (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_model_invocations_tenant_created_at ON model_invocations (tenant_id, created_at DESC);
