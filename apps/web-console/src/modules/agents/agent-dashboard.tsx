'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Cpu,
  Database,
  FileText,
  Gauge,
  HardDrive,
  Loader2,
  Pause,
  Play,
  Radar,
  RotateCcw,
  Server,
  ShieldAlert,
  SlidersHorizontal,
  Terminal,
  TimerReset,
  TrendingUp,
  Wifi,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ApiClient } from '@/api/client';
import { runtimeConfig } from '@/config/runtime';
import { MonitoringAgentControl } from '@/modules/analytics/monitoring-agent-control';
import { agents, getAgent, summaryTrend } from '@/modules/dashboard/data';
import { agentStatusPill, normalizeAgentStatus, type AgentDisplayStatus } from '@/modules/dashboard/status';
import { useAgentUiState } from '@/state/app-ui-state';

const tabs = ['Overview', 'Tasks', 'Workflows', 'Metrics', 'Logs', 'Alerts', 'Settings'];

const recentTasks = [
  { id: 'task_4821', title: 'RC provider latency analysis', status: 'Running', duration: '38s' },
  { id: 'task_4817', title: 'Kafka lag diagnosis', status: 'Completed', duration: '1m 14s' },
  { id: 'task_4809', title: 'Payment workflow anomaly scan', status: 'Completed', duration: '2m 02s' },
  { id: 'task_4801', title: 'Failed job correlation', status: 'Failed', duration: '44s' },
];

const analyticsResponsibilities = [
  {
    key: 'system',
    title: 'System Analytics',
    icon: Activity,
    status: 'In progress',
    summary: 'System performance, latency, cost, and bottleneck detection across VehicleInfo services.',
    output: 'Daily health report and optimization recommendations',
    metrics: [
      { label: 'Coverage', value: 'RC live' },
      { label: 'P95 target', value: '< 800ms' },
      { label: 'Signals', value: '12' },
    ],
    actions: ['Service analytics', 'Latency review', 'Capacity scan'],
  },
  {
    key: 'business',
    title: 'Business Analytics',
    icon: TrendingUp,
    status: 'Planned',
    summary: 'Revenue, KPIs, forecasting, ROI, cost-benefit, funnels, retention, churn, segmentation, and journey mapping.',
    output: 'Executive summary, revenue plan, growth opportunities, and feature suggestions',
    metrics: [
      { label: 'Dashboards', value: '0' },
      { label: 'Forecasts', value: 'Pending' },
      { label: 'KPIs', value: 'Draft' },
    ],
    actions: ['Revenue model', 'Funnel report', 'Cohort plan'],
  },
  {
    key: 'monitoring',
    title: 'Monitoring & Alerting',
    icon: ShieldAlert,
    status: 'Planned',
    summary: 'Agent failures, API health, security anomalies, and recurring error patterns.',
    output: 'Real-time alerts and incident reports',
    metrics: [
      { label: 'Rules', value: '8' },
      { label: 'Incidents', value: '2' },
      { label: 'SLOs', value: 'Draft' },
    ],
    actions: ['Alert rules', 'Incident feed', 'SLO review'],
  },
  {
    key: 'decision',
    title: 'Decision Intelligence',
    icon: Radar,
    status: 'Planned',
    summary: 'Contextual insights, opportunity scoring, and initiative prioritization.',
    output: 'Decision recommendations and prioritized action lists',
    metrics: [
      { label: 'Decisions', value: '0' },
      { label: 'Priority model', value: 'Draft' },
      { label: 'Signals', value: '4' },
    ],
    actions: ['Opportunity score', 'Action queue', 'Risk review'],
  },
];

