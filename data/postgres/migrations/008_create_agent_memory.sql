-- TODO: replace placeholder with production schema for agent_memory.
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_tenant_created_at ON agent_memory (tenant_id, created_at DESC);
