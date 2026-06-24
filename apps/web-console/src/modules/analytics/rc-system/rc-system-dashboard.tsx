import Link from 'next/link';
import { Activity, AlertTriangle, ChevronRight, Clock3, Cpu, Database, Gauge, HardDrive, Home, RotateCcw, Server, TimerReset, Wifi } from 'lucide-react';
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

const serviceDescriptions: Record<string, string> = {
  rc: 'Registration certificate lookups, provider response health, and scrape/API reliability.',
  challan: 'Challan search throughput, provider errors, and request latency.',
  'service-history': 'Service history API availability, dependency health, and response timing.',
  fastag: 'Fastag service uptime, payment-adjacent dependency health, and latency.',
  payments: 'Payment workflow request health, provider reliability, and failure indicators.',
};

const metricMeta = {
  requestRate: { label: 'Request rate', icon: Activity, tone: 'violet' },
  errorRate: { label: 'Error rate', icon: AlertTriangle, tone: 'red' },
  p95: { label: 'P95 latency', icon: Gauge, tone: 'violet' },
  p99: { label: 'P99 latency', icon: Clock3, tone: 'violet' },
  p50: { label: 'P50 latency', icon: TimerReset, tone: 'violet' },
  p90: { label: 'P90 latency', icon: Gauge, tone: 'violet' },
  cpu: { label: 'CPU', icon: Cpu, tone: 'slate' },
  memory: { label: 'Memory', icon: HardDrive, tone: 'slate' },
  restarts: { label: 'Pod restarts', icon: RotateCcw, tone: 'amber' },
  providerLatency: { label: 'Provider latency', icon: Wifi, tone: 'violet' },
  providerError: { label: 'Provider error rate', icon: AlertTriangle, tone: 'red' },
  updated: { label: 'Last updated', icon: Clock3, tone: 'slate' },
} as const;

