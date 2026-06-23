-- TODO: replace placeholder with production schema for feature_registry.
CREATE TABLE IF NOT EXISTS feature_registry (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_registry_tenant_created_at ON feature_registry (tenant_id, created_at DESC);
