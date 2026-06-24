'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  PlayCircle,
  Server,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
  { title: 'Total Agents', value: '13', detail: 'All agents registered', trend: '0%', icon: Users, color: '#6246ea' },
  { title: 'Tasks Executed', value: '1,245', detail: 'Across all agents', trend: '18.6%', icon: CheckCircle2, color: '#6246ea' },
  { title: 'Success Rate', value: '98.7%', detail: 'Overall success', trend: '2.4%', icon: TrendingUp, color: '#16a34a' },
  { title: 'Avg. Response Time', value: '1.42s', detail: 'Across all agents', trend: '-0.8s', icon: Clock3, color: '#f97316' },
  { title: 'Active Workflows', value: '16', detail: 'Currently running', trend: '14.3%', icon: PlayCircle, color: '#6246ea' },
  { title: 'System Health', value: 'Healthy', detail: 'All systems operational', trend: '99.95%', icon: Server, color: '#22c55e' },
];

type DatePresetKey = 'today' | 'yesterday' | 'last-7-days' | 'this-month' | 'last-month' | 'last-30-days';

interface DateRangeState {
  preset: DatePresetKey | 'custom';
  startDate: string;
  endDate: string;
}

const datePresets: Array<{ key: DatePresetKey; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last-7-days', label: 'Last 7 days' },
  { key: 'this-month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: 'last-30-days', label: 'Last 30 days' },
];

export function AgentOverview() {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeState>(() => presetDateRange('this-month'));
  const selectedPreset = useMemo(() => datePresets.find((preset) => preset.key === dateRange.preset), [dateRange.preset]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111827] dark:text-slate-50">Platform Overview</h1>
          <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Real-time summary of AI agents and system performance</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDatePickerOpen((value) => !value)}
              className="inline-flex min-w-[260px] items-center justify-between gap-3 rounded-lg border border-[#e1e6ef] bg-white px-3.5 py-2 text-left shadow-sm transition hover:border-[#cfc7ff] hover:bg-[#fbfcff] dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
            >
              <span className="inline-flex min-w-0 items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea]">
                  <CalendarDays className="size-4" />
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-sm font-semibold text-[#111827] dark:text-slate-100">{selectedPreset?.label ?? 'Custom range'}</span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-[#71809a]">{formatDateRange(dateRange)}</span>
                </span>
              </span>
              <ChevronDown className="size-4 text-[#71809a]" />
            </button>

            {datePickerOpen ? (
              <div className="absolute right-0 z-20 mt-2 w-[340px] rounded-xl border border-[#e1e6ef] bg-white p-4 shadow-[0_18px_48px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900">
                <div className="grid grid-cols-2 gap-2">
                  {datePresets.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setDateRange(presetDateRange(preset.key))}
                      className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                        dateRange.preset === preset.key
                          ? 'bg-[#efecff] text-[#4f3ee7]'
                          : 'text-[#4f5d73] hover:bg-[#f4f1ff] hover:text-[#4f3ee7] dark:text-slate-300 dark:hover:bg-violet-500/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#e6eaf2] pt-4 dark:border-slate-700">
                  <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#71809a]">
                    Start date
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={(event) =>
                        setDateRange((current) => ({ ...current, preset: 'custom', startDate: event.target.value }))
                      }
                      className="h-10 rounded-lg border border-[#e1e6ef] bg-white px-2.5 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                  <label className="grid gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[#71809a]">
                    End date
                    <input
                      type="date"
                      value={dateRange.endDate}
                      min={dateRange.startDate}
                      onChange={(event) =>
                        setDateRange((current) => ({ ...current, preset: 'custom', endDate: event.target.value }))
                      }
                      className="h-10 rounded-lg border border-[#e1e6ef] bg-white px-2.5 text-sm font-semibold normal-case tracking-normal text-[#111827] outline-none transition focus:border-[#6246ea] focus:ring-2 focus:ring-[#efecff] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    />
                  </label>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-xs font-medium text-[#71809a]">{formatDateRange(dateRange)}</p>
                  <button
                    type="button"
                    onClick={() => setDatePickerOpen(false)}
                    className="app-button-primary rounded-lg px-4 py-2 text-sm font-semibold"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ) : null}
          </div>
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
                  <p className="text-sm font-medium text-[#71809a] dark:text-slate-400">{card.title}</p>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{card.value}</p>
                </div>
                <div className="grid size-11 place-items-center rounded-full" style={{ backgroundColor: `${card.color}18`, color: card.color }}>
                  <Icon className="size-5" />
                </div>
              </div>
              <p className="mt-2 text-sm text-[#71809a] dark:text-slate-400">{card.detail}</p>
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
                <tr className="border-b border-[#e6eaf2] text-left text-xs font-semibold uppercase text-[#71809a] dark:border-slate-700">
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
                    <tr key={agent.key} className="border-b border-[#eef1f6] hover:bg-[#f8faff] dark:border-slate-700 dark:hover:bg-slate-700/70/60">
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
                      <td className="px-1 py-3 text-[#4f5d73] dark:text-slate-300">{agent.tasks}</td>
                      <td className="px-1 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${agent.successRate}%` }} />
                          </div>
                          <span className="font-medium">{agent.successRate}%</span>
                        </div>
                      </td>
                      <td className="px-1 py-3 text-[#4f5d73] dark:text-slate-300">{agent.avgResponseTime}</td>
                      <td className="px-1 py-3 text-[#71809a] dark:text-slate-400">{agent.lastActivity}</td>
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
                <tr className="border-b border-[#e6eaf2] text-left text-xs font-semibold uppercase text-[#71809a] dark:border-slate-700">
                <th className="py-3">Component</th>
                <th className="py-3">Status</th>
                <th className="py-3">Uptime</th>
                <th className="py-3">Latency</th>
              </tr>
            </thead>
            <tbody>
              {systemComponents.map((component) => (
                <tr key={component.name} className="border-b border-[#eef1f6] dark:border-slate-700">
                  <td className="py-3 font-medium text-slate-700 dark:text-slate-200">{component.name}</td>
                  <td className="py-3 text-emerald-600">Healthy</td>
                  <td className="py-3 text-[#71809a] dark:text-slate-400">{component.uptime}</td>
                  <td className="py-3 text-[#71809a] dark:text-slate-400">{component.latency}</td>
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
                    <stop offset="0%" stopColor="#6246ea" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#6246ea" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Area type="monotone" dataKey="tasks" stroke="#6246ea" fill="url(#tasksGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Recent Alerts" action="View all">
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div key={alert.title} className="flex items-start gap-3 rounded-lg border border-[#e6eaf2] p-3 dark:border-slate-700">
                <div className="grid size-9 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40">
                  <AlertTriangle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{alert.title}</p>
                  <p className="mt-1 text-xs text-[#71809a] dark:text-slate-400">{alert.severity}</p>
                </div>
                <span className="text-xs text-[#71809a] dark:text-slate-400">{alert.time}</span>
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
                  <span className="flex items-center gap-2 text-[#4f5d73] dark:text-slate-300">
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

function presetDateRange(preset: DatePresetKey): DateRangeState {
  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);

  const ranges: Record<DatePresetKey, { startDate: Date; endDate: Date }> = {
    today: { startDate: today, endDate: today },
    yesterday: { startDate: yesterday, endDate: yesterday },
    'last-7-days': { startDate: addDays(today, -6), endDate: today },
    'this-month': { startDate: new Date(today.getFullYear(), today.getMonth(), 1), endDate: today },
    'last-month': {
      startDate: new Date(today.getFullYear(), today.getMonth() - 1, 1),
      endDate: new Date(today.getFullYear(), today.getMonth(), 0),
    },
    'last-30-days': { startDate: addDays(today, -29), endDate: today },
  };

  const range = ranges[preset];
  return {
    preset,
    startDate: toDateInputValue(range.startDate),
    endDate: toDateInputValue(range.endDate),
  };
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateRange(range: DateRangeState) {
  return `${formatDateLabel(range.startDate)} - ${formatDateLabel(range.endDate)}`;
}

function formatDateLabel(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(year, month - 1, day));
}

function Panel({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <section className="app-surface rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">{title}</h2>
        {action ? <button className="text-sm font-semibold text-[#6246ea] hover:text-[#4f3ee7] dark:text-violet-300 dark:hover:text-violet-200">{action}</button> : null}
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
