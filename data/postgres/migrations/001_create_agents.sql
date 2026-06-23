-- TODO: replace placeholder with production schema for agents.
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agents_tenant_created_at ON agents (tenant_id, created_at DESC);
