# System Analytics

System Analytics monitors VehicleInfo production/staging microservices from Prometheus only.

Current service catalog:

- `rc` - RC Service
- `challan` - Challan Service
- `service-history` - Service History Service
- `fastag` - Fastag Service
- `payments` - Payments Service

## API

Analytics Agent:

```bash
GET /api/v1/system/services
GET /api/v1/system/{service_key}/health
GET /api/v1/system/{service_key}/metrics/discover
```

API Gateway:

```bash
GET /api/analytics/system/services
GET /api/analytics/system/{service_key}/health
GET /api/analytics/system/{service_key}/metrics/discover
```

Frontend:

```text
/analytics/system/rc
/analytics/system/challan
/analytics/system/service-history
/analytics/system/fastag
/analytics/system/payments
```

## Required Prometheus Metrics

Each service should expose:

- `http_requests_total`
- `http_request_duration_seconds_bucket`
- `external_api_requests_total`
- `external_api_duration_seconds_bucket`
- `external_api_timeouts_total`

Recommended labels:

- `service`
- `endpoint`
- `method`
- `status` or `status_code`
- `provider`
- `environment`

The health response never uses mock data. If a metric is missing, the API returns `null`, includes the metric in `missing_metrics`, and the dashboard shows `Metric not available from Prometheus`.

## Health Thresholds

`critical`:

- `error_rate >= 5%`
- or `p99_latency_ms >= 5000`
- or `provider_error_rate >= 20%`
- or `pod_restarts_15m >= 3`

`degraded`:

- `error_rate >= 2%`
- or `p95_latency_ms >= 2000`
- or `p99_latency_ms >= 3000`
- or `provider_error_rate >= 10%`
- or `provider_p95_latency_ms >= 3000`
- or `pod_restarts_15m >= 1`

`unknown`:

- Prometheus unavailable
- core service HTTP metrics missing
- required histogram metrics missing

## Adding Service Routes

Add each real service `/metrics` endpoint to `infra/prometheus/prometheus.yml` with stable labels:

```yaml
scrape_configs:
  - job_name: challan-service
    scheme: https
    metrics_path: /<challan-metrics-path>
    static_configs:
      - targets: ["<host>"]
        labels:
          service: challan-service
          provider: challan-provider
          environment: staging
```

Use the same pattern for `service-history-service`, `fastag-service`, and `payments-service`.
