'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  GitBranch,
  Pause,
  Play,
  Radar,
  ShieldAlert,
  SlidersHorizontal,
  Terminal,
  TrendingUp,
} from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

  return (
    <div className="space-y-4">
      {!isMonitoringResponsibility ? (
        <section className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
          <article className="app-surface rounded-lg p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4">
                <div className="grid size-12 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                  <Icon className="size-6" />
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
                <Link href="/analytics/system/rc" className="app-button-primary inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold">
                  <BarChart3 className="size-4" /> Open service analytics
                </Link>
              ) : null}
            </div>

            <div className="mt-5 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] p-4 dark:border-[#263247] dark:bg-[#0f172a]">
              <p className="text-xs font-bold uppercase tracking-wide text-[#71809a] dark:text-slate-400">Expected output</p>
              <p className="mt-2 text-sm font-medium text-[#111827] dark:text-slate-100">{responsibility.output}</p>
            </div>

            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wide text-[#71809a] dark:text-slate-400">Work queue</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {responsibility.actions.map((action) => (
                  <span key={action} className="rounded-lg border border-[#e6eaf2] bg-white px-3 py-2 text-sm font-medium text-[#4f5d73] dark:border-[#263247] dark:bg-[#0f172a] dark:text-slate-300">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          </article>

          <article className="app-surface rounded-lg p-5">
            <h2 className="text-base font-semibold text-[#111827] dark:text-slate-100">Execution Plan</h2>
            <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Next steps to turn this responsibility into a usable analytics workflow.</p>
            <div className="mt-4 space-y-3">
              {executionPlanFor(responsibility.key).map((step, index) => (
                <div key={step.title} className="flex gap-3 rounded-lg border border-[#e6eaf2] bg-white p-3 dark:border-[#263247] dark:bg-[#0f172a]">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-[#efecff] text-xs font-semibold text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111827] dark:text-slate-100">{step.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#71809a] dark:text-slate-400">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {isMonitoringResponsibility ? <MonitoringAgentControl embedded /> : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <Panel title="Recent Analytics Work">
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

        <Panel title="Delivery Readiness">
          <div className="space-y-3">
            {['Prometheus signal coverage', 'Analyst report template', 'Cross-agent dependency data', 'Executive summary export'].map((item, index) => (
              <div key={item} className="app-surface-subtle flex items-center justify-between rounded-lg p-3">
                <span className="text-sm font-medium text-[#4f5d73] dark:text-slate-300">{item}</span>
                <span className={`text-sm font-semibold ${index === 0 ? 'text-emerald-600' : 'text-[#71809a] dark:text-slate-400'}`}>
                  {index === 0 ? 'Ready' : 'Pending'}
                </span>
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
