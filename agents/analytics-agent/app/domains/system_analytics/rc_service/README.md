# RC Service System Analytics

This domain reads RC Service health only from Prometheus.

It does not create mock RC data, call RC business APIs, or synthesize fallback metric values. Missing Prometheus series are returned as `null`, listed in `missing_metrics`, and core metric gaps set status to `unknown`.

## Endpoints

- `GET /api/v1/system/rc/health`
- `GET /api/v1/system/rc/metrics/discover`
- `GET /api/v1/system/services`
- `GET /api/v1/system/{service_key}/health`
- `GET /api/v1/system/{service_key}/metrics/discover`

Supported service keys:

- `rc`
- `challan`
- `service-history`
- `fastag`
- `payments`

## Required Environment

```bash
PROMETHEUS_URL=http://localhost:9090
RC_SERVICE_NAME=rc-service
RC_PROVIDER_NAME=rc-provider
RC_ENVIRONMENT=staging
PROMETHEUS_QUERY_TIMEOUT_SECONDS=10
```

Label and metric names can be overridden with:

```bash
RC_SERVICE_LABEL=service
RC_PROVIDER_LABEL=provider
RC_STATUS_LABEL=status
RC_ENVIRONMENT_LABEL=
RC_POD_LABEL=pod
RC_POD_PATTERN=rc-service.*
RC_HTTP_REQUESTS_METRIC=http_requests_total
RC_HTTP_DURATION_BUCKET_METRIC=http_request_duration_seconds_bucket
RC_EXTERNAL_REQUESTS_METRIC=external_api_requests_total
RC_EXTERNAL_DURATION_BUCKET_METRIC=external_api_duration_seconds_bucket
RC_POD_RESTARTS_METRIC=kube_pod_container_status_restarts_total
RC_CPU_USAGE_METRIC=container_cpu_usage_seconds_total
RC_MEMORY_WORKING_SET_METRIC=container_memory_working_set_bytes
```
