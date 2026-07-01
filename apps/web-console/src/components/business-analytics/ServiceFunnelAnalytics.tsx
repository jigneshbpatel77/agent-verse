'use client';

import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Gauge,
  Info,
  LineChart,
  Loader2,
  LogOut,
  Plus,
  ReceiptIndianRupee,
  Sparkles,
  Trash2,
  TrendingDown,
  Users,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { FunnelBuilder } from './FunnelBuilder';
import { useEventCatalog } from './useEventCatalog';
import { formatNumber } from './formatters';
import { ApiClient } from '@/api/client';
import type { FunnelEventCatalogItem } from '@/data/funnelEventsMock';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NodeDetail {
  conversionRate: string;
  dropOff: string;
  avgTimeSpent: string;
  topExitReason: string;
  revenue?: string;
}

interface FunnelStep {
  id: string;
  label: string;
  sublabel: string;
  users: number;
  isExitNode?: boolean;
  exitLabel?: string;
  exitUsers?: number;
  detail: NodeDetail;
}

interface DropoffInsight {
  label: string;
  rate: string;
  description: string;
}

interface UpsellTrigger {
  label: string;
  action: string;
  expectedLift: string;
}

interface ServiceFunnel {
  key: string;
  title: string;
  tabLabel: string;
  isCustom?: boolean;
  icon: typeof ReceiptIndianRupee;
  barColor: string;
  barColorLight: string;
  totalEntry: number;
  finalConversions: number;
  conversionLabel: string;
  steps: FunnelStep[];
  dropoffInsights: DropoffInsight[];
  upsellTriggers: UpsellTrigger[];
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const FUNNELS: ServiceFunnel[] = [];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(value: number, total: number): string {
  return `${((value / total) * 100).toFixed(1)}%`;
}

function dropPct(current: number, previous: number): string {
  const drop = ((previous - current) / previous) * 100;
  return `−${drop.toFixed(1)}%`;
}

/**
 * Builds a ServiceFunnel from a user-selected, ordered list of events.
 * Step user counts are clamped to be monotonically decreasing so the preview
 * renders as a real funnel. Once the backend `runFunnelReport` is wired, these
 * mock counts are replaced by live ordered-funnel results.
 */
function buildCustomFunnel(id: string, name: string, events: FunnelEventCatalogItem[]): ServiceFunnel {
  let prevUsers = Number.POSITIVE_INFINITY;
  const steps: FunnelStep[] = events.map((event, index) => {
    const users = Math.min(event.totalUsers, prevUsers);
    const detail: NodeDetail = {
      conversionRate: index === 0 ? '100%' : pct(users, events[0].totalUsers),
      dropOff: index === 0 ? '—' : dropPct(users, prevUsers),
      avgTimeSpent: '—',
      topExitReason: '—',
    };
    prevUsers = users;
    return {
      id: event.eventName,
      label: event.label,
      sublabel: event.eventName,
      users,
      detail,
    };
  });

  const totalEntry = steps[0]?.users ?? 0;
  const finalConversions = steps[steps.length - 1]?.users ?? 0;

  return {
    key: id,
    title: name,
    tabLabel: name,
    isCustom: true,
    icon: LineChart,
    barColor: 'bg-violet-600 dark:bg-violet-500',
    barColorLight: 'bg-violet-100 dark:bg-violet-500/20',
    totalEntry,
    finalConversions,
    conversionLabel: 'converted',
    steps,
    dropoffInsights: [],
    upsellTriggers: [],
  };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Expandable Node Details panel shown when a step is clicked */
function NodeDetailsPanel({
  step,
  totalEntry,
  onClose,
}: {
  step: FunnelStep;
  totalEntry: number;
  onClose: () => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] p-4 dark:border-slate-700 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="size-4 shrink-0 text-[#6246ea] dark:text-violet-300" />
          <span className="text-sm font-semibold text-[#111827] dark:text-slate-100">
            Node Details — {step.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ChevronUp className="size-3.5" />
          Close
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Conversion Rate', value: step.detail.conversionRate, accent: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Drop-off at this Step', value: step.detail.dropOff, accent: 'text-rose-600 dark:text-rose-400' },
          { label: 'Avg. Time Spent', value: step.detail.avgTimeSpent, accent: 'text-[#6246ea] dark:text-violet-300' },
          { label: 'Users at Stage', value: formatNumber(step.users), accent: 'text-[#111827] dark:text-slate-100' },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-[#e6eaf2] bg-white p-3 dark:border-slate-700 dark:bg-[#111827]"
          >
            <p className="app-muted text-xs font-medium">{item.label}</p>
            <p className={`mt-1 text-base font-semibold ${item.accent}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-lg border border-[#e6eaf2] bg-white px-3 py-2.5 text-xs dark:border-slate-700 dark:bg-[#111827]">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
        <div>
          <span className="font-semibold text-[#4f5d73] dark:text-slate-300">Top Exit Reason: </span>
          <span className="text-slate-500 dark:text-slate-400">{step.detail.topExitReason}</span>
        </div>
      </div>

      {step.isExitNode && step.exitUsers !== undefined && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs dark:border-rose-900/40 dark:bg-rose-950/20">
          <LogOut className="mt-0.5 size-3.5 shrink-0 text-rose-500 dark:text-rose-400" />
          <span className="text-rose-700 dark:text-rose-400">
            <span className="font-semibold">{formatNumber(step.exitUsers)}</span> users exited here via{' '}
            <span className="font-semibold">&ldquo;{step.exitLabel}&rdquo;</span> —{' '}
            {pct(step.exitUsers, totalEntry)} of total entry.
          </span>
        </div>
      )}

      {step.detail.revenue && step.detail.revenue !== '—' && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-700 dark:text-emerald-400">
            Revenue generated by users who reached this step:{' '}
            <span className="font-semibold">{step.detail.revenue}</span>
          </span>
        </div>
      )}
    </div>
  );
}

/** Single funnel bar column */
function FunnelBarStep({
  step,
  index,
  totalEntry,
  isFirst,
  isLast,
  isSelected,
  barColor,
  barColorLight,
  maxBarHeight,
  onClick,
}: {
  step: FunnelStep;
  index: number;
  totalEntry: number;
  isFirst: boolean;
  isLast: boolean;
  isSelected: boolean;
  barColor: string;
  barColorLight: string;
  maxBarHeight: number;
  onClick: () => void;
}) {
  const ratio = step.users / totalEntry;
  const barHeightPx = Math.max(Math.round(ratio * maxBarHeight), 8);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-0">
      {/* Step index badge */}
      <span className="mb-1.5 flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {index + 1}
      </span>

      {/* Exit branch indicator (above bar for exit nodes) */}
      {step.isExitNode && step.exitUsers !== undefined ? (
        <div className="mb-1 flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 dark:border-rose-900/40 dark:bg-rose-950/20">
          <LogOut className="size-2.5 text-rose-500 dark:text-rose-400" />
          <span className="text-[9px] font-medium leading-tight text-rose-600 dark:text-rose-400">
            {formatNumber(step.exitUsers)} exit
          </span>
        </div>
      ) : (
        <div className="mb-1 h-[22px]" /> /* spacer */
      )}

      {/* Clickable bar column */}
      <button
        onClick={onClick}
        className={`group relative flex w-full flex-col items-center justify-end rounded-t-md transition-all duration-200 focus:outline-none ${
          isSelected
            ? 'ring-2 ring-[#6246ea] ring-offset-2 ring-offset-white dark:ring-violet-400 dark:ring-offset-[#111827]'
            : 'hover:opacity-90'
        }`}
        style={{ height: `${maxBarHeight}px` }}
        title={`${step.label} — ${formatNumber(step.users)} users`}
      >
        {/* Background track */}
        <div className={`absolute inset-x-0 bottom-0 rounded-t-sm ${barColorLight}`} style={{ height: `${maxBarHeight}px` }} />
        {/* Filled bar */}
        <div
          className={`absolute inset-x-0 bottom-0 rounded-t-sm transition-all duration-500 ${barColor} ${isSelected ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}
          style={{ height: `${barHeightPx}px` }}
        />
        {/* Percentage label inside bar (only if bar is tall enough) */}
        {barHeightPx > 28 && (
          <span
            className="relative z-10 mb-1 text-[10px] font-bold text-white/90"
            style={{ lineHeight: 1 }}
          >
            {pct(step.users, totalEntry)}
          </span>
        )}
        {/* Expand indicator */}
        <span
          className={`absolute -bottom-3 left-1/2 -translate-x-1/2 transition-transform duration-200 ${isSelected ? 'text-[#6246ea] dark:text-violet-300' : 'text-slate-300 dark:text-slate-600'}`}
        >
          <ChevronDown className={`size-3.5 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {/* User count below bar */}
      <div className="mt-4 flex flex-col items-center gap-0.5 text-center">
        <div className="flex items-center gap-1">
          <Users className="size-3 text-slate-400 dark:text-slate-500" />
          <span className="text-xs font-semibold text-[#111827] dark:text-slate-100">
            {formatNumber(step.users)}
          </span>
        </div>
        {barHeightPx <= 28 && (
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            {pct(step.users, totalEntry)}
          </span>
        )}
      </div>

      {/* Step label */}
      <div className="mt-1 flex flex-col items-center gap-0.5 text-center">
        <span className="text-[11px] font-semibold leading-tight text-[#111827] dark:text-slate-100">
          {step.label}
        </span>
        <span className="text-[10px] leading-tight text-slate-400 dark:text-slate-500">{step.sublabel}</span>
      </div>
    </div>
  );
}

/** Arrow connector between steps showing drop-off */
function StepConnector({ prevUsers, currUsers }: { prevUsers: number; currUsers: number }) {
  const isExitDrop = currUsers < prevUsers;
  const drop = dropPct(currUsers, prevUsers);

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-0.5 pt-10">
      <span
        className={`whitespace-nowrap rounded px-1 py-0.5 text-[9px] font-bold ${
          isExitDrop
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
        }`}
      >
        {drop}
      </span>
      <ArrowRight className="size-3.5 text-slate-300 dark:text-slate-600" />
    </div>
  );
}

/** The main bar chart + detail panel */
function FunnelVisualization({
  funnel,
  selectedStepId,
  onStepClick,
}: {
  funnel: ServiceFunnel;
  selectedStepId: string | null;
  onStepClick: (id: string) => void;
}) {
  const MAX_BAR_HEIGHT = 160;
  const selectedStep = funnel.steps.find((s) => s.id === selectedStepId) ?? null;

  return (
    <div>
      {/* Conversion summary strip */}
      <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-slate-400" />
          <span className="app-muted text-xs font-semibold">Total Entry</span>
          <span className="text-sm font-bold text-[#111827] dark:text-slate-100">
            {formatNumber(funnel.totalEntry)}
          </span>
        </div>
        <div className="h-4 w-px bg-[#e6eaf2] dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span className="app-muted text-xs font-semibold">Final Conversions</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatNumber(funnel.finalConversions)}
          </span>
        </div>
        <div className="h-4 w-px bg-[#e6eaf2] dark:bg-slate-700" />
        <div className="flex items-center gap-2">
          <TrendingDown className="size-4 text-rose-500" />
          <span className="app-muted text-xs font-semibold">Overall Conversion</span>
          <span className="text-sm font-bold text-[#111827] dark:text-slate-100">
            {pct(funnel.finalConversions, funnel.totalEntry)}
          </span>
        </div>
        <div className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
          Click any bar to see step details
        </div>
      </div>

      {/* Bar chart row */}
      <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
        {funnel.steps.map((step, idx) => (
          <div key={step.id} className="flex min-w-0 flex-1 items-stretch">
            <FunnelBarStep
              step={step}
              index={idx}
              totalEntry={funnel.totalEntry}
              isFirst={idx === 0}
              isLast={idx === funnel.steps.length - 1}
              isSelected={selectedStepId === step.id}
              barColor={funnel.barColor}
              barColorLight={funnel.barColorLight}
              maxBarHeight={MAX_BAR_HEIGHT}
              onClick={() => onStepClick(step.id)}
            />
            {idx < funnel.steps.length - 1 && (
              <StepConnector prevUsers={step.users} currUsers={funnel.steps[idx + 1].users} />
            )}
          </div>
        ))}
      </div>

      {/* Node details panel (below chart) */}
      {selectedStep && (
        <NodeDetailsPanel
          step={selectedStep}
          totalEntry={funnel.totalEntry}
          onClose={() => onStepClick(selectedStep.id)}
        />
      )}
    </div>
  );
}

/** Key Drop-off Points card (red accent) */
function DropoffInsightsCard({ insights }: { insights: DropoffInsight[] }) {
  return (
    <article className="rounded-lg border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-950/10">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
          <TrendingDown className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-rose-800 dark:text-rose-300">
          Key Drop-off Points &amp; Exits
        </h3>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight) => (
          <div
            key={insight.label}
            className="rounded-lg border border-rose-200/60 bg-white p-3 dark:border-rose-900/30 dark:bg-[#1a0d0d]"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">{insight.label}</span>
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                {insight.rate}
              </span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {insight.description}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

/** Upsell / Cross-sell Triggers card (amber accent) */
function UpsellTriggersCard({ triggers }: { triggers: UpsellTrigger[] }) {
  return (
    <article className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-950/10">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
          <Zap className="size-4" />
        </span>
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
          Upsell / Cross-sell Triggers
        </h3>
      </div>
      <div className="space-y-2.5">
        {triggers.map((trigger) => (
          <div
            key={trigger.label}
            className="rounded-lg border border-amber-200/60 bg-white p-3 dark:border-amber-900/30 dark:bg-[#1a1200]"
          >
            <div className="mb-1 flex items-start gap-2">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{trigger.label}</span>
            </div>
            <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{trigger.action}</p>
            <div className="flex items-center gap-1.5 rounded bg-amber-50 px-2 py-1 dark:bg-amber-900/20">
              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">Expected lift:</span>
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">{trigger.expectedLift}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface FunnelDefinition {
  id: string;
  name: string;
  events: FunnelEventCatalogItem[];
}

const FUNNELS_API = '/api/analytics-agent/api/v1/firebase/funnels';

export function ServiceFunnelAnalytics({
  startDate,
  endDate,
}: {
  startDate?: string;
  endDate?: string;
} = {}) {
  const [definitions, setDefinitions] = useState<FunnelDefinition[]>([]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  // Live event catalog for the selected date range — drives both the builder
  // list and the per-step counts of saved funnels, so everything is date-aware.
  const { catalog, loading, isLive } = useEventCatalog(startDate, endDate);
  const countByEvent = useMemo(
    () => new Map(catalog.map((event) => [event.eventName, event])),
    [catalog],
  );

  const client = useMemo(() => new ApiClient({ baseUrl: window.location.origin }), []);

  // Load saved funnels from the backend (DuckDB) on mount.
  useEffect(() => {
    let cancelled = false;
    client
      .get<{ funnels: FunnelDefinition[] }>(FUNNELS_API)
      .then((data) => {
        if (!cancelled) setDefinitions(data.funnels ?? []);
      })
      .catch(() => {
        /* backend unavailable — start with an empty list */
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const funnels = useMemo(
    () =>
      definitions.map((def) => {
        // Refresh each step's user count from the date-filtered catalog so the
        // funnel bars reflect the selected range; fall back to the stored count.
        const events = def.events.map((event) => countByEvent.get(event.eventName) ?? event);
        return buildCustomFunnel(def.id, def.name, events);
      }),
    [definitions, countByEvent],
  );

  const activeFunnel = funnels.find((f) => f.key === activeKey) ?? funnels[0] ?? null;

  function handleTabChange(key: string) {
    setActiveKey(key);
    setSelectedStepId(null);
  }

  function handleStepClick(stepId: string) {
    setSelectedStepId((prev) => (prev === stepId ? null : stepId));
  }

  function handleSaveFunnel(name: string, events: FunnelEventCatalogItem[]) {
    setSelectedStepId(null);
    setBuilderOpen(false);
    client
      .post<FunnelDefinition>(FUNNELS_API, { name, events })
      .then((created) => {
        setDefinitions((prev) => [...prev, created]);
        setActiveKey(created.id);
      })
      .catch(() => {
        /* save failed — leave list unchanged */
      });
  }

  function handleDeleteFunnel(id: string) {
    setActiveKey(null);
    setSelectedStepId(null);
    setDefinitions((prev) => prev.filter((def) => def.id !== id));
    client.delete(`${FUNNELS_API}/${id}`).catch(() => {
      /* delete failed on server — UI already removed it */
    });
  }

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="app-heading text-lg font-semibold">Funnel Performance</h2>
          <p className="app-muted mt-1 text-sm">
            Build event funnels from your Firebase events and track conversion &amp; drop-off across the steps.
          </p>
          <div className="mt-2 flex items-center gap-2">
            {startDate && endDate ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1ecff] px-2.5 py-1 text-[11px] font-semibold text-[#6246ea] dark:bg-violet-500/10 dark:text-violet-300">
                <Calendar className="size-3" />
                {startDate} → {endDate}
              </span>
            ) : null}
            {loading ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Loader2 className="size-3 animate-spin" /> updating…
              </span>
            ) : (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isLive
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                }`}
              >
                {isLive ? 'live' : 'sample'}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#6246ea] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#523bd4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6246ea] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" />
          Create New Funnel
        </button>
      </div>

      {/* Card */}
      <div className="app-surface rounded-lg p-5">
        {activeFunnel === null ? (
          /* ── Empty state ── */
          <div className="grid place-items-center gap-3 px-6 py-16 text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-[#f1ecff] text-[#6246ea] dark:bg-violet-500/10 dark:text-violet-300">
              <LineChart className="size-6" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#111827] dark:text-slate-100">No funnels yet</p>
              <p className="app-muted mt-1 text-sm">
                Create your first funnel by selecting and ordering Firebase events.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setBuilderOpen(true)}
              className="mt-1 flex items-center gap-2 rounded-lg bg-[#6246ea] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#523bd4]"
            >
              <Plus className="size-4" />
              Create New Funnel
            </button>
          </div>
        ) : (
          <>
            {/* ── Tab Navigation ── */}
            <div className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] p-1 dark:border-slate-700 dark:bg-slate-900/60">
              {funnels.map((funnel) => {
                const Icon = funnel.icon;
                const isActive = funnel.key === activeFunnel.key;
                return (
                  <button
                    key={funnel.key}
                    onClick={() => handleTabChange(funnel.key)}
                    className={`flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-150 whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6246ea] ${
                      isActive
                        ? 'bg-white text-[#6246ea] shadow-sm dark:bg-[#111827] dark:text-violet-300'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className={`size-4 ${isActive ? 'text-[#6246ea] dark:text-violet-300' : ''}`} />
                    {funnel.tabLabel}
                  </button>
                );
              })}
            </div>

            {/* Funnel name + delete row */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <Sparkles className="size-4 shrink-0 text-[#6246ea] dark:text-violet-300" />
                <h3 className="truncate text-base font-semibold text-[#111827] dark:text-slate-100">
                  {activeFunnel.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteFunnel(activeFunnel.key)}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#e6eaf2] px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/20 dark:hover:text-rose-400"
              >
                <Trash2 className="size-3.5" />
                Delete
              </button>
            </div>

            {/* Estimated-data notice */}
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5 text-xs dark:border-violet-900/40 dark:bg-violet-950/10">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#6246ea] dark:text-violet-300" />
              <span className="text-violet-700 dark:text-violet-300">
                Step counts show distinct users per event for the selected date range (independent counts). True
                ordered-funnel sequencing will come from the backend scheduler.
              </span>
            </div>

            {/* ── Funnel Visualization ── */}
            <FunnelVisualization
              funnel={activeFunnel}
              selectedStepId={selectedStepId}
              onStepClick={handleStepClick}
            />
          </>
        )}
      </div>

      <FunnelBuilder
        open={builderOpen}
        catalog={catalog}
        loading={loading}
        isLive={isLive}
        onClose={() => setBuilderOpen(false)}
        onSave={handleSaveFunnel}
      />
    </section>
  );
}
