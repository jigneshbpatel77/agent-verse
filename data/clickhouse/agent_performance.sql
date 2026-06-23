-- TODO: refine dimensions, partitioning, TTL, and materialized views for agent_performance.
CREATE TABLE IF NOT EXISTS agent_performance (
  tenant_id String,
  event_id String,
  occurred_at DateTime64(3),
  attributes JSON
) ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (tenant_id, occurred_at, event_id);
