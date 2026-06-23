# Redis Keys

| Key | Purpose |
| --- | --- |
| `session_memory:{agent_id}:{session_id}` | Per-agent conversational/session memory. |
| `active_workflow:{workflow_id}` | Durable workflow working state cache. |
| `agent_lock:{agent_id}:{task_id}` | Distributed lock for task ownership. |
| `rate_limit:{agent_id}` | Per-agent rate limiting counter/window. |
| `temporary_context:{task_id}` | Short-lived task scratchpad context. |
| `pubsub:{topic}` | Redis pub/sub channel namespace. |