export function AgentDashboard({ agentKey, showServiceAnalyticsAction = false }: { agentKey: string; showServiceAnalyticsAction?: boolean }) {
  const agent = getAgent(agentKey);
  const Icon = agent.icon;
  const { pausedAgents, selectedAnalyticsTab, setPausedAgent } = useAgentUiState();
  const isPaused = Boolean(pausedAgents[agentKey]);
  const displayStatus = isPaused ? 'Paused' : normalizeAgentStatus(agent.status);
  const isAnalyticsAgent = agentKey === 'analytics';
  const activeAnalyticsKey = analyticsResponsibilities.some((responsibility) => responsibility.key === selectedAnalyticsTab)
    ? selectedAnalyticsTab
    : analyticsResponsibilities[0].key;
  const activeResponsibility =
    analyticsResponsibilities.find((responsibility) => responsibility.key === activeAnalyticsKey) ?? analyticsResponsibilities[0];

  return (
    <div className="space-y-6">
      <section className="app-surface card-smooth rounded-lg p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className={`grid size-14 place-items-center rounded-xl ${agent.accent}`}>
              <Icon className="size-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="app-heading text-2xl font-semibold">{agent.name}</h1>
                <AgentStatusBadge status={displayStatus} />
              </div>
              <p className="app-muted mt-1 text-sm">Version {agent.version} · Last activity {agent.lastActivity}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {showServiceAnalyticsAction && !isAnalyticsAgent ? (
              <Link
                href="/analytics/system/rc"
                className="app-button-secondary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
              >
                <BarChart3 className="size-4" /> Service Analytics
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => setPausedAgent(agentKey, (value) => !value)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                isPaused
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50'
                  : 'app-button-secondary'
              }`}
            >
              {isPaused ? <Play className="size-4" /> : <Pause className="size-4" />}
              {isPaused ? 'Resume Agent' : 'Pause Agent'}
            </button>
            <button className="app-button-primary inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold">
              <Terminal className="size-4" /> View Logs
            </button>
          </div>
        </div>

        {!isAnalyticsAgent ? (
          <div className="mt-5 flex gap-2 overflow-x-auto border-t border-[#e6eaf2] pt-4 dark:border-[#263247]">
            {tabs.map((tab) => {
              const active = tab === 'Overview';
              return (
                <button
                  key={tab}
                  type="button"
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium ${
                    active
                      ? 'bg-[#efecff] text-[#4f3ee7] dark:bg-violet-500/15 dark:text-violet-200'
                      : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">{tab}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      {isAnalyticsAgent ? (
        <AnalyticsResponsibilityView responsibility={activeResponsibility} />
      ) : (
        <>
      <section className="grid gap-4 md:grid-cols-4">
        <Metric title="Active Tasks" value={String(agent.activeTasks)} icon={Activity} />
        <Metric title="Success Rate" value={`${agent.successRate}%`} icon={CheckCircle2} />
        <Metric title="Avg. Response Time" value={agent.avgResponseTime} icon={Clock3} />
        <Metric title="Tasks Completed" value={String(agent.tasks)} icon={FileText} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Performance">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summaryTrend}>
                <defs>
                  <linearGradient id="agentPerformance" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6246ea" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#6246ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#6246ea" fill="url(#agentPerformance)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Health Status">
          <div className="space-y-4">
            {['Runtime', 'Queue Depth', 'Memory', 'Provider APIs', 'Event Stream'].map((item, index) => (
              <div key={item} className="app-surface-subtle flex items-center justify-between rounded-lg p-3">
                <span className="app-muted-strong text-sm font-medium">{item}</span>
                <span className={index === 1 && agent.status === 'Degraded' ? 'text-sm font-semibold text-amber-600' : 'text-sm font-semibold text-emerald-600'}>
                  {index === 1 && agent.status === 'Degraded' ? 'Elevated' : 'Healthy'}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Recent Tasks">
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="app-surface-subtle flex items-center justify-between rounded-lg p-3">
                <div>
                  <p className="app-heading text-sm font-medium">{task.title}</p>
                  <p className="app-muted mt-1 font-mono text-xs">{task.id}</p>
                </div>
                <div className="text-right">
                  <p className="app-muted-strong text-sm font-semibold">{task.status}</p>
                  <p className="app-muted mt-1 text-xs">{task.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Resource Usage">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summaryTrend}>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="latency" fill="#f97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </section>
        </>
      )}
    </div>
  );
}

function AnalyticsResponsibilityView({ responsibility }: { responsibility: (typeof analyticsResponsibilities)[number] }) {
  const Icon = responsibility.icon;
  const plan = executionPlanFor(responsibility.key);
  const signalCards = dashboardSignalsFor(responsibility.key);
  const coverageRows = serviceCoverageFor(responsibility.key);
  const insightRows = insightRowsFor(responsibility.key);

  if (responsibility.key === 'system') {
    return <EmbeddedServiceAnalyticsDashboard />;
  }

  if (responsibility.key === 'monitoring') {
    return (
      <div className="space-y-5">
        <FirebaseSignalsPanel />
        <MonitoringAgentControl embedded />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {signalCards.map((metric) => (
          <article key={metric.label} className="app-surface rounded-lg p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="app-muted text-sm font-semibold">{metric.label}</p>
                <p className="mt-3 text-2xl font-semibold text-[#111827] dark:text-slate-100">{metric.value}</p>
                <p className="app-muted mt-1 text-xs">{metric.detail}</p>
              </div>
              <div className={`grid size-10 place-items-center rounded-lg ${metric.tone}`}>
                <metric.icon className="size-5" />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="app-surface card-smooth rounded-lg p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-xl bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                <Icon className="size-7" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-[#111827] dark:text-slate-100">{responsibility.title}</h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      responsibility.status === 'In progress'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                        : 'bg-slate-100 text-[#4f5d73] dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {responsibility.status}
                  </span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4f5d73] dark:text-slate-300">{responsibility.summary}</p>
              </div>
            </div>

            {responsibility.key === 'system' ? (
              <Link href="/analytics/system/rc" className="app-button-secondary inline-flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold">
                <BarChart3 className="size-4" /> Open full RC view
              </Link>
            ) : null}
          </div>

          {responsibility.key === 'system' ? (
            <>
              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#111827] dark:text-slate-100">Service-wise analytics</h3>
                    <p className="app-muted mt-1 text-sm">Front-page signal status for every VehicleInfo service.</p>
                  </div>
                  <span className="rounded-full bg-[#efecff] px-2.5 py-1 text-xs font-semibold text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                    1/5 live
                  </span>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2 2xl:grid-cols-5">
                  {serviceAnalyticsCardsForSystem().map((service) => (
                    <article key={service.name} className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold text-[#111827] dark:text-slate-100">{service.name}</h4>
                          <p className="app-muted mt-1 text-xs">{service.detail}</p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${coverageStatusClass(service.status)}`}>{service.status}</span>
                      </div>
                      <div className="mt-4 grid gap-2">
                        {service.metrics.map((metric) => (
                          <div key={metric.label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="app-muted font-semibold">{metric.label}</span>
                            <span className="font-semibold text-[#111827] dark:text-slate-100">{metric.value}</span>
                          </div>
                        ))}
                      </div>
                      {service.href ? (
                        <Link href={service.href} className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#6246ea] hover:text-[#4f3ee7] dark:text-violet-300 dark:hover:text-violet-200">
                          <BarChart3 className="size-3.5" /> Open RC details
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {['Latency review', 'Capacity scan'].map((action) => {
                  const workbench = actionWorkbenchFor('system', action);
                  return <ActionWorkbenchCard key={action} workbench={workbench} />;
                })}
              </div>
            </>
          ) : (
            <div className="mt-5 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
                <p className="text-xs font-bold uppercase tracking-wide text-[#71809a] dark:text-slate-400">Primary deliverable</p>
                <p className="mt-2 text-sm font-semibold text-[#111827] dark:text-slate-100">{responsibility.output}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                {responsibility.actions.map((action) => (
                  <ActionWorkbenchCard key={action} workbench={actionWorkbenchFor(responsibility.key, action)} compact />
                ))}
              </div>
            </div>
          )}
        </article>

        <article className="app-surface card-smooth rounded-lg p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="app-heading text-base font-semibold">Service Coverage</h2>
              <p className="app-muted mt-1 text-sm">Signals available for this responsibility.</p>
            </div>
            <span className="rounded-full bg-[#efecff] px-2.5 py-1 text-xs font-semibold text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              {coverageRows.filter((item) => item.status === 'Live').length}/{coverageRows.length} live
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {coverageRows.map((service) => (
              <div key={service.name} className="app-surface-subtle flex items-center justify-between gap-3 rounded-lg p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827] dark:text-slate-100">{service.name}</p>
                  <p className="app-muted mt-1 text-xs">{service.detail}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${coverageStatusClass(service.status)}`}>
                  {service.status}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <Panel title="Workstream Activity">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summaryTrend}>
                <defs>
                  <linearGradient id={`analyticsActivity-${responsibility.key}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#6246ea" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#6246ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#6246ea" fill={`url(#analyticsActivity-${responsibility.key})`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Priority Queue">
          <div className="space-y-3">
            {insightRows.map((task) => (
              <div key={task.id} className="app-surface-subtle flex items-center justify-between rounded-lg p-3">
                <div>
                  <p className="app-heading text-sm font-medium">{task.title}</p>
                  <p className="app-muted mt-1 font-mono text-xs">{task.id}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${task.status === 'Failed' ? 'text-red-500' : task.status === 'Running' ? 'text-[#6246ea] dark:text-violet-300' : 'app-muted-strong'}`}>
                    {task.status}
                  </p>
                  <p className="app-muted mt-1 text-xs">{task.duration}</p>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="Delivery Readiness">
          <div className="grid gap-3 sm:grid-cols-2">
            {readinessFor(responsibility.key).map((item) => (
              <div key={item.label} className="app-surface-subtle rounded-lg p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[#4f5d73] dark:text-slate-300">{item.label}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${coverageStatusClass(item.status)}`}>{item.status}</span>
                </div>
                <p className="app-muted mt-2 text-xs leading-5">{item.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Next Actions">
          <div className="grid gap-3 md:grid-cols-3">
            {plan.map((step, index) => (
              <div key={step.title} className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
                <span className="grid size-8 place-items-center rounded-full bg-[#efecff] text-sm font-bold text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                  {index + 1}
                </span>
                <p className="mt-3 text-sm font-semibold text-[#111827] dark:text-slate-100">{step.title}</p>
                <p className="app-muted mt-2 text-xs leading-5">{step.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function AgentNotFound() {
  return (
    <div className="app-surface rounded-lg p-8 text-center">
      <AlertCircle className="mx-auto size-10 text-amber-500" />
      <h1 className="mt-3 text-lg font-semibold">Agent not found</h1>
    </div>
  );
}

type ServiceAnalyticsKey = 'rc' | 'challan' | 'service-history' | 'fastag' | 'payments' | 'webhook';

interface ServiceHealthResponse {
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
  process_uptime_seconds: number | null;
  event_loop_lag_p99_ms: number | null;
  heap_used_bytes: number | null;
  active_handles: number | null;
  generated_at: string;
  missing_metrics: string[];
  raw_prometheus_queries: Record<string, string>;
}

interface FirebaseOverviewResponse {
  config: {
    project_id: string | null;
    ga4_property_id: string | null;
    android_app_id: string | null;
    service_account_configured: boolean;
    missing: string[];
  };
  analytics: {
    project_id: string;
    property_id: string;
    days: number;
    generated_at: string;
    totals: Array<{ name: string; value: number }>;
    daily: Array<{ date: string; metrics: Record<string, number> }>;
    breakdowns: Array<{
      name: string;
      dimension: string;
      rows: Array<{ dimension: string; metrics: Record<string, number> }>;
    }>;
  } | null;
  crashlytics: {
    project_id: string;
    app_id: string;
    generated_at: string;
    reports: Array<{ name: string; display_name: string | null; type: string | null }>;
  } | null;
  errors: string[];
}

const serviceAnalyticsLabels: Record<ServiceAnalyticsKey, string> = {
  rc: 'RC Analytics',
  challan: 'Challan Analytics',
  'service-history': 'Service History Analytics',
  fastag: 'Fastag Analytics',
  payments: 'Payments Analytics',
  webhook: 'Webhook Analytics',
};

const serviceAnalyticsDescriptions: Record<ServiceAnalyticsKey, string> = {
  rc: 'Registration certificate lookups, provider response health, and scrape/API reliability.',
  challan: 'Challan lookup throughput, provider errors, and response latency.',
  'service-history': 'Vehicle service history availability, dependency health, and response timing.',
  fastag: 'Fastag balance, recharge, provider response health, and latency.',
  payments: 'Payment initiation, callback, success rate, timeout, and provider reliability.',
  webhook: 'Webhook ingestion, callback delivery, provider response health, and latency.',
};

const refreshIntervals = [
  { label: '1 min', value: 60_000 },
  { label: '10 min', value: 600_000 },
  { label: '15 min', value: 900_000 },
  { label: '30 min', value: 1_800_000 },
  { label: '1 h', value: 3_600_000 },
  { label: '3 h', value: 10_800_000 },
  { label: '10 h', value: 36_000_000 },
] as const;

const embeddedUnavailable = 'Metric not available from Prometheus';

const embeddedMetricMeta = {
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
  uptime: { label: 'Uptime', icon: Clock3, tone: 'slate' },
  eventLoop: { label: 'Event loop P99', icon: Activity, tone: 'violet' },
  heap: { label: 'Heap used', icon: Database, tone: 'slate' },
  handles: { label: 'Active handles', icon: SlidersHorizontal, tone: 'slate' },
  updated: { label: 'Last updated', icon: Clock3, tone: 'slate' },
} as const;

function FirebaseSignalsPanel() {
  const [overview, setOverview] = useState<FirebaseOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const client = new ApiClient({ baseUrl: window.location.origin });

    setLoading(true);
    setError(null);

    client
      .get<FirebaseOverviewResponse>('/api/analytics-agent/api/v1/firebase/overview?days=7', { cache: 'no-store' })
      .then((payload) => {
        if (!cancelled) {
          setOverview(payload);
        }
      })
      .catch((unknownError) => {
        if (!cancelled) {
          setOverview(null);
          setError(unknownError instanceof Error ? unknownError.message : 'Unable to load Firebase signals.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeUsers = firebaseMetricValue(overview, 'activeUsers');
  const newUsers = firebaseMetricValue(overview, 'newUsers');
  const sessions = firebaseMetricValue(overview, 'sessions');
  const events = firebaseMetricValue(overview, 'eventCount');
  const views = firebaseMetricValue(overview, 'screenPageViews');
  const engagement = firebaseMetricValue(overview, 'userEngagementDuration');
  const activeUsersComparison = firebaseYesterdayComparison(overview, 'activeUsers');
  const newUsersComparison = firebaseYesterdayComparison(overview, 'newUsers');
  const sessionsComparison = firebaseYesterdayComparison(overview, 'sessions');
  const viewsComparison = firebaseYesterdayComparison(overview, 'screenPageViews');
  const eventsComparison = firebaseYesterdayComparison(overview, 'eventCount');
  const engagementComparison = firebaseYesterdayComparison(overview, 'userEngagementDuration');
  const reportsCount = overview?.crashlytics?.reports.length ?? 0;
  const missing = overview?.config.missing ?? [];
  const firebaseErrors = overview?.errors ?? [];
  const breakdowns = overview?.analytics?.breakdowns ?? [];
  const setupMessages = firebaseSetupMessages({ missing, errors: firebaseErrors, error });
  const warningMessages = firebaseWarningMessages(firebaseErrors);
  const needsSetup = setupMessages.length > 0;
  const hasPartialWarning = !needsSetup && warningMessages.length > 0;
  const needsDependencyInstall = setupMessages.some((message) => message.toLowerCase().includes('dependencies'));
  const primaryMetrics = [
    { label: 'Active users', value: formatFirebaseNumber(activeUsers), icon: Activity, comparison: activeUsersComparison },
    { label: 'Sessions', value: formatFirebaseNumber(sessions), icon: Gauge, comparison: sessionsComparison },
    { label: 'Screen views', value: formatFirebaseNumber(views), icon: FileText, comparison: viewsComparison },
    {
      label: 'Crash reports',
      value: overview?.crashlytics ? String(reportsCount) : '--',
      icon: AlertTriangle,
      help: overview?.crashlytics ? undefined : 'Crashlytics API not connected',
    },
  ];
  const secondaryMetrics = [
    { label: 'New users', value: formatFirebaseNumber(newUsers), comparison: newUsersComparison },
    { label: 'Events', value: formatFirebaseNumber(events), comparison: eventsComparison },
    { label: 'Engagement sec', value: formatFirebaseNumber(engagement), comparison: engagementComparison },
  ];

  return (
    <section className="app-surface overflow-hidden rounded-lg">
      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300">
            <Database className="size-6" />
          </div>
          <div>
            <h2 className="app-heading text-lg font-semibold">Firebase App Signals</h2>
            <p className="app-muted mt-1 text-sm">GA4 Analytics and Crashlytics fetched from Firebase for the Android app.</p>
          </div>
        </div>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
            loading
              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              : needsSetup
                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                : hasPartialWarning
                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          }`}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          {loading ? 'Loading' : needsSetup ? 'Setup required' : hasPartialWarning ? 'Partial live' : 'Live'}
        </span>
      </div>

      {needsSetup ? (
        <div className="mx-5 mb-5 grid gap-4 rounded-lg bg-slate-50/80 p-4 ring-1 ring-slate-200/80 dark:bg-slate-950/30 dark:ring-slate-700/60 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="flex gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300">
              <AlertCircle className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="app-heading font-semibold">Connect Firebase before metrics appear</p>
              <p className="app-muted mt-1 text-sm">{setupMessages[0]}</p>
              {needsDependencyInstall ? (
                <code className="mt-3 block overflow-x-auto rounded-md bg-white px-3 py-2 font-mono text-xs font-semibold text-[#4f46e5] ring-1 ring-slate-200 dark:bg-slate-950/60 dark:text-violet-200 dark:ring-slate-700/70">
                  python3 -m pip install -e agents/analytics-agent
                </code>
              ) : null}
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            {['Install Firebase dependencies', 'Configure Firebase env values', 'Restart analytics-agent'].map((item, index) => (
              <div key={item} className="flex items-center gap-3 rounded-md bg-white/70 px-3 py-2 text-[#4f5d73] ring-1 ring-slate-200/70 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700/50">
                <span
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                    index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="font-semibold">{item}</span>
              </div>
            ))}
          </div>
          {setupMessages.length > 1 ? (
            <div className="lg:col-span-2 flex flex-wrap gap-2">
              {setupMessages.slice(1).map((message) => (
                <span key={message} className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-[#66758f] ring-1 ring-slate-200/70 dark:bg-slate-900/50 dark:text-slate-300 dark:ring-slate-700/50">
                  {message}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border-t border-[#e6eaf2] p-5 dark:border-[#263247]">
          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
            {primaryMetrics.map((metric) => (
              <FirebaseMetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                icon={metric.icon}
                comparison={metric.comparison}
                help={metric.help}
              />
            ))}
          </div>

          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)]">
            <article className="app-surface-subtle rounded-lg p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="app-heading text-sm font-semibold">Signal health</h3>
                  <p className="app-muted mt-1 text-xs">
                    {hasPartialWarning ? 'GA4 is live. One Firebase signal needs attention.' : 'GA4 and configured Firebase signals are reachable.'}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span
                    className={`w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
                      hasPartialWarning
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {hasPartialWarning ? 'Action needed' : 'Healthy'}
                  </span>
                  <span className="app-muted text-xs font-semibold">
                    {primaryMetrics.filter((metric) => metric.value !== '--').length + secondaryMetrics.filter((metric) => metric.value !== '--').length} live signals
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {secondaryMetrics.map((metric) => (
                  <FirebaseMiniStat key={metric.label} label={metric.label} value={metric.value} comparison={metric.comparison} />
                ))}
              </div>
            </article>

            {hasPartialWarning ? (
              <div className="rounded-lg bg-amber-50/80 p-3 text-sm text-amber-900 ring-1 ring-amber-200/70 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-400/15">
                <p className="font-semibold">Firebase partial connection</p>
                <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-100/75">{warningMessages[0]}</p>
              </div>
            ) : (
              <article className="app-surface-subtle rounded-lg p-4">
                <p className="app-muted text-xs font-semibold uppercase">Connector status</p>
                <p className="app-heading mt-2 text-sm font-semibold">GA4 stream active</p>
                <p className="app-muted mt-1 text-xs leading-5">Crashlytics data appears when the Firebase API returns reports for this app.</p>
              </article>
            )}
          </div>

          {breakdowns.length ? <FirebaseBreakdownSummary breakdowns={breakdowns} /> : null}
        </div>
      )}
    </section>
  );
}

function FirebaseMetricCard({
  label,
  value,
  icon: Icon,
  comparison,
  help,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
  comparison?: FirebaseMetricComparison | null;
  help?: string;
}) {
  const trendPercent = comparison ? formatFirebaseTrendPercent(comparison) : null;

  return (
    <article className="app-surface-subtle rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="app-muted truncate text-sm font-semibold">{label}</p>
          <p className="app-heading mt-3 text-2xl font-semibold leading-none">
            <FirebaseNumberText value={value} />
          </p>
        </div>
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/30 dark:text-sky-300">
          <Icon className="size-4" />
        </div>
      </div>
      {comparison ? (
        <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-white/60 p-2 ring-1 ring-[#e6eaf2]/70 dark:bg-slate-950/25 dark:ring-[#263247]/80">
          <FirebaseMetricDetail label="Yesterday" value={formatFirebaseNumber(comparison.yesterday)} />
          <FirebaseMetricDetail
            label="Change"
            value={formatFirebaseNumber(comparison.delta)}
            prefix={comparison.delta >= 0 ? '+' : ''}
            tone={comparison.delta >= 0 ? 'positive' : 'negative'}
          />
          <FirebaseMetricDetail
            label="Trend"
            value={trendPercent ?? '--'}
            tone={comparison.delta >= 0 ? 'positive' : 'negative'}
            isText
          />
        </div>
      ) : help ? (
        <p className="app-muted mt-4 rounded-lg bg-white/60 px-3 py-2 text-xs ring-1 ring-[#e6eaf2]/70 dark:bg-slate-950/25 dark:ring-[#263247]/80">{help}</p>
      ) : null}
    </article>
  );
}

function FirebaseMetricDetail({
  label,
  value,
  prefix = '',
  tone = 'muted',
  isText = false,
}: {
  label: string;
  value: string;
  prefix?: string;
  tone?: 'muted' | 'positive' | 'negative';
  isText?: boolean;
}) {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-300'
      : tone === 'negative'
        ? 'text-rose-700 dark:text-rose-300'
        : 'text-[#111827] dark:text-slate-100';

  return (
    <div className="min-w-0">
      <p className="app-muted truncate text-[10px] font-semibold uppercase tracking-wide">{label}</p>
      <p className={`mt-1 truncate text-xs font-semibold ${toneClass}`}>
        {isText ? value : <FirebaseNumberText value={value} prefix={prefix} />}
      </p>
    </div>
  );
}

function FirebaseMiniStat({
  label,
  value,
  comparison,
}: {
  label: string;
  value: string;
  comparison?: FirebaseMetricComparison | null;
}) {
  const trendPercent = comparison ? formatFirebaseTrendPercent(comparison) : null;

  return (
    <div className="rounded-lg bg-white/70 p-3 ring-1 ring-[#e6eaf2] dark:bg-slate-950/30 dark:ring-[#263247]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="app-muted truncate text-xs font-semibold uppercase">{label}</p>
          <p className="app-heading mt-2 text-lg font-semibold leading-none">
            <FirebaseNumberText value={value} />
          </p>
        </div>
        {trendPercent ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              comparison && comparison.delta >= 0
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
            }`}
          >
            {trendPercent}
          </span>
        ) : null}
      </div>
      {comparison ? (
        <p className="app-muted mt-2 truncate text-xs">
          <FirebaseNumberText value={formatFirebaseNumber(comparison.delta)} prefix={comparison.delta >= 0 ? '+' : ''} /> vs yesterday
        </p>
      ) : null}
    </div>
  );
}

function FirebaseBreakdownSummary({
  breakdowns,
}: {
  breakdowns: NonNullable<FirebaseOverviewResponse['analytics']>['breakdowns'];
}) {
  return (
    <article className="app-surface-subtle mt-4 rounded-lg p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="app-heading text-sm font-semibold">App signal breakdown</h3>
          <p className="app-muted text-xs">Top events, screens, app versions, and operating systems in one compact view.</p>
        </div>
        <span className="app-muted text-xs font-semibold">{breakdowns.length} dimensions</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        {breakdowns.slice(0, 4).map((breakdown) => {
          const primaryMetric = preferredFirebaseMetric(breakdown);
          return (
            <div key={breakdown.name} className="rounded-lg bg-white/70 p-3 ring-1 ring-[#e6eaf2] dark:bg-slate-950/30 dark:ring-[#263247]">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#111827] dark:text-slate-100">{breakdown.name}</p>
                  <p className="app-muted mt-0.5 truncate text-xs">{formatFirebaseMetricLabel(primaryMetric)}</p>
                </div>
                <span className="app-muted shrink-0 text-xs">
                  Top {Math.min(3, breakdown.rows.length)} of {breakdown.rows.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {breakdown.rows.length ? (
                  breakdown.rows.slice(0, 3).map((row) => (
                    <div key={`${breakdown.name}-${row.dimension}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-xs">
                      <span className="truncate font-medium text-[#4f5d73] dark:text-slate-300">{row.dimension || '(not set)'}</span>
                      <span className="font-mono font-semibold text-[#111827] dark:text-slate-100">
                        <FirebaseNumberText value={formatFirebaseNumber(row.metrics[primaryMetric] ?? null)} />
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="app-muted text-xs">No rows returned.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function FirebaseBreakdownTable({
  breakdown,
}: {
  breakdown: NonNullable<FirebaseOverviewResponse['analytics']>['breakdowns'][number];
}) {
  const primaryMetric = preferredFirebaseMetric(breakdown);
  const secondaryMetric = secondaryFirebaseMetric(breakdown, primaryMetric);

  return (
    <article className="app-surface-subtle rounded-lg p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="app-heading text-sm font-semibold">{breakdown.name}</h3>
          <p className="app-muted mt-1 text-xs">{breakdown.dimension}</p>
        </div>
        <span className="app-muted text-xs">{breakdown.rows.length} rows</span>
      </div>
      <div className="mt-3 space-y-2">
        {breakdown.rows.length ? (
          breakdown.rows.slice(0, 5).map((row) => (
            <div key={`${breakdown.name}-${row.dimension}`} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md bg-white px-3 py-2 text-sm dark:bg-slate-950/40">
              <span className="truncate font-medium text-[#111827] dark:text-slate-100">{row.dimension || '(not set)'}</span>
              <span className="font-mono text-xs font-semibold text-[#4f5d73] dark:text-slate-300">
                <FirebaseNumberText value={formatFirebaseNumber(row.metrics[primaryMetric] ?? null)} />
              </span>
              {secondaryMetric ? (
                <span className="font-mono text-xs text-[#71809a] dark:text-slate-400">
                  <FirebaseNumberText value={formatFirebaseNumber(row.metrics[secondaryMetric] ?? null)} />
                </span>
              ) : null}
            </div>
          ))
        ) : (
          <p className="app-muted rounded-md bg-white px-3 py-2 text-sm dark:bg-slate-950/40">No rows returned.</p>
        )}
      </div>
      {primaryMetric ? (
        <p className="app-muted mt-3 text-xs">
          Primary: {formatFirebaseMetricLabel(primaryMetric)}
          {secondaryMetric ? ` · Secondary: ${formatFirebaseMetricLabel(secondaryMetric)}` : ''}
        </p>
      ) : null}
    </article>
  );
}

function firebaseMetricValue(overview: FirebaseOverviewResponse | null, name: string): number | null {
  return overview?.analytics?.totals.find((metric) => metric.name === name)?.value ?? null;
}

type FirebaseMetricComparison = {
  today: number;
  yesterday: number;
  delta: number;
};

function firebaseYesterdayComparison(overview: FirebaseOverviewResponse | null, metricName: string): FirebaseMetricComparison | null {
  const daily = overview?.analytics?.daily ?? [];
  if (daily.length < 2) {
    return null;
  }

  const today = daily[daily.length - 1]?.metrics[metricName];
  const yesterday = daily[daily.length - 2]?.metrics[metricName];
  if (today === undefined || yesterday === undefined) {
    return null;
  }

  return {
    today,
    yesterday,
    delta: today - yesterday,
  };
}

function preferredFirebaseMetric(breakdown: NonNullable<FirebaseOverviewResponse['analytics']>['breakdowns'][number]) {
  const firstRow = breakdown.rows[0];
  if (!firstRow) {
    return 'activeUsers';
  }
  const metricNames = Object.keys(firstRow.metrics);
  return ['eventCount', 'screenPageViews', 'activeUsers', 'sessions', 'newUsers'].find((metric) => metricNames.includes(metric)) ?? metricNames[0] ?? 'activeUsers';
}

function secondaryFirebaseMetric(
  breakdown: NonNullable<FirebaseOverviewResponse['analytics']>['breakdowns'][number],
  primaryMetric: string,
) {
  const metricNames = Object.keys(breakdown.rows[0]?.metrics ?? {});
  return metricNames.find((metric) => metric !== primaryMetric) ?? null;
}

function formatFirebaseMetricLabel(metric: string) {
  const labels: Record<string, string> = {
    activeUsers: 'Active users',
    newUsers: 'New users',
    sessions: 'Sessions',
    screenPageViews: 'Screen views',
    eventCount: 'Events',
    userEngagementDuration: 'Engagement sec',
  };
  return labels[metric] ?? metric;
}

function formatFirebaseTrendPercent(comparison: FirebaseMetricComparison) {
  if (comparison.yesterday === 0) {
    return comparison.delta === 0 ? '0%' : comparison.delta > 0 ? '+100%' : '-100%';
  }

  const percent = (comparison.delta / comparison.yesterday) * 100;
  return `${percent >= 0 ? '+' : ''}${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: Math.abs(percent) < 10 ? 1 : 0,
  }).format(percent)}%`;
}

function formatFirebaseNumber(value: number | null) {
  if (value === null) {
    return '--';
  }
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function FirebaseNumberText({
  value,
  prefix = '',
}: {
  value: string;
  prefix?: string;
}) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    left: number;
    top: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const numericValue = parseFirebaseNumber(value);
  const tooltip =
    numericValue !== null && Math.abs(numericValue) >= 100000
      ? indianNumberToWords(numericValue)
      : null;
  const updateTooltipPosition = useCallback(() => {
    const element = triggerRef.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    const tooltipHalfWidth = Math.min(176, Math.max(120, (window.innerWidth - 24) / 2));
    const centeredLeft = rect.left + rect.width / 2;
    const left = Math.min(Math.max(centeredLeft, tooltipHalfWidth + 12), window.innerWidth - tooltipHalfWidth - 12);
    const hasTopSpace = rect.top > 72;

    setTooltipPosition({
      left,
      top: hasTopSpace ? rect.top - 10 : rect.bottom + 10,
      placement: hasTopSpace ? 'top' : 'bottom',
    });
  }, []);

  useEffect(() => {
    if (!tooltipPosition) {
      return;
    }

    window.addEventListener('resize', updateTooltipPosition);
    window.addEventListener('scroll', updateTooltipPosition, true);

    return () => {
      window.removeEventListener('resize', updateTooltipPosition);
      window.removeEventListener('scroll', updateTooltipPosition, true);
    };
  }, [tooltipPosition, updateTooltipPosition]);

  if (!tooltip) {
    return (
      <>
        {prefix}
        {value}
      </>
    );
  }

  return (
    <>
      <span
        ref={triggerRef}
        className="cursor-help rounded-sm outline-none transition-colors duration-200 ease-out hover:text-violet-700 focus-visible:text-violet-700 focus-visible:ring-2 focus-visible:ring-violet-500/40 dark:hover:text-violet-200 dark:focus-visible:text-violet-200"
        tabIndex={0}
        aria-label={`${prefix}${value}: ${tooltip}`}
        onBlur={() => setTooltipPosition(null)}
        onFocus={updateTooltipPosition}
        onMouseEnter={updateTooltipPosition}
        onMouseLeave={() => setTooltipPosition(null)}
      >
        {prefix}
        {value}
      </span>
      {tooltipPosition
        ? createPortal(
            <span
              role="tooltip"
              className={`pointer-events-none fixed z-[9999] w-max max-w-[17rem] -translate-x-1/2 rounded-md border border-[#e6eaf2]/80 bg-white px-3 py-2 text-left shadow-lg shadow-slate-950/10 dark:border-[#263247]/80 dark:bg-[#0f172a] dark:shadow-black/30 ${
                tooltipPosition.placement === 'top' ? '-translate-y-full' : ''
              }`}
              style={{ left: tooltipPosition.left, top: tooltipPosition.top }}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-wide text-[#71809a] dark:text-slate-500">
                In words
              </span>
              <span className="mt-0.5 block text-xs font-semibold leading-5 text-[#111827] dark:text-slate-100">
                {tooltip}
              </span>
              <span
                className={`absolute left-1/2 size-2 -translate-x-1/2 rotate-45 border-[#e6eaf2]/80 bg-white dark:border-[#263247]/80 dark:bg-[#0f172a] ${
                  tooltipPosition.placement === 'top'
                    ? '-bottom-1 border-b border-r'
                    : '-top-1 border-l border-t'
                }`}
              />
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

function parseFirebaseNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim();
  if (!normalized || normalized === '--') {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function indianNumberToWords(value: number): string {
  const absoluteValue = Math.trunc(Math.abs(value));
  if (absoluteValue === 0) {
    return 'Zero';
  }

  const groups = [
    { amount: 10000000, label: 'Crore' },
    { amount: 100000, label: 'Lakh' },
    { amount: 1000, label: 'Thousand' },
  ];
  const words: string[] = [];
  let remainder = absoluteValue;

  groups.forEach(({ amount, label }) => {
    const count = Math.floor(remainder / amount);
    if (count > 0) {
      words.push(`${numberBelowThousandToWords(count)} ${label}`);
      remainder %= amount;
    }
  });

  if (remainder > 0) {
    words.push(numberBelowThousandToWords(remainder));
  }

  return `${value < 0 ? 'Minus ' : ''}${words.join(', ')}`;
}

function numberBelowThousandToWords(value: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (value < 10) {
    return ones[value];
  }

  if (value < 20) {
    return teens[value - 10];
  }

  if (value < 100) {
    return [tens[Math.floor(value / 10)], ones[value % 10]].filter(Boolean).join(' ');
  }

  return [ones[Math.floor(value / 100)], 'Hundred', numberBelowThousandToWords(value % 100)]
    .filter(Boolean)
    .join(' ');
}

function firebaseSetupMessages({
  missing,
  errors,
  error,
}: {
  missing: string[];
  errors: string[];
  error: string | null;
}) {
  const messages = new Set<string>();

  if (error) {
    messages.add('Analytics Agent is unavailable. Start the analytics-agent service and retry.');
  }

  if (missing.length) {
    messages.add(`Configure Firebase env values: ${missing.join(', ')}.`);
  }

  if (errors.some((item) => item.includes('dependencies are not installed') || item.includes('google-auth'))) {
    messages.add('Install analytics-agent Firebase dependencies, then restart the agent.');
  }

  if (errors.some((item) => item.includes('GOOGLE_APPLICATION_CREDENTIALS file not found'))) {
    messages.add('Point GOOGLE_APPLICATION_CREDENTIALS to a readable Firebase service account JSON file.');
  }

  if (errors.some((item) => item.includes('GOOGLE_APPLICATION_CREDENTIALS is not configured'))) {
    messages.add('Configure GOOGLE_APPLICATION_CREDENTIALS for Firebase API access.');
  }

  return [...messages];
}

function firebaseWarningMessages(errors: string[]) {
  const messages = new Set<string>();

  errors.forEach((item) => {
    if (item.includes('firebasecrashlytics.googleapis.com') && item.includes('disabled')) {
      messages.add('Enable the Firebase Crashlytics API for this Firebase project to load crash reports.');
      return;
    }

    if (item.includes('PERMISSION_DENIED') || item.includes(' 403 ')) {
      messages.add('Firebase API permission denied. Check the service account roles and enabled APIs.');
      return;
    }

    messages.add(item.replace(/^(Analytics|Crashlytics):\s*/, ''));
  });

  return [...messages];
}

function EmbeddedServiceAnalyticsDashboard() {
  const [serviceKey, setServiceKey] = useState<ServiceAnalyticsKey>('rc');
  const [health, setHealth] = useState<ServiceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalMs, setRefreshIntervalMs] = useState<(typeof refreshIntervals)[number]['value']>(refreshIntervals[0].value);
  const requestIdRef = useRef(0);
  const serviceTabListRef = useRef<HTMLElement | null>(null);
  const serviceTabRefs = useRef<Partial<Record<ServiceAnalyticsKey, HTMLButtonElement | null>>>({});
  const [activeTabIndicator, setActiveTabIndicator] = useState({ left: 0, top: 0, width: 0, height: 0, ready: false });

  const loadHealth = useCallback(
    async ({ showInitialLoader = false }: { showInitialLoader?: boolean } = {}) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;
      const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });

      if (showInitialLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const payload = await client.get<ServiceHealthResponse>(`/api/analytics/system/${serviceKey}/health`, { cache: 'no-store' });
        if (requestId === requestIdRef.current) {
          setHealth(payload);
        }
      } catch (unknownError) {
        if (requestId === requestIdRef.current) {
          setHealth(null);
          setError(unknownError instanceof Error ? unknownError.message : 'Unable to load service analytics.');
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [serviceKey],
  );

  useEffect(() => {
    loadHealth({ showInitialLoader: true });
  }, [loadHealth]);

  useEffect(() => {
    if (!autoRefreshEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      loadHealth();
    }, refreshIntervalMs);

    return () => window.clearInterval(intervalId);
  }, [autoRefreshEnabled, loadHealth, refreshIntervalMs]);

  useEffect(() => {
    function updateActiveTabIndicator() {
      const activeTab = serviceTabRefs.current[serviceKey];
      const tabList = serviceTabListRef.current;

      if (!activeTab || !tabList) {
        return;
      }

      setActiveTabIndicator({
        left: activeTab.offsetLeft,
        top: activeTab.offsetTop,
        width: activeTab.offsetWidth,
        height: activeTab.offsetHeight,
        ready: true,
      });
    }

    updateActiveTabIndicator();
    const animationFrameId = window.requestAnimationFrame(updateActiveTabIndicator);
    const resizeObserver = new ResizeObserver(updateActiveTabIndicator);
    if (serviceTabListRef.current) {
      resizeObserver.observe(serviceTabListRef.current);
    }
    window.addEventListener('resize', updateActiveTabIndicator);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateActiveTabIndicator);
    };
  }, [serviceKey]);

  const missingCount = health?.missing_metrics.length ?? 0;
  const metricCards = buildEmbeddedMetricCards(serviceKey, health);
  const availableCount = metricCards.filter((card) => card.value !== null).length;
  const totalSignals = metricCards.length;
  return (
    <div className="space-y-5">
      <section className="app-surface overflow-hidden rounded-lg">
        <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              <Server className="size-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#6246ea] dark:text-violet-300">Service Analytics</p>
              <h2 className="mt-1 text-2xl font-semibold text-[#111827] dark:text-slate-50">{serviceAnalyticsLabels[serviceKey]}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-[#71809a] dark:text-slate-400">
                {serviceAnalyticsDescriptions[serviceKey]}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-6 lg:ml-auto lg:items-end">
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <span className="inline-flex h-8 items-center text-sm font-semibold text-[#71809a] dark:text-slate-400">
                {availableCount}/{totalSignals} signals
              </span>
              {loading ? (
                <span className="inline-flex h-8 items-center gap-2 rounded-lg border border-[#e1e6ef] bg-[#f8faff] px-3 text-sm font-medium text-[#4f5d73] dark:border-[#263247] dark:bg-slate-800 dark:text-slate-300">
                  <Loader2 className="size-4 animate-spin" /> Loading
                </span>
              ) : (
                <EmbeddedStatusBadge status={health?.status ?? 'unknown'} />
              )}
            </div>

            <div className="inline-flex h-8 max-w-full items-center gap-1 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-0.5 dark:border-[#263247] dark:bg-[#0f172a]">
              <span className="grid size-7 shrink-0 place-items-center text-[#71809a] dark:text-slate-500" aria-label="Auto refresh">
                {refreshing ? <Loader2 className="size-3.5 animate-spin text-[#6246ea] dark:text-violet-300" /> : <Clock3 className="size-3.5" />}
              </span>
              <button
                type="button"
                onClick={() => {
                  const nextEnabled = !autoRefreshEnabled;
                  setAutoRefreshEnabled(nextEnabled);
                  if (nextEnabled) {
                    void loadHealth();
                  }
                }}
                className={`inline-flex h-7 min-w-16 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold smooth-transition ${
                  autoRefreshEnabled
                    ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15'
                    : 'bg-[#6246ea] text-white hover:bg-[#5438d9] dark:bg-violet-600 dark:hover:bg-violet-500'
                }`}
              >
                {autoRefreshEnabled ? <Pause className="size-3" /> : <Play className="size-3" />}
                {autoRefreshEnabled ? 'Stop' : 'Start'}
              </button>

              <select
                value={refreshIntervalMs}
                onChange={(event) => setRefreshIntervalMs(Number(event.target.value) as (typeof refreshIntervals)[number]['value'])}
                disabled={!autoRefreshEnabled}
                aria-label="Refresh interval"
                className="h-7 min-w-20 rounded-md border border-transparent bg-white px-2 text-xs font-semibold text-[#4f5d73] outline-none smooth-transition disabled:cursor-not-allowed disabled:bg-transparent disabled:text-[#8b98ad] dark:bg-[#111827] dark:text-slate-300 dark:disabled:bg-transparent dark:disabled:text-slate-500"
              >
                {refreshIntervals.map((option) => {
                  return (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <nav ref={serviceTabListRef} className="relative flex flex-wrap gap-2 border-t border-[#e6eaf2] px-5 py-4 dark:border-[#263247]">
          <span
            aria-hidden="true"
            className={`absolute rounded-lg bg-[#efecff] transition-[left,top,width,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[left,top,width,height] dark:bg-violet-500/15 ${
              activeTabIndicator.ready ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              left: activeTabIndicator.left,
              top: activeTabIndicator.top,
              width: activeTabIndicator.width,
              height: activeTabIndicator.height,
            }}
          />
          {Object.entries(serviceAnalyticsLabels).map(([key, label]) => (
            <button
              key={key}
              ref={(node) => {
                serviceTabRefs.current[key as ServiceAnalyticsKey] = node;
              }}
              type="button"
              onClick={() => setServiceKey(key as ServiceAnalyticsKey)}
              className={`relative z-10 rounded-lg px-3 py-2 text-sm font-medium smooth-transition ${
                key === serviceKey
                  ? 'text-[#4f3ee7] dark:text-violet-200'
                  : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10 dark:hover:text-violet-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </section>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => (
          <EmbeddedMetricCard key={card.key} loading={loading} meta={card.meta} value={card.value} suffix={card.suffix} helper={card.helper} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="app-surface card-smooth rounded-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">Signal coverage</h2>
              <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">
                {missingCount ? `${missingCount} metrics still unavailable from Prometheus.` : 'All expected metrics are available.'}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              <Database className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#71809a] dark:text-slate-400">
                <Loader2 className="size-4 animate-spin text-[#6246ea]" /> Loading coverage...
              </div>
            ) : health?.missing_metrics.length ? (
              <ul className="space-y-2 text-sm text-[#4f5d73] dark:text-slate-300">
                {health.missing_metrics.map((metric) => (
                  <li key={metric} className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 dark:border-[#263247] dark:bg-[#0f172a]">
                    <span className="font-semibold text-[#111827] dark:text-slate-100">{metric}</span>
                    <span className="ml-2 text-[#71809a] dark:text-slate-400">{embeddedUnavailable}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{health ? 'No missing metrics reported.' : embeddedUnavailable}</p>
            )}
          </div>
        </article>

        <article className="app-surface card-smooth rounded-lg p-5">
          <div>
            <h2 className="text-base font-semibold text-[#111827] dark:text-slate-50">Prometheus queries</h2>
            <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Raw PromQL used by the analytics agent for this service.</p>
          </div>
          <div className="mt-4 max-h-96 overflow-auto rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[#71809a] dark:text-slate-400">
                <Loader2 className="size-4 animate-spin text-[#6246ea]" /> Loading queries...
              </div>
            ) : health ? (
              <dl className="space-y-3 text-sm">
                {Object.entries(health.raw_prometheus_queries).map(([name, query]) => (
                  <div key={name} className="rounded-lg bg-white p-3 dark:bg-[#111827]">
                    <dt className="font-semibold text-[#111827] dark:text-slate-100">{name}</dt>
                    <dd className="mt-1 break-words font-mono text-xs text-[#4f5d73] dark:text-slate-400">{query}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-[#4f5d73] dark:text-slate-400">{embeddedUnavailable}</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function EmbeddedMetricCard({
  loading,
  meta,
  value,
  suffix,
  helper,
}: {
  loading: boolean;
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
    <article className="app-surface card-smooth min-h-36 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#71809a] dark:text-slate-400">{meta.label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-4 space-y-3" aria-label={`Loading ${meta.label}`}>
          <div className="skeleton h-8 w-28" />
          <div className="skeleton h-3 w-36" />
        </div>
      ) : value ? (
        <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-50">
          {value}
          {suffix ? <span className="ml-1 text-sm font-medium text-[#71809a] dark:text-slate-400">{suffix}</span> : null}
        </p>
      ) : (
        <p className="mt-4 text-sm leading-6 text-[#4f5d73] dark:text-slate-400">{embeddedUnavailable}</p>
      )}
      <p className="mt-3 text-xs font-medium text-[#71809a] dark:text-slate-500">{helper}</p>
    </article>
  );
}

type EmbeddedMetricCardConfig = {
  key: string;
  meta: { label: string; icon: typeof Activity; tone: 'violet' | 'red' | 'amber' | 'slate' };
  value: string | null;
  suffix?: string;
  helper: string;
};

function buildEmbeddedMetricCards(serviceKey: ServiceAnalyticsKey, health: ServiceHealthResponse | null): EmbeddedMetricCardConfig[] {
  const commonCards: EmbeddedMetricCardConfig[] = [
    { key: 'request_rate', meta: embeddedMetricMeta.requestRate, value: formatEmbeddedNumber(health?.request_rate), suffix: 'req/s', helper: '5m rolling rate' },
    { key: 'error_rate', meta: embeddedMetricMeta.errorRate, value: formatEmbeddedPercent(health?.error_rate), helper: 'HTTP 5xx rate' },
    { key: 'p95_latency_ms', meta: embeddedMetricMeta.p95, value: formatEmbeddedNumber(health?.p95_latency_ms), suffix: 'ms', helper: 'User-facing tail latency' },
    { key: 'p99_latency_ms', meta: embeddedMetricMeta.p99, value: formatEmbeddedNumber(health?.p99_latency_ms), suffix: 'ms', helper: 'Worst-case request latency' },
    { key: 'p50_latency_ms', meta: embeddedMetricMeta.p50, value: formatEmbeddedNumber(health?.p50_latency_ms), suffix: 'ms', helper: 'Median response time' },
    { key: 'p90_latency_ms', meta: embeddedMetricMeta.p90, value: formatEmbeddedNumber(health?.p90_latency_ms), suffix: 'ms', helper: 'High percentile trend' },
    { key: 'cpu_usage', meta: embeddedMetricMeta.cpu, value: formatEmbeddedNumber(health?.cpu_usage), suffix: 'cores', helper: 'Runtime CPU usage' },
    { key: 'memory_usage_bytes', meta: embeddedMetricMeta.memory, value: formatEmbeddedBytes(health?.memory_usage_bytes), helper: 'Resident memory usage' },
  ];

  if (serviceKey === 'webhook') {
    return [
      ...commonCards,
      { key: 'event_loop_lag_p99_ms', meta: embeddedMetricMeta.eventLoop, value: formatEmbeddedNumber(health?.event_loop_lag_p99_ms), suffix: 'ms', helper: 'Node.js event loop delay' },
      { key: 'heap_used_bytes', meta: embeddedMetricMeta.heap, value: formatEmbeddedBytes(health?.heap_used_bytes), helper: 'Node.js heap memory used' },
      { key: 'active_handles', meta: embeddedMetricMeta.handles, value: formatEmbeddedNumber(health?.active_handles), helper: 'Open Node.js handles' },
      { key: 'process_uptime_seconds', meta: embeddedMetricMeta.uptime, value: formatEmbeddedDuration(health?.process_uptime_seconds), helper: 'Process uptime' },
      { key: 'updated', meta: embeddedMetricMeta.updated, value: health ? formatEmbeddedDate(health.generated_at) : null, helper: 'Prometheus scrape timestamp' },
    ];
  }

  return [
    ...commonCards,
    { key: 'pod_restarts_15m', meta: embeddedMetricMeta.restarts, value: formatEmbeddedNumber(health?.pod_restarts_15m), suffix: '15m', helper: 'Recent pod stability' },
    { key: 'provider_p95_latency_ms', meta: embeddedMetricMeta.providerLatency, value: formatEmbeddedNumber(health?.provider_p95_latency_ms), suffix: 'ms p95', helper: 'External provider latency' },
    { key: 'provider_error_rate', meta: embeddedMetricMeta.providerError, value: formatEmbeddedPercent(health?.provider_error_rate), helper: 'External provider failure rate' },
    { key: 'updated', meta: embeddedMetricMeta.updated, value: health ? formatEmbeddedDate(health.generated_at) : null, helper: 'Prometheus scrape timestamp' },
  ];
}

function EmbeddedStatusBadge({ status }: { status: ServiceHealthResponse['status'] }) {
  const label = status === 'unknown' ? 'Checking' : status;
  const className = {
    healthy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    degraded: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    critical: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    unknown: 'bg-[#f8faff] text-[#4f5d73] dark:bg-slate-800 dark:text-slate-300',
  }[status];

  return <span className={`w-fit rounded px-3 py-1 text-sm font-medium capitalize ${className}`}>{label}</span>;
}

function formatEmbeddedNumber(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(value);
}

function formatEmbeddedPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2, style: 'percent' }).format(value);
}

function formatEmbeddedBytes(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Intl.NumberFormat('en', { maximumFractionDigits: 2, style: 'unit', unit: 'megabyte' }).format(value / 1024 / 1024);
}

function formatEmbeddedDuration(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const days = Math.floor(value / 86400);
  const hours = Math.floor((value % 86400) / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatEmbeddedDate(value: string): string {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(new Date(value));
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: typeof Activity }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="app-surface card-smooth rounded-lg p-5"
    >
      <div className="flex items-center justify-between">
        <p className="app-muted text-sm font-medium">{title}</p>
        <Icon className="size-5 text-[#6246ea]" />
      </div>
      <p className="mt-4 text-2xl font-semibold">{value}</p>
    </motion.article>
  );
}

function executionPlanFor(key: string) {
  const plans: Record<string, Array<{ title: string; detail: string }>> = {
    system: [
      { title: 'Connect service signals', detail: 'Keep RC live and add challan, service history, fastag, and payments Prometheus endpoints.' },
      { title: 'Define health thresholds', detail: 'Set request rate, error rate, latency, CPU, memory, and provider failure thresholds per service.' },
      { title: 'Publish daily health summary', detail: 'Generate a concise operational report with bottlenecks and optimization recommendations.' },
    ],
    business: [
      { title: 'Select KPI sources', detail: 'Map revenue, payment, funnel, and retention events to a trusted analytics source.' },
      { title: 'Create baseline dashboards', detail: 'Define executive metrics, trend windows, and forecast inputs.' },
      { title: 'Rank growth opportunities', detail: 'Score opportunities by user impact, revenue potential, and implementation effort.' },
    ],
    monitoring: [
      { title: 'Inventory alert conditions', detail: 'List agent failure, API degradation, security anomaly, and error-pattern conditions.' },
      { title: 'Tune alert severity', detail: 'Separate warning, degraded, and critical paths to reduce noisy alerts.' },
      { title: 'Route incident ownership', detail: 'Attach each alert family to an owner, escalation path, and response playbook.' },
    ],
    decision: [
      { title: 'Define decision criteria', detail: 'Set impact, urgency, confidence, cost, and risk dimensions for scoring.' },
      { title: 'Create recommendation queue', detail: 'Convert analytics findings into ranked actions for operators and product teams.' },
      { title: 'Track decision outcomes', detail: 'Measure whether accepted recommendations improved reliability, revenue, or cycle time.' },
    ],
  };

  return plans[key] ?? plans.system;
}

function dashboardSignalsFor(key: string) {
  const commonTone = 'bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200';
  const successTone = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300';
  const warningTone = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300';

  const signals: Record<string, Array<{ label: string; value: string; detail: string; icon: typeof Activity; tone: string }>> = {
    system: [
      { label: 'Signal coverage', value: 'RC live', detail: 'Fallback scrape available', icon: CheckCircle2, tone: successTone },
      { label: 'P95 target', value: '< 800ms', detail: 'Service-level latency guardrail', icon: Activity, tone: commonTone },
      { label: 'Open reviews', value: '3', detail: 'Latency, capacity, providers', icon: FileText, tone: commonTone },
      { label: 'Health report', value: 'Daily', detail: 'Operational summary cadence', icon: Clock3, tone: warningTone },
    ],
    business: [
      { label: 'KPI coverage', value: 'Draft', detail: 'Revenue and funnel mapping', icon: TrendingUp, tone: commonTone },
      { label: 'Forecast model', value: 'Pending', detail: 'Needs payment and retention data', icon: BarChart3, tone: warningTone },
      { label: 'Segments', value: '0', detail: 'No production cohorts connected', icon: Radar, tone: commonTone },
      { label: 'Report cadence', value: 'Weekly', detail: 'Executive summary target', icon: FileText, tone: successTone },
    ],
    monitoring: [
      { label: 'Rules', value: '8', detail: 'CloudWatch monitor inventory', icon: ShieldAlert, tone: commonTone },
      { label: 'Incidents', value: '2', detail: 'Requires severity tuning', icon: AlertCircle, tone: warningTone },
      { label: 'SLO state', value: 'Draft', detail: 'Service ownership pending', icon: CheckCircle2, tone: commonTone },
      { label: 'Run mode', value: 'Manual', detail: 'Start monitor when ready', icon: Terminal, tone: successTone },
    ],
    decision: [
      { label: 'Recommendations', value: '0', detail: 'Decision queue not published', icon: Radar, tone: commonTone },
      { label: 'Scoring model', value: 'Draft', detail: 'Impact and confidence criteria', icon: SlidersHorizontal, tone: warningTone },
      { label: 'Risk inputs', value: '4', detail: 'Reliability, cost, latency, volume', icon: ShieldAlert, tone: commonTone },
      { label: 'Review cadence', value: 'Daily', detail: 'Ops decision summary target', icon: CheckCircle2, tone: successTone },
    ],
  };

  return signals[key] ?? signals.system;
}

function serviceCoverageFor(key: string) {
  const coverage: Record<string, Array<{ name: string; detail: string; status: 'Live' | 'Pending' | 'Draft' }>> = {
    system: [
      { name: 'RC Service', detail: 'Prometheus metrics connected to RC service scrape', status: 'Live' },
      { name: 'Challan Service', detail: 'Awaiting metrics route', status: 'Pending' },
      { name: 'Service History Service', detail: 'Awaiting metrics route', status: 'Pending' },
      { name: 'Fastag Service', detail: 'Awaiting metrics route', status: 'Pending' },
      { name: 'Payments Service', detail: 'Awaiting metrics route', status: 'Pending' },
    ],
    monitoring: [
      { name: 'CloudWatch Logs', detail: 'Manual monitor control available', status: 'Live' },
      { name: 'Alert Rules', detail: 'Rule inventory needs final thresholds', status: 'Draft' },
      { name: 'Incident Feed', detail: 'Ownership routing pending', status: 'Pending' },
    ],
  };

  return coverage[key] ?? [
    { name: 'VehicleInfo Core', detail: 'Source mapping required', status: 'Draft' },
    { name: 'RC Service', detail: 'Available as first production signal', status: 'Live' },
    { name: 'Payments Service', detail: 'Awaiting source contract', status: 'Pending' },
    { name: 'Provider APIs', detail: 'External dependency data pending', status: 'Pending' },
  ];
}

function insightRowsFor(key: string) {
  const rows: Record<string, typeof recentTasks> = {
    system: recentTasks,
    monitoring: [
      { id: 'mon_2108', title: 'CloudWatch log group onboarding', status: 'Running', duration: '15s' },
      { id: 'mon_2104', title: 'Alert severity review', status: 'Pending', duration: 'Queued' },
      { id: 'mon_2099', title: 'Incident ownership mapping', status: 'Pending', duration: 'Queued' },
    ],
    business: [
      { id: 'biz_1204', title: 'Revenue KPI source mapping', status: 'Pending', duration: 'Queued' },
      { id: 'biz_1198', title: 'Payment funnel baseline', status: 'Pending', duration: 'Queued' },
      { id: 'biz_1181', title: 'Retention cohort definition', status: 'Pending', duration: 'Queued' },
    ],
  };

  return rows[key] ?? [
    { id: `${key}_001`, title: 'Signal contract definition', status: 'Pending', duration: 'Queued' },
    { id: `${key}_002`, title: 'Baseline workflow design', status: 'Pending', duration: 'Queued' },
    { id: `${key}_003`, title: 'Output template review', status: 'Pending', duration: 'Queued' },
  ];
}

function readinessFor(key: string) {
  const items: Record<string, Array<{ label: string; detail: string; status: 'Live' | 'Ready' | 'Pending' | 'Draft' }>> = {
    system: [
      { label: 'Prometheus signal coverage', detail: 'RC metrics are available; remaining service routes can be attached next.', status: 'Ready' },
      { label: 'Health report template', detail: 'Daily reliability and bottleneck summary shape is defined.', status: 'Ready' },
      { label: 'Threshold policy', detail: 'Latency, error rate, CPU, memory, and provider thresholds need final values.', status: 'Draft' },
      { label: 'Service rollout', detail: 'Challan, service history, fastag, and payments metrics still need endpoints.', status: 'Pending' },
    ],
  };

  return items[key] ?? [
    { label: 'Source contracts', detail: 'Input datasets and ownership need confirmation.', status: 'Draft' },
    { label: 'Workflow template', detail: 'Output structure is planned but not automated.', status: 'Pending' },
    { label: 'Review path', detail: 'Approver and cadence need assignment.', status: 'Pending' },
    { label: 'Production handoff', detail: 'No production delivery artifact published yet.', status: 'Pending' },
  ];
}

function serviceAnalyticsCardsForSystem() {
  return [
    {
      name: 'RC Analytics',
      status: 'Live',
      detail: 'Registration certificate lookups and provider reliability.',
      href: '/analytics/system/rc',
      metrics: [
        { label: 'Request rate', value: '0.13 req/s' },
        { label: 'P95 latency', value: '49.8 ms' },
        { label: 'Signals', value: '5/11' },
      ],
    },
    {
      name: 'Challan Analytics',
      status: 'Pending',
      detail: 'Traffic challan lookup health and provider failure tracking.',
      metrics: [
        { label: 'Request rate', value: 'Awaiting URL' },
        { label: 'Latency', value: 'Pending' },
        { label: 'Signals', value: '0/11' },
      ],
    },
    {
      name: 'Service History Analytics',
      status: 'Pending',
      detail: 'Vehicle service history lookup latency and data freshness.',
      metrics: [
        { label: 'Request rate', value: 'Awaiting URL' },
        { label: 'Latency', value: 'Pending' },
        { label: 'Signals', value: '0/11' },
      ],
    },
    {
      name: 'Fastag Analytics',
      status: 'Pending',
      detail: 'Fastag balance, recharge, and provider response health.',
      metrics: [
        { label: 'Request rate', value: 'Awaiting URL' },
        { label: 'Latency', value: 'Pending' },
        { label: 'Signals', value: '0/11' },
      ],
    },
    {
      name: 'Payments Analytics',
      status: 'Pending',
      detail: 'Payment initiation, callback, success rate, and timeout health.',
      metrics: [
        { label: 'Success rate', value: 'Awaiting URL' },
        { label: 'Latency', value: 'Pending' },
        { label: 'Signals', value: '0/11' },
      ],
    },
  ];
}

function actionWorkbenchFor(key: string, action: string) {
  type Workbench = {
    title: string;
    status: 'Live' | 'Ready' | 'Pending' | 'Draft';
    description: string;
    stats: Array<{ label: string; value: string }>;
    steps: string[];
    href?: string;
    cta?: string;
  };

  const system: Record<string, Workbench> = {
    'Service analytics': {
      title: 'RC service signal cockpit',
      status: 'Live',
      description: 'Prometheus-backed service health is available inline here for quick review. Open the full view only when you need raw queries and deeper metric coverage.',
      stats: [
        { label: 'Request rate', value: '0.13 req/s' },
        { label: 'P95 latency', value: '49.8 ms' },
        { label: 'Coverage', value: '5/11 signals' },
      ],
      steps: ['Keep RC metrics isolated to the RC service scrape.', 'Add challan, service history, fastag, payments, and webhook metric URLs.', 'Promote missing signals as each service exposes Prometheus metrics.'],
      href: '/analytics/system/rc',
      cta: 'Open full service analytics',
    },
    'Latency review': {
      title: 'Latency review board',
      status: 'Ready',
      description: 'Tracks user-facing latency percentiles and provider fanout risk so the team can detect slowdowns before they become incidents.',
      stats: [
        { label: 'P50', value: '26.2 ms' },
        { label: 'P90', value: '47.2 ms' },
        { label: 'P99', value: '89.2 ms' },
      ],
      steps: ['Compare p95 and p99 against service thresholds.', 'Separate internal API time from external provider latency.', 'Flag sustained regressions into the priority queue.'],
    },
    'Capacity scan': {
      title: 'Capacity and stability scan',
      status: 'Draft',
      description: 'Prepares runtime capacity checks for CPU, memory, restarts, and queue pressure once each service exposes infrastructure metrics.',
      stats: [
        { label: 'CPU', value: 'Pending' },
        { label: 'Memory', value: 'Pending' },
        { label: 'Restarts', value: 'Pending' },
      ],
      steps: ['Add container CPU and memory metrics.', 'Track pod restart deltas by service.', 'Set degraded thresholds for capacity pressure.'],
    },
  };

  const generic: Workbench = {
    title: action,
    status: key === 'monitoring' ? 'Ready' : 'Draft',
    description: 'This workspace keeps the selected responsibility action visible on the main dashboard so operators can review scope, signal needs, and next implementation steps without changing pages.',
    stats: [
      { label: 'Owner', value: 'Analytics' },
      { label: 'State', value: key === 'monitoring' ? 'Ready' : 'Draft' },
      { label: 'Priority', value: key === 'system' ? 'P0' : 'P1' },
    ],
    steps: ['Confirm required source signals.', 'Define output shape and review owner.', 'Move completed work into the readiness checklist.'],
  };

  return key === 'system' ? system[action] ?? generic : generic;
}

function ActionWorkbenchCard({ workbench, compact = false }: { workbench: ReturnType<typeof actionWorkbenchFor>; compact?: boolean }) {
  return (
    <article className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#71809a] dark:text-slate-400">{compact ? 'Workspace' : 'Operational workspace'}</p>
          <h3 className="mt-2 text-base font-semibold text-[#111827] dark:text-slate-100">{workbench.title}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${coverageStatusClass(workbench.status)}`}>{workbench.status}</span>
      </div>
      <p className="app-muted mt-2 text-sm leading-6">{workbench.description}</p>

      {!compact ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {workbench.stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-[#e6eaf2] bg-white p-3 dark:border-[#263247] dark:bg-[#111827]">
              <p className="app-muted text-[11px] font-bold uppercase tracking-wide">{stat.label}</p>
              <p className="mt-1 text-sm font-semibold text-[#111827] dark:text-slate-100">{stat.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {workbench.steps.slice(0, compact ? 2 : 3).map((step, index) => (
          <div key={step} className="flex gap-2 text-sm">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#efecff] text-[10px] font-bold text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
              {index + 1}
            </span>
            <p className="app-muted leading-5">{step}</p>
          </div>
        ))}
      </div>

      {workbench.href ? (
        <Link href={workbench.href} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#6246ea] hover:text-[#4f3ee7] dark:text-violet-300 dark:hover:text-violet-200">
          <BarChart3 className="size-4" /> {workbench.cta ?? 'Open details'}
        </Link>
      ) : null}
    </article>
  );
}

function coverageStatusClass(status: string) {
  if (status === 'Live' || status === 'Ready') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
  if (status === 'Draft') return 'bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200';
  return 'bg-slate-100 text-[#4f5d73] dark:bg-slate-800 dark:text-slate-300';
}

function AgentStatusBadge({ status }: { status: AgentDisplayStatus }) {
  const dotColor = {
    Active: 'bg-emerald-500',
    Paused: 'bg-red-500',
    Degraded: 'bg-orange-500',
    Idle: 'bg-slate-400',
  }[status];

  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative grid size-5 place-items-center">
        {status === 'Active' ? (
          <>
            <span className="absolute size-5 rounded-full bg-emerald-400/30 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
            <span className="absolute size-4 rounded-full bg-emerald-400/20 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_infinite_300ms]" />
          </>
        ) : null}
        <span className={`relative size-2.5 rounded-full ${dotColor}`} />
      </span>
      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${agentStatusPill(status)}`}>
        {status}
      </span>
    </span>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="app-surface card-smooth rounded-lg p-5">
      <h2 className="app-heading mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const knownAgentKeys = agents.map((agent) => agent.key);
