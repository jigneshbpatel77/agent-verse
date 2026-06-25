'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
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
  GitBranch,
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
    key: 'root-cause',
    title: 'Root Cause Analysis',
    icon: GitBranch,
    status: 'Planned',
    summary: 'Failure investigation, dependency mapping, and error correlation across agents and services.',
    output: 'Root cause reports and corrective plans',
    metrics: [
      { label: 'Signals', value: '6' },
      { label: 'Mappings', value: 'Pending' },
      { label: 'Reports', value: '0' },
    ],
    actions: ['Dependency map', 'Failure trace', 'Correction plan'],
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
  {
    key: 'optimization',
    title: 'Multi-Agent Optimization',
    icon: SlidersHorizontal,
    status: 'Planned',
    summary: 'Agent collaboration, routing, redundancy detection, and delegation optimization.',
    output: 'Ecosystem improvement plan',
    metrics: [
      { label: 'Routes', value: '13' },
      { label: 'Redundancy', value: 'Pending' },
      { label: 'Plans', value: '0' },
    ],
    actions: ['Routing audit', 'Delegation plan', 'Load balance'],
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
      <section className="app-surface rounded-lg p-5">
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
  const isMonitoringResponsibility = responsibility.key === 'monitoring';
  const plan = executionPlanFor(responsibility.key);
  const signalCards = dashboardSignalsFor(responsibility.key);
  const coverageRows = serviceCoverageFor(responsibility.key);
  const insightRows = insightRowsFor(responsibility.key);

  if (responsibility.key === 'system') {
    return <EmbeddedServiceAnalyticsDashboard />;
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
        <article className="app-surface rounded-lg p-5">
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

        <article className="app-surface rounded-lg p-5">
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

      {isMonitoringResponsibility ? <MonitoringAgentControl embedded /> : null}

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

type ServiceAnalyticsKey = 'rc' | 'challan' | 'service-history' | 'fastag' | 'payments';

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
  generated_at: string;
  missing_metrics: string[];
  raw_prometheus_queries: Record<string, string>;
}

const serviceAnalyticsLabels: Record<ServiceAnalyticsKey, string> = {
  rc: 'RC Analytics',
  challan: 'Challan Analytics',
  'service-history': 'Service History Analytics',
  fastag: 'Fastag Analytics',
  payments: 'Payments Analytics',
};

const serviceAnalyticsDescriptions: Record<ServiceAnalyticsKey, string> = {
  rc: 'Registration certificate lookups, provider response health, and scrape/API reliability.',
  challan: 'Challan lookup throughput, provider errors, and response latency.',
  'service-history': 'Vehicle service history availability, dependency health, and response timing.',
  fastag: 'Fastag balance, recharge, provider response health, and latency.',
  payments: 'Payment initiation, callback, success rate, timeout, and provider reliability.',
};

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
  updated: { label: 'Last updated', icon: Clock3, tone: 'slate' },
} as const;

