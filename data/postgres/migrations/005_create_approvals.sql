-- TODO: replace placeholder with production schema for approvals.
CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_tenant_created_at ON approvals (tenant_id, created_at DESC);
