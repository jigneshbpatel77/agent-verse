'use client';

import { ApiClient } from '@/api/client';
import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Megaphone } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DataSourceBadge } from './DataSourceBadge';
import { formatCurrency, formatNumber } from './formatters';

interface MetricBlock {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  installs: number;
  ctr: number;
  cvr: number;
  cpc: number;
  cpm: number;
  cpi: number;
  cpa: number;
  target_cpa: number;
  cpa_efficiency: number;
}

interface DimensionSlice extends MetricBlock {
  dimension: string;
  spend_share: number;
}

interface CampaignSlice extends MetricBlock {
  campaign_id: string;
  campaign_name: string;
  platform: string;
  campaign_type: string;
  status: string;
  spend_share: number;
}

interface TimeSeriesPoint extends MetricBlock {
  date: string;
}

interface AnalyticsInsight {
  severity: 'info' | 'warning' | 'critical';
  code: string;
  message: string;
}

interface CampaignAnalyticsReport {
  start_date: string;
  end_date: string;
  totals: MetricBlock;
  previous_totals: MetricBlock;
  deltas: Record<string, number>;
  time_series: TimeSeriesPoint[];
  by_platform: DimensionSlice[];
  by_campaign_type: DimensionSlice[];
  by_source: DimensionSlice[];
  by_status: DimensionSlice[];
  top_campaigns: CampaignSlice[];
  insights: AnalyticsInsight[];
  data_source: 'live' | 'unavailable';
}

type DimensionKey = 'by_platform' | 'by_campaign_type' | 'by_source' | 'by_status';

const DIMENSION_TABS: { key: DimensionKey; label: string }[] = [
  { key: 'by_platform', label: 'Platform' },
  { key: 'by_campaign_type', label: 'Campaign Type' },
  { key: 'by_source', label: 'Source' },
  { key: 'by_status', label: 'Status' },
];