function EmbeddedServiceAnalyticsDashboard() {
  const [serviceKey, setServiceKey] = useState<ServiceAnalyticsKey>('rc');
  const [health, setHealth] = useState<ServiceHealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const client = new ApiClient({ baseUrl: runtimeConfig.apiBaseUrl });

    setLoading(true);
    setError(null);

    client
      .get<ServiceHealthResponse>(`/api/analytics/system/${serviceKey}/health`, { cache: 'no-store' })
      .then((payload) => {
        if (!cancelled) {
          setHealth(payload);
        }
      })
      .catch((unknownError) => {
        if (!cancelled) {
          setHealth(null);
          setError(unknownError instanceof Error ? unknownError.message : 'Unable to load service analytics.');
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
  }, [serviceKey]);

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

          <div className="flex flex-wrap items-center gap-2">
            {loading ? (
              <span className="inline-flex items-center gap-2 rounded border border-[#e1e6ef] bg-[#f8faff] px-3 py-1 text-sm font-medium text-[#4f5d73] dark:border-[#263247] dark:bg-slate-800 dark:text-slate-300">
                <Loader2 className="size-4 animate-spin" /> Loading
              </span>
            ) : (
              <EmbeddedStatusBadge status={health?.status ?? 'unknown'} />
            )}
            <span className="rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-sm font-medium text-[#4f5d73] dark:border-[#263247] dark:bg-slate-950/40 dark:text-slate-300">
              {availableCount}/11 signals
            </span>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2 border-t border-[#e6eaf2] px-5 py-4 dark:border-[#263247]">
          {Object.entries(serviceAnalyticsLabels).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setServiceKey(key as ServiceAnalyticsKey)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                key === serviceKey
                  ? 'bg-[#efecff] text-[#4f3ee7] dark:bg-violet-500/15 dark:text-violet-200'
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
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.requestRate} value={formatEmbeddedNumber(health?.request_rate)} suffix="req/s" helper="5m rolling rate" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.errorRate} value={formatEmbeddedPercent(health?.error_rate)} helper="HTTP 5xx + timeout" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.p95} value={formatEmbeddedNumber(health?.p95_latency_ms)} suffix="ms" helper="User-facing tail latency" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.p99} value={formatEmbeddedNumber(health?.p99_latency_ms)} suffix="ms" helper="Worst-case request latency" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.p50} value={formatEmbeddedNumber(health?.p50_latency_ms)} suffix="ms" helper="Median response time" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.p90} value={formatEmbeddedNumber(health?.p90_latency_ms)} suffix="ms" helper="High percentile trend" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.cpu} value={formatEmbeddedNumber(health?.cpu_usage)} suffix="cores" helper="Runtime utilization" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.memory} value={formatEmbeddedBytes(health?.memory_usage_bytes)} helper="Container memory usage" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.restarts} value={formatEmbeddedNumber(health?.pod_restarts_15m)} suffix="15m" helper="Recent pod stability" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.providerLatency} value={formatEmbeddedNumber(health?.provider_p95_latency_ms)} suffix="ms p95" helper="External provider latency" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.providerError} value={formatEmbeddedPercent(health?.provider_error_rate)} helper="External provider failure rate" />
        <EmbeddedMetricCard loading={loading} meta={embeddedMetricMeta.updated} value={health ? formatEmbeddedDate(health.generated_at) : null} helper="Prometheus scrape timestamp" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <article className="app-surface rounded-lg p-5">
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

        <article className="app-surface rounded-lg p-5">
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
    <article className="app-surface min-h-36 rounded-lg p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-[#71809a] dark:text-slate-400">{meta.label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${toneClass}`}>
          <Icon className="size-4" />
        </span>
      </div>
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[#71809a] dark:text-slate-400">
          <Loader2 className="size-4 animate-spin text-[#6246ea]" /> Loading
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

function EmbeddedStatusBadge({ status }: { status: ServiceHealthResponse['status'] }) {
  const className = {
    healthy: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    degraded: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    critical: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
    unknown: 'border-[#e1e6ef] bg-[#f8faff] text-[#4f5d73] dark:border-[#263247] dark:bg-slate-800 dark:text-slate-300',
  }[status];

  return <span className={`w-fit rounded border px-3 py-1 text-sm font-medium ${className}`}>{status}</span>;
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
      className="app-surface rounded-lg p-5"
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
    'root-cause': [
      { title: 'Build dependency graph', detail: 'Map services, agents, providers, databases, queues, and external APIs.' },
      { title: 'Correlate failures', detail: 'Join error spikes with latency, restart, provider, and workflow timing signals.' },
      { title: 'Generate corrective actions', detail: 'Summarize likely root cause, evidence, blast radius, and next remediation steps.' },
    ],
    decision: [
      { title: 'Define decision criteria', detail: 'Set impact, urgency, confidence, cost, and risk dimensions for scoring.' },
      { title: 'Create recommendation queue', detail: 'Convert analytics findings into ranked actions for operators and product teams.' },
      { title: 'Track decision outcomes', detail: 'Measure whether accepted recommendations improved reliability, revenue, or cycle time.' },
    ],
    optimization: [
      { title: 'Audit agent routing', detail: 'Review delegation paths, duplicated work, and missed handoffs across agents.' },
      { title: 'Detect redundancy', detail: 'Find overlapping tasks, repeated analysis, and low-value agent loops.' },
      { title: 'Propose ecosystem changes', detail: 'Recommend routing updates, delegation rules, and workload balancing changes.' },
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
    'root-cause': [
      { label: 'Correlations', value: '6', detail: 'Errors, latency, restarts', icon: GitBranch, tone: commonTone },
      { label: 'Dependency graph', value: 'Draft', detail: 'Services and providers pending', icon: BarChart3, tone: warningTone },
      { label: 'Open reports', value: '0', detail: 'No published RCA yet', icon: FileText, tone: commonTone },
      { label: 'Evidence window', value: '24h', detail: 'Default incident lookback', icon: Clock3, tone: successTone },
    ],
    decision: [
      { label: 'Recommendations', value: '0', detail: 'Decision queue not published', icon: Radar, tone: commonTone },
      { label: 'Scoring model', value: 'Draft', detail: 'Impact and confidence criteria', icon: SlidersHorizontal, tone: warningTone },
      { label: 'Risk inputs', value: '4', detail: 'Reliability, cost, latency, volume', icon: ShieldAlert, tone: commonTone },
      { label: 'Review cadence', value: 'Daily', detail: 'Ops decision summary target', icon: CheckCircle2, tone: successTone },
    ],
    optimization: [
      { label: 'Routes', value: '13', detail: 'Agent routing paths tracked', icon: GitBranch, tone: commonTone },
      { label: 'Redundancy checks', value: 'Pending', detail: 'Duplicate work detector', icon: SlidersHorizontal, tone: warningTone },
      { label: 'Handoff quality', value: 'Draft', detail: 'Delegation policy needed', icon: Radar, tone: commonTone },
      { label: 'Improvement plan', value: '0', detail: 'No published plan yet', icon: FileText, tone: successTone },
    ],
  };

  return signals[key] ?? signals.system;
}

function serviceCoverageFor(key: string) {
  const coverage: Record<string, Array<{ name: string; detail: string; status: 'Live' | 'Pending' | 'Draft' }>> = {
    system: [
      { name: 'RC Service', detail: 'Prometheus metrics connected with fallback endpoint', status: 'Live' },
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
      steps: ['Keep RC fallback scrape visible for testing.', 'Add challan, service history, fastag, and payments metric URLs.', 'Promote missing signals as each service exposes Prometheus metrics.'],
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
    <section className="app-surface rounded-lg p-5">
      <h2 className="app-heading mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const knownAgentKeys = agents.map((agent) => agent.key);
