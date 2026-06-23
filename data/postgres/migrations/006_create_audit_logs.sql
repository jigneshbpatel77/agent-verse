-- TODO: replace placeholder with production schema for audit_logs.
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created_at ON audit_logs (tenant_id, created_at DESC);