export async function RcSystemDashboard({ serviceKey = 'rc' }: { serviceKey?: string }) {
  const { health, error } = await fetchServiceHealth(serviceKey);
  const displayName = serviceLabels[serviceKey] ?? health?.service_name ?? serviceKey;
  const missingCount = health?.missing_metrics.length ?? 0;
  const availableCount = [
    health?.request_rate,
    health?.error_rate,
    health?.p50_latency_ms,
    health?.p90_latency_ms,
    health?.p95_latency_ms,
    health?.p99_latency_ms,
    health?.cpu_usage,
    health?.memory_usage_bytes,
    health?.pod_restarts_15m,
    health?.provider_p95_latency_ms,
    health?.provider_error_rate,
  ].filter((value) => value !== null && value !== undefined).length;

  return (
    <div className="space-y-6">
      <nav
        className="flex max-w-full items-center gap-1.5 overflow-x-auto text-xs font-semibold text-[#71809a] dark:text-slate-400"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="grid size-6 shrink-0 place-items-center rounded-md text-[#71809a] transition hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
          <Home className="size-3.5" />
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-[#a4afc1]" />
        <Link href="/agents/analytics" className="shrink-0 rounded-md px-1.5 py-1 transition hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:hover:bg-violet-500/10 dark:hover:text-violet-200">
          Analytics Agent
        </Link>
        <ChevronRight className="size-3.5 shrink-0 text-[#a4afc1]" />
        <span className="shrink-0 px-1.5 py-1 text-[#4f5d73] dark:text-slate-300">System Analytics</span>
        <ChevronRight className="size-3.5 shrink-0 text-[#a4afc1]" />
        <span className="truncate px-1.5 py-1 text-[#111827] dark:text-slate-100">{displayName}</span>
      </nav>

      <section className="app-surface overflow-hidden rounded-lg">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              <Server className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6246ea] dark:text-violet-300">Service Analytics</p>
              <h1 className="mt-1 text-2xl font-semibold text-[#111827] dark:text-slate-50">{displayName}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#71809a] dark:text-slate-400">
                {serviceDescriptions[serviceKey] ?? 'Prometheus-backed health and latency analytics for VehicleInfo services.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={health?.status ?? 'unknown'} />
            <span className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-sm font-medium text-[#4f5d73] dark:border-[#263247] dark:bg-slate-950/40 dark:text-slate-300">
              {availableCount}/11 signals
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 border-t border-[#e6eaf2] px-5 py-4 dark:border-[#263247]">
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
        <MetricCard meta={metricMeta.requestRate} value={formatNumber(health?.request_rate)} suffix="req/s" helper="5m rolling rate" />
        <MetricCard meta={metricMeta.errorRate} value={formatPercent(health?.error_rate)} helper="HTTP 5xx + timeout" />
        <MetricCard meta={metricMeta.p95} value={formatNumber(health?.p95_latency_ms)} suffix="ms" helper="User-facing tail latency" />
        <MetricCard meta={metricMeta.p99} value={formatNumber(health?.p99_latency_ms)} suffix="ms" helper="Worst-case request latency" />
        <MetricCard meta={metricMeta.p50} value={formatNumber(health?.p50_latency_ms)} suffix="ms" helper="Median response time" />
        <MetricCard meta={metricMeta.p90} value={formatNumber(health?.p90_latency_ms)} suffix="ms" helper="High percentile trend" />
        <MetricCard meta={metricMeta.cpu} value={formatNumber(health?.cpu_usage)} suffix="cores" helper="Runtime utilization" />
        <MetricCard meta={metricMeta.memory} value={formatBytes(health?.memory_usage_bytes)} helper="Container memory usage" />
        <MetricCard meta={metricMeta.restarts} value={formatNumber(health?.pod_restarts_15m)} suffix="15m" helper="Recent pod stability" />
        <MetricCard meta={metricMeta.providerLatency} value={formatNumber(health?.provider_p95_latency_ms)} suffix="ms p95" helper="External provider latency" />
        <MetricCard meta={metricMeta.providerError} value={formatPercent(health?.provider_error_rate)} helper="External provider failure rate" />
        <MetricCard meta={metricMeta.updated} value={health ? formatDate(health.generated_at) : null} helper="Prometheus scrape timestamp" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="app-surface rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">Signal coverage</h2>
              <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">{missingCount ? `${missingCount} metrics still unavailable from Prometheus.` : 'All expected metrics are available.'}</p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              <Database className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {health?.missing_metrics.length ? (
              <ul className="space-y-2 text-sm text-[#4f5d73] dark:text-slate-300">
                {health.missing_metrics.map((metric) => (
                  <li key={metric} className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 dark:border-[#263247] dark:bg-[#0f172a]">
                    <span className="font-semibold text-[#111827] dark:text-slate-100">{metric}</span>
                    <span className="ml-2 text-[#71809a] dark:text-slate-400">{unavailable}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{health ? 'No missing metrics reported.' : unavailable}</p>
            )}
          </div>
        </article>

        <article className="app-surface rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">Prometheus queries</h2>
              <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Raw PromQL used by the analytics agent for this service.</p>
            </div>
          </div>
          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
            {health ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(health.raw_prometheus_queries).map(([name, query]) => (
                  <div key={name} className="rounded-lg bg-white p-3 dark:bg-[#111827]">
                    <dt className="font-semibold text-[#111827] dark:text-slate-100">{name}</dt>
                    <dd className="mt-1 break-words font-mono text-xs text-[#4f5d73] dark:text-slate-400">{query}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{unavailable}</p>
            )}
          </div>
        </article>
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

function MetricCard({
  meta,
  value,
  suffix,
  helper,
}: {
  meta: { label: string; icon: typeof Activity; tone: 'violet' | 'red' | 'amber' | 'slate' };
  value: string | null;
  suffix?: string;
  helper: string;
}) {
  const Icon = meta.icon;
  const toneClass = {
    violet: 'bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
    slate: 'bg-slate-100 text-[#71809a] dark:bg-slate-800 dark:text-slate-300',
  }[meta.tone];

  return (
    <article className="app-surface min-h-36 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#71809a] dark:text-slate-400">{meta.label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {value ? (
        <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-50">
          {value}
          {suffix ? <span className="ml-1 text-sm font-medium text-[#71809a] dark:text-slate-400">{suffix}</span> : null}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#4f5d73] dark:text-slate-400">{unavailable}</p>
      )}
      <p className="mt-3 text-xs font-medium text-[#71809a] dark:text-slate-500">{helper}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: RcHealthResponse['status'] }) {
  const className = {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    degraded: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    unknown: 'border-[#e1e6ef] bg-[#f8faff] text-[#4f5d73] dark:border-[#263247] dark:bg-slate-800 dark:text-slate-300',
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
