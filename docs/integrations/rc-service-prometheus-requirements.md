# RC Service Prometheus Requirements

RC System Analytics uses only real Prometheus metrics scraped from the real RC Service.

The Analytics Agent does not create a mock RC service, generate fake data, hardcode sample metrics, or call RC business APIs for analytics.

## RC Service Endpoints

The real RC Service must expose:

- `GET /health`
- `GET /ready`
- `GET /metrics`

## Prometheus Scrape Config

```yaml
scrape_configs:
  - job_name: "rc-service"
    metrics_path: "/metrics"
    static_configs:
      - targets:
          - "<REAL_RC_SERVICE_HOST>:<REAL_RC_SERVICE_PORT>"
```

Current VehicleInfo RC Service scrape config:

```yaml
scrape_configs:
  - job_name: rc-service
    scheme: https
    metrics_path: /RC/rc_details_get_and_store/api/metrics
    static_configs:
      - targets: ["vi-api.vehicleinfo.app"]
        labels:
          service: rc-service
          provider: rc-provider
          environment: staging
```

Temporary local testing fallback while RC metrics access is restricted:

```yaml
scrape_configs:
  - job_name: rc-service-webhook-fallback
    scheme: https
    metrics_path: /webhook/api/metrics
    static_configs:
      - targets: ["webhook.vehicleinfo.app"]
        labels:
          service: rc-service
          provider: rc-provider
          environment: staging
          source_service: webhook-test-fallback
```

Remove the fallback job after RC Service allows Prometheus to scrape `/RC/rc_details_get_and_store/api/metrics`.

## Required Metrics

- `http_requests_total`
- `http_request_duration_seconds_bucket`
- `external_api_requests_total`
- `external_api_duration_seconds_bucket`
- `external_api_timeouts_total`

## Recommended Labels

- `service`
- `endpoint`
- `method`
- `status`
- `provider`
- `environment`

## Analytics Agent Environment

```bash
PROMETHEUS_URL=http://<PROMETHEUS_HOST>:9090
RC_SERVICE_NAME=rc-service
RC_PROVIDER_NAME=rc-provider
RC_ENVIRONMENT=staging
PROMETHEUS_QUERY_TIMEOUT_SECONDS=10
```

For local Docker Compose, use:

```bash
PROMETHEUS_URL=http://localhost:9090
```

Do not set `PROMETHEUS_URL` to the RC Service `/metrics` URL. Prometheus scrapes that URL, and the Analytics Agent queries Prometheus.

If RC Service uses different metric or label names, override the Analytics Agent mapping:

```bash
RC_SERVICE_LABEL=service
RC_PROVIDER_LABEL=provider
RC_STATUS_LABEL=status
RC_ENVIRONMENT_LABEL=environment
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

## Discovery

Use this endpoint to inspect available metric names before finalizing mappings:

```bash
curl http://localhost:8010/api/v1/system/rc/metrics/discover
```

Through the API Gateway:

```bash
curl http://localhost:4000/api/analytics/system/rc/metrics/discover
```

## Troubleshooting

If the dashboard shows no values, check each layer in order:

```bash
curl -i https://vi-api.vehicleinfo.app/RC/rc_details_get_and_store/api/metrics
curl "http://localhost:9090/api/v1/targets"
curl "http://localhost:9090/api/v1/label/__name__/values"
curl http://localhost:8010/api/v1/system/rc/health
curl http://localhost:4000/api/analytics/system/rc/health
```

If the RC metrics endpoint returns this response, Prometheus cannot scrape it:

```json
{"error":"Forbidden: Access to metrics is restricted."}
```

Allow Prometheus to access the RC Service metrics endpoint, usually by IP allowlisting the Prometheus host or by configuring the RC Service and Prometheus with the same metrics auth token.

For the temporary webhook fallback, HTTP status is exposed as `status_code`, so set:

```bash
RC_STATUS_LABEL=status_code
```
