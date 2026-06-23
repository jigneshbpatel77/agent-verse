-- ClickHouse Analytics Schemas for Vehicle Information Platform

CREATE DATABASE IF NOT EXISTS agent_analytics;

-- 1. Business Events (Vehicle checks, reports, registrations)
CREATE TABLE IF NOT EXISTS agent_analytics.business_events (
    event_id UUID,
    event_type String,
    vehicle_type String,
    state String,
    owner_category String,
    timestamp DateTime64(3),
    revenue Decimal(10, 2),
    agent_id String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, state, timestamp);

-- 2. System Metrics (API counts, delays, database status)
CREATE TABLE IF NOT EXISTS agent_analytics.system_metrics (
    metric_name String,
    service_name String,
    metric_value Float64,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (service_name, metric_name, timestamp);

-- 3. Funnel Events (Tracking user steps through reports checking)
CREATE TABLE IF NOT EXISTS agent_analytics.funnel_events (
    session_id String,
    step_name String,
    step_number UInt8,
    time_taken_ms UInt32,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (step_name, timestamp);

-- 4. Retention Events
CREATE TABLE IF NOT EXISTS agent_analytics.retention_events (
    user_id String,
    action_type String,
    cohort_date Date,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY cohort_date
ORDER BY (action_type, user_id, timestamp);

-- 5. Agent Performance Tracker (Time-to-resolve, tokens used, task types)
CREATE TABLE IF NOT EXISTS agent_analytics.agent_performance (
    agent_id String,
    task_id String,
    workflow_id String,
    duration_ms UInt32,
    tokens_consumed UInt32,
    model_name String,
    status String,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (agent_id, status, timestamp);

-- 6. Cost Metrics
CREATE TABLE IF NOT EXISTS agent_analytics.cost_metrics (
    agent_id String,
    model_name String,
    input_tokens UInt32,
    output_tokens UInt32,
    cost_usd Decimal(10, 6),
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (agent_id, model_name, timestamp);

-- 7. Anomaly Events
CREATE TABLE IF NOT EXISTS agent_analytics.anomaly_events (
    anomaly_id UUID,
    metric_name String,
    observed_value Float64,
    expected_threshold Float64,
    severity String,
    timestamp DateTime64(3)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (metric_name, severity, timestamp);
