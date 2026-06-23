# Monitoring Alerting

Analytics domain for production monitoring and alerting.

The first implementation reads AWS CloudWatch logs, sends compact batches to an LLM, and returns structured findings with severity, evidence, confidence, and recommended action.

Routes are exposed under:

```text
/api/v1/monitoring-alerting
```

## LLM Provider

The log-analysis handoff uses an adapter, so the provider is configured rather than hard-coded.

Use Grok/xAI:

```bash
LLM_PROVIDER=grok
XAI_API_KEY=...
XAI_BASE_URL=https://api.x.ai/v1
XAI_MODEL=grok-4
```

Use OpenAI:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
OPENAI_BASE_URL=
```

Both adapters use an OpenAI-compatible chat-completions interface and request JSON output.

## CloudWatch Log Group Selection

The agent never scans every CloudWatch log group. It only reads groups explicitly configured in `CLOUDWATCH_LOG_GROUPS`.

Configure the allowlist in `.env`:

```bash
CLOUDWATCH_LOG_GROUPS=/aws/lambda/service-a,/aws/ecs/api-prod
CLOUDWATCH_LOOKBACK_MINUTES=2
```

Poll all configured groups:

```bash
curl -X POST http://localhost:8010/api/v1/monitoring-alerting/cloudwatch/poll
```

Poll only a subset of configured groups:

```bash
curl -X POST http://localhost:8010/api/v1/monitoring-alerting/cloudwatch/poll \
  -H "Content-Type: application/json" \
  -d '{"log_groups":["/aws/lambda/service-a"]}'
```

List configured groups:

```bash
curl http://localhost:8010/api/v1/monitoring-alerting/cloudwatch/log-groups
```
