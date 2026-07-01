'use client';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  Gauge,
  Layers,
  Loader2,
  Play,
  RefreshCcw,
  ScrollText,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiClient } from '@/api/client';

// ─── Types (mirror the /scheduler API) ──────────────────────────────────────────

type JobStatus = 'Running' | 'Success' | 'Failed' | 'Idle';

interface SchedulerJob {
  key: string;
  name: string;
  source: string;
  destination: string;
  frequency: string;
  enabled: boolean;
  status: JobStatus;
  last_run: string | null;
  next_run: string | null;
  last_duration_ms: number | null;
  last_error: string | null;
}

interface SchedulerOverview {
  generated_at: string;
  active: boolean;
  summary: {
    total_jobs: number;
    running_now: number;
    failed_24h: number;
    success_rate: number;
  };
  jobs: SchedulerJob[];
}

interface RunLog {
  status: JobStatus;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  rows_processed: number | null;
  error: string | null;
}

interface JobLogs {
  job_key: string;
  name: string;
  runs: RunLog[];
}

const JOBS_API = '/api/analytics-agent/api/v1/scheduler/jobs';

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function fmtRelative(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return '—';
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const label = mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.round(mins / 60)}h` : `${Math.round(mins / 1440)}d`;
  return diff >= 0 ? `in ${label}` : `${label} ago`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

const STATUS_STYLES: Record<JobStatus, { dot: string; text: string; chip: string }> = {
  Running: {
    dot: 'bg-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    chip: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  Success: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-600 dark:text-emerald-400',
    chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  Failed: {
    dot: 'bg-rose-500',
    text: 'text-rose-600 dark:text-rose-400',
    chip: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  },
  Idle: {
    dot: 'bg-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
};

function StatusBadge({ status }: { status: JobStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.chip}`}>
      <span className={`size-1.5 rounded-full ${s.dot} ${status === 'Running' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

// ─── Summary cards ──────────────────────────────────────────────────────────────

function SummaryCards({ summary }: { summary: SchedulerOverview['summary'] }) {
  const cards = [
    { label: 'Total Jobs', value: String(summary.total_jobs), icon: Layers, tone: 'text-[#6246ea] dark:text-violet-300' },
    { label: 'Running Now', value: String(summary.running_now), icon: Play, tone: 'text-blue-600 dark:text-blue-300' },
    { label: 'Failed (24h)', value: String(summary.failed_24h), icon: AlertTriangle, tone: 'text-rose-600 dark:text-rose-300' },
    { label: 'Success Rate', value: `${summary.success_rate.toFixed(1)}%`, icon: Gauge, tone: 'text-emerald-600 dark:text-emerald-300' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.label} className="app-surface rounded-lg p-5">
            <div className="flex items-center justify-between">
              <p className="app-muted text-sm font-medium">{card.label}</p>
              <span className={`grid size-8 place-items-center rounded-lg bg-[#f4f1ff] dark:bg-violet-500/10 ${card.tone}`}>
                <Icon className="size-4" />
              </span>
            </div>
            <p className={`mt-3 text-2xl font-semibold ${card.tone}`}>{card.value}</p>
          </article>
        );
      })}
    </div>
  );
}

// ─── Logs panel (slide-over) ────────────────────────────────────────────────────