export function CampaignAnalytics({ startDate, endDate }: { startDate: string; endDate: string }) {
  const [report, setReport] = useState<CampaignAnalyticsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDimension, setActiveDimension] = useState<DimensionKey>('by_platform');

  useEffect(() => {
    const controller = new AbortController();
    const client = new ApiClient({ baseUrl: window.location.origin });
    const params = new URLSearchParams({ start_date: startDate, end_date: endDate });

    setIsLoading(true);
    setError(null);
    setReport(null);

    client
      .get<CampaignAnalyticsReport>(`/api/analytics-agent/api/v1/google-ads/analytics?${params.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setReport(data);
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [startDate, endDate]);

  const chartData = useMemo(
    () =>
      (report?.time_series ?? []).map((point) => ({
        date: point.date.slice(5), // MM-DD
        spend: point.spend,
        cpi: point.cpi,
      })),
    [report],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="app-heading text-lg font-semibold">Campaign Analytics (Google Ads)</h2>
          <p className="app-muted mt-1 text-sm">
            Multi-dimensional spend &amp; efficiency analysis with period-over-period comparison.
          </p>
        </div>
        <DataSourceBadge source={report?.data_source === 'live' ? 'live' : 'estimated'} />
      </div>

      {isLoading ? (
        <div className="app-surface rounded-lg p-8 text-center text-sm app-muted">Loading campaign analytics…</div>
      ) : error ? (
        <div className="app-surface rounded-lg p-6 text-sm text-amber-600 dark:text-amber-300">
          Campaign analytics unavailable: {error}
        </div>
      ) : !report || report.data_source !== 'live' ? (
        <div className="app-surface rounded-lg p-6 text-sm app-muted">
          No campaign data cached for this range yet. Spend data populates on first load from the VehicleInfo API.
        </div>
      ) : (
        <>
          <KpiStrip totals={report.totals} deltas={report.deltas} />

          <div className="grid gap-4 xl:grid-cols-3">
            <article className="app-surface rounded-lg p-5 xl:col-span-2">
              <h3 className="text-base font-semibold text-[#111827] dark:text-slate-100">Daily Spend &amp; CPI</h3>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="spendFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#6246ea" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#6246ea" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" strokeOpacity={0.4} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#94a3b8" width={56} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#94a3b8" width={40} />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === 'spend' ? [formatCurrency(value), 'Spend'] : [value.toFixed(2), 'CPI']
                      }
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="spend"
                      stroke="#6246ea"
                      fill="url(#spendFill)"
                      strokeWidth={2}
                    />
                    <Line yAxisId="right" type="monotone" dataKey="cpi" stroke="#10b981" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </article>

            <InsightsPanel insights={report.insights} />
          </div>

          <DimensionBreakdown
            tabs={DIMENSION_TABS}
            active={activeDimension}
            onChange={setActiveDimension}
            slices={report[activeDimension]}
          />

          <TopCampaignsTable campaigns={report.top_campaigns} />
        </>
      )}
    </section>
  );
}

function KpiStrip({ totals, deltas }: { totals: MetricBlock; deltas: Record<string, number> }) {
  const kpis: { label: string; value: string; deltaKey?: string; invertGood?: boolean }[] = [
    { label: 'Ad Spend', value: formatCurrency(totals.spend), deltaKey: 'spend' },
    { label: 'Conversions', value: formatNumber(totals.conversions), deltaKey: 'conversions' },
    { label: 'Installs', value: formatNumber(totals.installs), deltaKey: 'installs' },
    { label: 'CPA', value: `₹${totals.cpa.toFixed(2)}`, deltaKey: 'cpa', invertGood: true },
    { label: 'CPI', value: `₹${totals.cpi.toFixed(2)}`, deltaKey: 'cpi', invertGood: true },
    { label: 'CTR', value: `${totals.ctr.toFixed(2)}%`, deltaKey: 'ctr' },
    { label: 'CVR', value: `${totals.cvr.toFixed(2)}%`, deltaKey: 'cvr' },
    { label: 'CPA vs Target', value: `${totals.cpa_efficiency.toFixed(2)}×` },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const delta = kpi.deltaKey ? deltas[kpi.deltaKey] : undefined;
        return (
          <article key={kpi.label} className="app-surface rounded-lg p-4">
            <p className="app-muted text-xs font-semibold uppercase tracking-wide">{kpi.label}</p>
            <p className="mt-2 text-xl font-semibold text-[#111827] dark:text-slate-100">{kpi.value}</p>
            {delta !== undefined && Number.isFinite(delta) ? <DeltaBadge delta={delta} invertGood={kpi.invertGood} /> : null}
          </article>
        );
      })}
    </div>
  );
}

function DeltaBadge({ delta, invertGood = false }: { delta: number; invertGood?: boolean }) {
  if (delta === 0) {
    return <span className="app-muted mt-1 inline-block text-xs">— no change</span>;
  }
  const isGood = invertGood ? delta < 0 : delta > 0;
  const Icon = delta > 0 ? ArrowUpRight : ArrowDownRight;
  const tone = isGood ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300';
  return (
    <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon className="size-3.5" />
      {Math.abs(delta).toFixed(1)}% vs prev
    </span>
  );
}

function InsightsPanel({ insights }: { insights: AnalyticsInsight[] }) {
  const toneBySeverity: Record<AnalyticsInsight['severity'], string> = {
    critical: 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300',
    warning:
      'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300',
    info: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300',
  };
  return (
    <article className="app-surface rounded-lg p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[#111827] dark:text-slate-100">
        <Megaphone className="size-4 text-[#6246ea]" /> Insights
      </h3>
      <ul className="mt-4 space-y-2">
        {insights.map((insight) => (
          <li key={insight.code} className={`rounded-lg border px-3 py-2 text-xs ${toneBySeverity[insight.severity]}`}>
            {insight.message}
          </li>
        ))}
      </ul>
    </article>
  );
}

function DimensionBreakdown({
  tabs,
  active,
  onChange,
  slices,
}: {
  tabs: { key: DimensionKey; label: string }[];
  active: DimensionKey;
  onChange: (key: DimensionKey) => void;
  slices: DimensionSlice[];
}) {
  return (
    <article className="app-surface rounded-lg p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-[#111827] dark:text-slate-100">Spend Breakdown</h3>
        <div className="inline-flex flex-wrap gap-1 rounded-lg bg-[#f1f3f9] p-1 dark:bg-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                active === tab.key
                  ? 'bg-white text-[#6246ea] shadow-sm dark:bg-slate-700 dark:text-violet-200'
                  : 'app-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="app-muted border-b border-[#e6eaf2] text-left text-xs uppercase tracking-wide dark:border-slate-700">
              <th className="pb-2 pr-4 font-semibold">Dimension</th>
              <th className="pb-2 pr-4 text-right font-semibold">Spend</th>
              <th className="pb-2 pr-4 text-right font-semibold">Share</th>
              <th className="pb-2 pr-4 text-right font-semibold">Conv.</th>
              <th className="pb-2 pr-4 text-right font-semibold">CPA</th>
              <th className="pb-2 pr-4 text-right font-semibold">CPI</th>
              <th className="pb-2 pr-4 text-right font-semibold">CTR</th>
              <th className="pb-2 text-right font-semibold">CVR</th>
            </tr>
          </thead>
          <tbody>
            {slices.map((slice) => (
              <tr key={slice.dimension} className="border-b border-[#f1f3f9] last:border-0 dark:border-slate-800">
                <td className="py-2 pr-4 font-medium text-[#111827] dark:text-slate-100">{slice.dimension}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(slice.spend)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  <div className="flex items-center justify-end gap-2">
                    <span className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-[#eef0f6] sm:block dark:bg-slate-700">
                      <span
                        className="block h-full rounded-full bg-[#6246ea]"
                        style={{ width: `${Math.min(slice.spend_share, 100)}%` }}
                      />
                    </span>
                    {slice.spend_share.toFixed(1)}%
                  </div>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(slice.conversions)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">₹{slice.cpa.toFixed(2)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{slice.cpi > 0 ? `₹${slice.cpi.toFixed(2)}` : '—'}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{slice.ctr.toFixed(2)}%</td>
                <td className="py-2 text-right tabular-nums">{slice.cvr.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function TopCampaignsTable({ campaigns }: { campaigns: CampaignSlice[] }) {
  return (
    <article className="app-surface rounded-lg p-5">
      <h3 className="text-base font-semibold text-[#111827] dark:text-slate-100">Top Campaigns by Spend</h3>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="app-muted border-b border-[#e6eaf2] text-left text-xs uppercase tracking-wide dark:border-slate-700">
              <th className="pb-2 pr-4 font-semibold">Campaign</th>
              <th className="pb-2 pr-4 font-semibold">Type</th>
              <th className="pb-2 pr-4 text-right font-semibold">Spend</th>
              <th className="pb-2 pr-4 text-right font-semibold">Share</th>
              <th className="pb-2 pr-4 text-right font-semibold">Conv.</th>
              <th className="pb-2 pr-4 text-right font-semibold">CPA</th>
              <th className="pb-2 text-right font-semibold">vs Target</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => (
              <tr key={campaign.campaign_id} className="border-b border-[#f1f3f9] last:border-0 dark:border-slate-800">
                <td className="max-w-[260px] truncate py-2 pr-4 font-medium text-[#111827] dark:text-slate-100">
                  {campaign.campaign_name || campaign.campaign_id}
                </td>
                <td className="py-2 pr-4 text-xs app-muted">{campaign.campaign_type || '—'}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatCurrency(campaign.spend)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{campaign.spend_share.toFixed(1)}%</td>
                <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(campaign.conversions)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">₹{campaign.cpa.toFixed(2)}</td>
                <td className="py-2 text-right tabular-nums">
                  {campaign.cpa_efficiency > 0 ? (
                    <span
                      className={
                        campaign.cpa_efficiency > 1.2
                          ? 'text-rose-600 dark:text-rose-300'
                          : 'text-emerald-600 dark:text-emerald-300'
                      }
                    >
                      {campaign.cpa_efficiency.toFixed(2)}×
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
