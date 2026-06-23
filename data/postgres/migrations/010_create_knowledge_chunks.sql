-- TODO: replace placeholder with production schema for knowledge_chunks.
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_tenant_created_at ON knowledge_chunks (tenant_id, created_at DESC);
