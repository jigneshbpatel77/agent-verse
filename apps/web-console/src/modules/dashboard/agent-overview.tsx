'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { agents, recentAlerts, summaryTrend, systemComponents, taskStatusData } from './data';
import { agentStatusDot, agentStatusPill, normalizeAgentStatus } from './status';

const summaryCards = [
  { title: 'Total Agents', value: '13', detail: 'All agents registered', trend: '0%', icon: Users, color: '#2563eb' },
  { title: 'Tasks Executed', value: '1,245', detail: 'Across all agents', trend: '18.6%', icon: CheckCircle2, color: '#4f46e5' },
  { title: 'Success Rate', value: '98.7%', detail: 'Overall success', trend: '2.4%', icon: TrendingUp, color: '#16a34a' },
  { title: 'Avg. Response Time', value: '1.42s', detail: 'Across all agents', trend: '-0.8s', icon: Clock3, color: '#f97316' },
  { title: 'Active Workflows', value: '16', detail: 'Currently running', trend: '14.3%', icon: PlayCircle, color: '#2563eb' },
  { title: 'System Health', value: 'Healthy', detail: 'All systems operational', trend: '99.95%', icon: Server, color: '#22c55e' },
];

export function AgentOverview() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Platform Overview</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Real-time summary of AI agents and system performance</p>
        </div>
        <div className="flex gap-3">
          <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
            Last 24 hours
          </button>
          <Link
            href="/analytics/system/rc"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
          >
            System Analytics
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className="app-surface rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.title}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{card.value}</p>
                </div>
                <div className="grid size-11 place-items-center rounded-full" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.detail}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40">
                  {card.trend.startsWith('-') ? <TrendingDown className="size-3" /> : <TrendingUp className="size-3" />}
                  {card.trend}
                </span>
                <div className="h-10 w-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={summaryTrend}>
                      <Line type="monotone" dataKey="tasks" dot={false} stroke={card.color} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel title="Agent Performance" action="View all agents">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500 dark:border-slate-700">
                  <th className="px-1 py-3">Agent</th>
                  <th className="px-1 py-3">Status</th>
                  <th className="px-1 py-3">Tasks</th>
                  <th className="px-1 py-3">Success Rate</th>
                  <th className="px-1 py-3">Avg. Response Time</th>
                  <th className="px-1 py-3">Last Activity</th>
                  <th className="px-1 py-3" />
                </tr>
              </thead>
              <tbody>
                {agents.slice(0, 8).map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <tr key={agent.key} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700/70/60">
                      <td className="px-1 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`grid size-8 place-items-center rounded-lg ${agent.accent}`}>
                            <Icon className="size-4" />
                          </div>
                          <span className="font-medium text-slate-800 dark:text-slate-100">{agent.name}</span>
                        </div>
                      </td>
                      <td className="px-1 py-3">
                        <StatusPill status={agent.status} />
                      </td>
                      <td className="px-1 py-3 text-slate-600 dark:text-slate-300">{agent.tasks}</td>
                      <td className="px-1 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${agent.successRate}%` }} />
                          </div>
                          <span className="font-medium">{agent.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-1 py-3 text-slate-600 dark:text-slate-300">{agent.avgResponseTime}</td>
                      <td className="px-1 py-3 text-slate-500">{agent.lastActivity}</td>
                      <td className="px-1 py-3 text-right">
                        <Link href={`/agents/${agent.key}`} className="inline-flex rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-700/70">
                          <ArrowRight className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="System Health" action="View system status">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase text-slate-500 dark:border-slate-700">
                <th className="py-3">Component</th>
                <th className="py-3">Status</th>
                <th className="py-3">Uptime</th>
                <th className="py-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {systemComponents.map((component) => (
                <tr key={component.name} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{component.name}</td>
                  <td className="py-3 text-emerald-600">Healthy</td>
                  <td className="py-3 text-slate-500">{component.uptime}</td>
                  <td className="py-3 text-slate-500">{component.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <Panel title="Task Activity" action="View all">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summaryTrend}>
                <defs>
                  <linearGradient id="tasksGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#4f46e5" fill="url(#tasksGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Recent Alerts" action="View all">
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.title} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3 dark:border-slate-700">
                <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{alert.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{alert.severity}</p>
                </div>
                <span className="text-xs text-slate-500">{alert.time}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Tasks by Status" action="View all">
          <div className="grid h-64 grid-cols-[1fr_1.1fr] items-center gap-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={taskStatusData} dataKey="value" innerRadius={54} outerRadius={86} paddingAngle={2}>
                  {taskStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 text-sm">
              {taskStatusData.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                    {entry.name}
                  </span>
                  <span className="font-semibold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="app-surface rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {action ? <button className="text-sm font-semibold text-blue-600 hover:text-blue-700">{action}</button> : null}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const normalizedStatus = normalizeAgentStatus(status);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${agentStatusPill(normalizedStatus)}`}>
      <span className={agentStatusDot(normalizedStatus, normalizedStatus === 'Active')} />
      {status}
    </span>
  );
}
