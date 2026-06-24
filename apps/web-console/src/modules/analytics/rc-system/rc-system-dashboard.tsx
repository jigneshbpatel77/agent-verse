import Link from 'next/link';
import { ApiClient } from '@/api/client';
import { runtimeConfig } from '@/config/runtime';

interface RcHealthResponse {
  service_key: string;
  service_name: string;
  status: 'healthy' | 'degraded' | 'critical' | 'unknown';
  request_rate: number | null;
  error_rate: number | null;
  p50_latency_ms: number | null;
  p90_latency_ms: number | null;
  p95_latency_ms: number | null;
  p99_latency_ms: number | null;
  cpu_usage: number | null;
  memory_usage_bytes: number | null;
  pod_restarts_15m: number | null;
  provider_error_rate: number | null;
  provider_p95_latency_ms: number | null;
  generated_at: string;
  missing_metrics: string[];
  raw_prometheus_queries: Record<string, string>;
}

const unavailable = 'Metric not available from Prometheus';

const serviceLabels: Record<string, string> = {
  rc: 'RC Service',
  challan: 'Challan Service',
  'service-history': 'Service History Service',
  fastag: 'Fastag Service',
  payments: 'Payments Service',
};

export async function RcSystemDashboard({ serviceKey = 'rc' }: { serviceKey?: string }) {
  const { health, error } = await fetchServiceHealth(serviceKey);
  const displayName = serviceLabels[serviceKey] ?? health?.service_name ?? serviceKey;

  return (
    <div className="space-y-6">
      <section className="app-surface rounded-lg p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[#6246ea] dark:text-violet-300">Service Analytics</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-950 dark:text-slate-50">{displayName}</h1>
            <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Prometheus-backed health and latency analytics for VehicleInfo services.</p>
          </div>
          <StatusBadge status={health?.status ?? 'unknown'} />
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
          {Object.entries(serviceLabels).map(([key, label]) => (
            <Link
              key={key}
              href={`/analytics/system/${key}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                key === serviceKey
                  ? 'bg-[#efecff] text-[#4f3ee7] dark:bg-violet-500/15 dark:text-violet-200'
                  : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </section>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Request rate" value={formatNumber(health?.request_rate)} suffix="req/s" />
        <MetricCard label="Error rate" value={formatPercent(health?.error_rate)} />
        <MetricCard label="P95 latency" value={formatNumber(health?.p95_latency_ms)} suffix="ms" />
        <MetricCard label="P99 latency" value={formatNumber(health?.p99_latency_ms)} suffix="ms" />
        <MetricCard label="P50 latency" value={formatNumber(health?.p50_latency_ms)} suffix="ms" />
        <MetricCard label="P90 latency" value={formatNumber(health?.p90_latency_ms)} suffix="ms" />
        <MetricCard label="CPU" value={formatNumber(health?.cpu_usage)} suffix="cores" />
        <MetricCard label="Memory" value={formatBytes(health?.memory_usage_bytes)} />
        <MetricCard label="Pod restarts" value={formatNumber(health?.pod_restarts_15m)} suffix="15m" />
        <MetricCard label="Provider latency" value={formatNumber(health?.provider_p95_latency_ms)} suffix="ms p95" />
        <MetricCard label="Provider error rate" value={formatPercent(health?.provider_error_rate)} />
        <MetricCard label="Last updated" value={health ? formatDate(health.generated_at) : null} />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Missing metrics</h2>
          <div className="mt-3 app-surface rounded-lg p-4">
            {health?.missing_metrics.length ? (
              <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                {health.missing_metrics.map((metric) => (
                  <li key={metric}>
                    <span className="font-medium">{metric}</span>: {unavailable}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{health ? 'No missing metrics reported.' : unavailable}</p>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">Prometheus queries</h2>
          <div className="mt-3 max-h-96 overflow-auto app-surface rounded-lg p-4">
            {health ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(health.raw_prometheus_queries).map(([name, query]) => (
                  <div key={name}>
                    <dt className="font-medium text-slate-800 dark:text-slate-100">{name}</dt>
                    <dd className="mt-1 break-words font-mono text-xs text-[#4f5d73] dark:text-slate-400">{query}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{unavailable}</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

async function fetchServiceHealth(serviceKey: string): Promise<{ health: RcHealthResponse | null; error: string | null }> {
  try {
    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });
    const health = await client.get<RcHealthResponse>(`/api/analytics/system/${serviceKey}/health`, { cache: 'no-store' });
    return { health, error: null };
  } catch (error) {
    return {
      health: null,
      error: error instanceof Error ? error.message : 'Unable to load RC analytics from the API Gateway.',
    };
  }
}

function MetricCard({ label, value, suffix }: { label: string; value: string | null; suffix?: string }) {
  return (
    <article className="min-h-32 app-surface rounded-lg p-4">
      <p className="text-sm font-medium text-[#71809a] dark:text-slate-400">{label}</p>
      {value ? (
        <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">
          {value}
          {suffix ? <span className="ml-1 text-sm font-medium text-[#71809a] dark:text-slate-400">{suffix}</span> : null}
        </p>
      ) : (
        <p className="mt-3 text-sm leading-6 text-[#4f5d73] dark:text-slate-400">{unavailable}</p>
      )}
    </article>
  );
}

function StatusBadge({ status }: { status: RcHealthResponse['status'] }) {
  const className = {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    degraded: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-red-200 bg-red-50 text-red-700',
    unknown: 'border-slate-200 bg-slate-100 text-slate-700',
  }[status];

  return <span className={`w-fit rounded border px-3 py-1 text-sm font-medium ${className}`}>{status}</span>;
}

function formatNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
}

function formatPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2, style: 'percent' }).format(value);
}

function formatBytes(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2, style: 'unit', unit: 'megabyte' }).format(
    value / 1024 / 1024,
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}
