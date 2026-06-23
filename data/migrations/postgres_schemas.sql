-- PostgreSQL Database Schemas for Vehicle Information Platform Source of Truth

CREATE SCHEMA IF NOT EXISTS core;

-- 1. Agents Registry
CREATE TABLE IF NOT EXISTS core.agents (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- python, nestjs
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Agent Tasks
CREATE TABLE IF NOT EXISTS core.agent_tasks (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES core.agents(id),
    workflow_id VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    input_data JSONB,
    output_data JSONB,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Workflows
CREATE TABLE IF NOT EXISTS core.workflows (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    trigger_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'running',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 4. Workflow Steps
CREATE TABLE IF NOT EXISTS core.workflow_steps (
    id VARCHAR(50) PRIMARY KEY,
    workflow_id VARCHAR(50) REFERENCES core.workflows(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    assigned_agent VARCHAR(50) REFERENCES core.agents(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    depends_on VARCHAR(50)[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Approvals System
CREATE TABLE IF NOT EXISTS core.approvals (
    id VARCHAR(50) PRIMARY KEY,
    workflow_step_id VARCHAR(50) REFERENCES core.workflow_steps(id) ON DELETE CASCADE,
    requestor VARCHAR(100) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    decision VARCHAR(20) DEFAULT 'pending', -- approved, rejected, pending
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    decided_at TIMESTAMP WITH TIME ZONE
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS core.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    operator VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(50) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Feature Registry
CREATE TABLE IF NOT EXISTS core.feature_registry (
    key VARCHAR(100) PRIMARY KEY,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    rules JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Agent Long-term Text Memory
CREATE TABLE IF NOT EXISTS core.agent_memory (
    id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES core.agents(id),
    memory_key VARCHAR(255) NOT NULL,
    memory_value TEXT NOT NULL,
    importance_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Knowledge Documents
CREATE TABLE IF NOT EXISTS core.knowledge_documents (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    source_url VARCHAR(512),
    doc_type VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Knowledge Chunks
CREATE TABLE IF NOT EXISTS core.knowledge_chunks (
    id VARCHAR(50) PRIMARY KEY,
    document_id VARCHAR(50) REFERENCES core.knowledge_documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    vector_id VARCHAR(50), -- Reference to Qdrant vector UUID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Code Generation History
CREATE TABLE IF NOT EXISTS core.code_generation_history (
    id VARCHAR(50) PRIMARY KEY,
    task_id VARCHAR(50) REFERENCES core.agent_tasks(id),
    component_name VARCHAR(100) NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    generated_code TEXT NOT NULL,
    language VARCHAR(30) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Deployment History
CREATE TABLE IF NOT EXISTS core.deployment_history (
    id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    docker_image VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    deployed_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Incident History
CREATE TABLE IF NOT EXISTS core.incident_history (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'triggered', -- triggered, acknowledged, resolved
    root_cause TEXT,
    resolution_steps TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 14. Model Invocations
CREATE TABLE IF NOT EXISTS core.model_invocations (
    id BIGSERIAL PRIMARY KEY,
    agent_id VARCHAR(50),
    model_name VARCHAR(100) NOT NULL,
    prompt_tokens INT NOT NULL,
    completion_tokens INT NOT NULL,
    cost DECIMAL(10, 6),
    latency_ms INT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Kafka Event Log (Audit trail of streaming events)
CREATE TABLE IF NOT EXISTS core.kafka_event_log (
    event_id VARCHAR(50) PRIMARY KEY,
    topic VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
