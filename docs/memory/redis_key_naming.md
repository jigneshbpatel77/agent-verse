# Redis Key Naming Conventions & Schema Guidelines

This document details key structures, data types, and TTL configurations for Redis memory and workflow layers in the Vehicle Information Platform.

---

## 1. Key Schemas & Details

| Key Pattern | Redis Data Type | TTL (Time-To-Live) | Purpose |
| :--- | :--- | :--- | :--- |
| `session_memory:{agent_id}:{session_id}` | `Hash` | 24 Hours | Stores short-term session conversation history and local variable state for the agent graph execution. |
| `active_workflow:{workflow_id}` | `Hash` | 48 Hours | Stores active state machine tokens, steps executed, and input payload checkpoints for Temporal/NestJS runners. |
| `agent_lock:{agent_id}:{task_id}` | `String` | 5 Minutes (Max) | Distributed lock key to prevent multiple agents or threads from processing the same execution task concurrently. |
| `rate_limit:{agent_id}` | `String` | 1 Minute | Token bucket or counter key to limit agent model invocations within a specified time window. |
| `temporary_context:{task_id}` | `String` | 1 Hour | Short-lived storage for massive text files or intermediate variables during a multi-agent generation chain. |
| `pubsub:{topic}` | `Channel` | N/A | Local lightweight broker channel for pub/sub messaging inside agent process boundaries. |

---

## 2. Key Structure & Examples

### Session Memory
- **Pattern**: `session_memory:{agent_id}:{session_id}`
- **Example**: `session_memory:research-agent:session_9921_ap_road`
- **Fields**:
  - `history`: Stringified JSON list of conversation turns.
  - `metadata`: JSON payload containing context variables (e.g. `rto_office`, `vehicle_number`).
  - `token_count`: Cumulative count of tokens consumed in this session.

### Distributed Lock
- **Pattern**: `agent_lock:{agent_id}:{task_id}`
- **Example**: `agent_lock:quality-agent:task_qa_9821a`
- **Mechanism**: Set via `SETNX` with a lease time (e.g. 300 seconds) to ensure automatic release if the lock holder fails.

### Rate Limit Counter
- **Pattern**: `rate_limit:{agent_id}`
- **Example**: `rate_limit:architecture-agent`
- **Mechanism**: Increment counter with a sliding window expire to control model billing costs.
