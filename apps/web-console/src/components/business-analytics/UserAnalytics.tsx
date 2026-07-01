'use client';

import { ApiClient } from '@/api/client';
import { useEffect, useState } from 'react';
import { BadgeCheck, BellRing, LogIn, UserPlus, Users, UserX } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataSourceBadge } from './DataSourceBadge';
import { formatNumber } from './formatters';

interface Overview {
  total_users: number;
  distinct_sources: number;
  distinct_platforms: number;
  logged_in: number;
  never_logged_in: number;
  activation_rate_pct: number;
  never_logged_in_pct: number;
  push_reachable_pct: number;
  mobile_provided_pct: number;
  verified_pct: number;
  soft_deleted: number;
}

interface DimensionSlice {
  label: string;
  users: number;
  pct: number;
  activation_rate_pct: number;
}

interface LifecycleSlice {
  label: string;
  users: number;
  pct: number;
}

interface UserAnalyticsSummary {
  start_date: string | null;
  end_date: string | null;
  data_source: string;
  overview: Overview;
  by_source: DimensionSlice[];
  by_platform: DimensionSlice[];
  by_version: DimensionSlice[];
  signups_daily: Array<{ day: string; signups: number }>;
  lifecycle: LifecycleSlice[];
}

const BAR_COLORS = ['#6246ea', '#2dd4bf', '#f59e0b', '#38bdf8', '#fb7185', '#a78bfa'];

export function UserAnalytics() {
  const [data, setData] = useState<UserAnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const client = new ApiClient({ baseUrl: window.location.origin });
    setIsLoading(true);
    setError(null);
    client
      .get<UserAnalyticsSummary>('/api/analytics-agent/api/v1/business-analytics/users/summary', {
        cache: 'no-store',
        signal: controller.signal,
      })
      .then((res) => {
        if (!controller.signal.aborted) setData(res);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Failed to load user analytics');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (isLoading) {
    return <p className="app-muted text-sm">Loading user analytics…</p>;
  }
  if (error || !data) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
        User analytics unavailable. {error}
      </p>
    );
  }

  const o = data.overview;
  const cards = [
    { label: 'Total Users', value: formatNumber(o.total_users), icon: Users, tone: 'text-[#6246ea] dark:text-violet-300' },
    { label: 'Activation Rate', value: `${o.activation_rate_pct}%`, icon: LogIn, tone: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'Never Logged In', value: `${o.never_logged_in_pct}%`, icon: UserX, tone: 'text-rose-600 dark:text-rose-300' },
    { label: 'Push-Reachable', value: `${o.push_reachable_pct}%`, icon: BellRing, tone: 'text-sky-600 dark:text-sky-300' },
    { label: 'Mobile Verified', value: `${o.verified_pct}%`, icon: BadgeCheck, tone: 'text-emerald-600 dark:text-emerald-300' },
    { label: 'Acquisition Sources', value: formatNumber(o.distinct_sources), icon: UserPlus, tone: 'text-amber-600 dark:text-amber-300' },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="app-muted text-sm">
          User registration analytics · source <span className="font-semibold uppercase">{data.data_source}</span> ·
          PII-masked warehouse (last 3 days)
        </p>
        <DataSourceBadge source="live" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <article key={c.label} className="app-surface rounded-lg p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="app-muted text-sm font-semibold">{c.label}</p>
                <Icon className={`size-5 ${c.tone}`} />
              </div>
              <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-100">{c.value}</p>
            </article>
          );
        })}
      </div>

      <DimensionChart title="Source attribution" subtitle="Signups by acquisition channel" rows={data.by_source} />

      <div className="grid gap-6 lg:grid-cols-2">
        <DimensionTable title="Platform split" rows={data.by_platform} />
        <DimensionTable title="App version distribution" rows={data.by_version} />
      </div>

      <LifecyclePanel rows={data.lifecycle} />
    </section>
  );
}

function DimensionChart({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: DimensionSlice[];
}) {
  return (
    <article className="app-surface rounded-lg p-5">
      <p className="text-sm font-semibold text-[#111827] dark:text-slate-100">{title}</p>
      <p className="app-muted mb-4 text-xs">{subtitle}</p>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#71809a" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#71809a" />
            <Tooltip
              formatter={(value: number, _name, item) => [
                `${formatNumber(value)} users (${(item?.payload as DimensionSlice)?.pct}%)`,
                'Users',
              ]}
            />
            <Bar dataKey="users" radius={[6, 6, 0, 0]} isAnimationActive={false}>
              {rows.map((row, index) => (
                <Cell key={row.label} fill={BAR_COLORS[index % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}

function DimensionTable({ title, rows }: { title: string; rows: DimensionSlice[] }) {
  return (
    <article className="app-surface rounded-lg p-5">
      <p className="mb-3 text-sm font-semibold text-[#111827] dark:text-slate-100">{title}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="app-muted text-left text-xs uppercase tracking-wide">
            <th className="pb-2 font-semibold">Segment</th>
            <th className="pb-2 text-right font-semibold">Users</th>
            <th className="pb-2 text-right font-semibold">Share</th>
            <th className="pb-2 text-right font-semibold">Activation</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-[#eef1f6] dark:border-slate-800">
              <td className="py-2 text-[#111827] dark:text-slate-100">{row.label}</td>
              <td className="py-2 text-right tabular-nums">{formatNumber(row.users)}</td>
              <td className="py-2 text-right tabular-nums">{row.pct}%</td>
              <td className="py-2 text-right tabular-nums">{row.activation_rate_pct}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}

function LifecyclePanel({ rows }: { rows: LifecycleSlice[] }) {
  return (
    <article className="app-surface rounded-lg p-5">
      <p className="mb-4 text-sm font-semibold text-[#111827] dark:text-slate-100">Lifecycle segments</p>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-[#111827] dark:text-slate-100">{row.label}</span>
              <span className="app-muted tabular-nums">
                {formatNumber(row.users)} · {row.pct}%
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#eef1f6] dark:bg-slate-800">
              <div
                className="h-full rounded-full"
                style={{ width: `${row.pct}%`, backgroundColor: BAR_COLORS[index % BAR_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}
