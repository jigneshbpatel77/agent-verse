-- TODO: replace placeholder with production schema for agent_tasks.
CREATE TABLE IF NOT EXISTS agent_tasks (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_tasks_tenant_created_at ON agent_tasks (tenant_id, created_at DESC);