function LogsPanel({ jobKey, onClose }: { jobKey: string; onClose: () => void }) {
  const [logs, setLogs] = useState<JobLogs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const client = new ApiClient({ baseUrl: window.location.origin });
    client
      .get<JobLogs>(`${JOBS_API}/${jobKey}/logs?limit=30`)
      .then((data) => {
        if (!cancelled) setLogs(data);
      })
      .catch(() => {
        if (!cancelled) setLogs({ job_key: jobKey, name: jobKey, runs: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [jobKey]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" aria-label="Close logs" onClick={onClose} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-[#e6eaf2] bg-white shadow-2xl dark:border-slate-700 dark:bg-[#0f1729]">
        <div className="flex items-center justify-between border-b border-[#e6eaf2] px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <ScrollText className="size-4 text-[#6246ea] dark:text-violet-300" />
            <div>
              <h3 className="text-sm font-semibold text-[#111827] dark:text-slate-100">Execution Logs</h3>
              <p className="text-xs text-slate-400">{logs?.name ?? jobKey}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
              <Loader2 className="size-4 animate-spin" /> Loading logs…
            </div>
          ) : logs && logs.runs.length > 0 ? (
            logs.runs.map((run, idx) => {
              const s = STATUS_STYLES[run.status];
              return (
                <div key={idx} className="rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] p-3 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${s.text}`}>
                      <span className={`size-1.5 rounded-full ${s.dot} ${run.status === 'Running' ? 'animate-pulse' : ''}`} />
                      {run.status}
                    </span>
                    <span className="text-[11px] text-slate-400">{fmtTime(run.started_at)}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Duration: <span className="font-semibold text-[#111827] dark:text-slate-200">{fmtDuration(run.duration_ms)}</span></span>
                    {run.rows_processed != null && (
                      <span>Rows: <span className="font-semibold text-[#111827] dark:text-slate-200">{run.rows_processed.toLocaleString()}</span></span>
                    )}
                  </div>
                  {run.error && (
                    <p className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-400">
                      {run.error}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center text-sm text-slate-400">No runs recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export function SchedulerMonitor() {
  const [overview, setOverview] = useState<SchedulerOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [logsFor, setLogsFor] = useState<string | null>(null);

  const client = useMemo(() => new ApiClient({ baseUrl: window.location.origin }), []);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get<SchedulerOverview>(JOBS_API, { cache: 'no-store' })
      .then((data) => {
        setOverview(data);
        setError(null);
        setLastRefresh(new Date());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load scheduler jobs');
      })
      .finally(() => setLoading(false));
  }, [client]);

  // Initial load + auto-refresh every 30s.
  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const active = overview?.active ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="app-surface rounded-lg p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="app-heading text-2xl font-semibold">Scheduler Monitor</h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                  active
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span className={`size-1.5 rounded-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {active ? 'Active' : 'Idle'}
              </span>
            </div>
            <p className="app-muted mt-1 text-sm">
              Cron &amp; scheduled data-sync jobs — run status, history, and failures from DuckDB.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#71809a] dark:text-slate-400">
              <Clock className="size-3" />
              Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString() : '—'}
            </p>
            {error ? <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{error}</p> : null}
          </div>
          <button
            type="button"
            onClick={load}
            className="app-button-secondary inline-flex h-10 w-fit items-center gap-2 rounded-lg px-3 text-sm font-semibold"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCcw className="size-4" />}
            Refresh
          </button>
        </div>
      </section>

      {/* Summary cards */}
      {overview ? <SummaryCards summary={overview.summary} /> : null}

      {/* Jobs table */}
      <section className="app-surface rounded-lg p-5">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="size-4 text-[#6246ea] dark:text-violet-300" />
          <h2 className="app-heading text-lg font-semibold">Scheduled Jobs</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#e6eaf2] text-left text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700 dark:text-slate-500">
                <th className="px-3 py-2.5">Job</th>
                <th className="px-3 py-2.5">Source → Destination</th>
                <th className="px-3 py-2.5">Frequency</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Last Run</th>
                <th className="px-3 py-2.5">Next Run</th>
                <th className="px-3 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overview?.jobs.map((job) => (
                <tr
                  key={job.key}
                  className="border-b border-[#eef1f6] last:border-0 dark:border-slate-800/70"
                >
                  <td className="px-3 py-3">
                    <div className="font-semibold text-[#111827] dark:text-slate-100">{job.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{job.key}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                      <Database className="size-3.5 text-slate-400" />
                      {job.source}
                      <ArrowRight className="size-3 text-slate-300" />
                      {job.destination}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {job.frequency}
                    </span>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-[#111827] dark:text-slate-200">{fmtTime(job.last_run)}</div>
                    <div className="text-[11px] text-slate-400">{fmtRelative(job.last_run)}</div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="text-xs text-[#111827] dark:text-slate-200">{fmtTime(job.next_run)}</div>
                    <div className="text-[11px] text-slate-400">{job.enabled ? fmtRelative(job.next_run) : 'disabled'}</div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setLogsFor(job.key)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#e6eaf2] px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-[#6246ea] hover:text-[#6246ea] dark:border-slate-700 dark:text-slate-300 dark:hover:border-violet-400 dark:hover:text-violet-300"
                    >
                      <ScrollText className="size-3.5" />
                      View Logs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && !overview ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
            <Loader2 className="size-4 animate-spin" /> Loading jobs…
          </div>
        ) : null}
        {!loading && overview && overview.jobs.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">No scheduled jobs configured.</div>
        ) : null}
      </section>

      {logsFor ? <LogsPanel jobKey={logsFor} onClose={() => setLogsFor(null)} /> : null}
    </div>
  );
}
