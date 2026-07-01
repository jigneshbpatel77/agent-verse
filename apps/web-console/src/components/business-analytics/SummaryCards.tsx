import { BadgeIndianRupee, Calculator, Target, TrendingUp, UserPlus, WalletCards } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import { TrendIndicator } from './TrendIndicator';
import { formatCurrency, formatMultiplier, safeDivide } from './formatters';
import type { SummaryMetricMock } from '@/data/businessAnalyticsMock';

export function SummaryCards({ summary, isLive }: { summary: SummaryMetricMock; isLive: boolean }) {
  const netProfit = summary.totalRevenue - summary.totalSpend;
  const previousNetProfit = summary.previousTotalRevenue - summary.previousTotalSpend;
  const roi = safeDivide(summary.totalRevenue, summary.totalSpend);
  const previousRoi = safeDivide(summary.previousTotalRevenue, summary.previousTotalSpend);
  const netProfitMargin = safeDivide(netProfit, summary.totalRevenue) * 100;
  const previousNetProfitMargin = safeDivide(previousNetProfit, summary.previousTotalRevenue) * 100;
  const cac = safeDivide(summary.adSpendTotal, summary.adInstallsTotal);
  const cacSource = summary.adSpendSource === 'live' && summary.adInstallsTotal > 0 ? 'live' : 'estimated';
  const dataSource: 'live' | 'estimated' = isLive ? 'live' : 'estimated';

  const metrics = [
    {
      label: 'Total Revenue',
      value: formatCurrency(summary.totalRevenue),
      icon: BadgeIndianRupee,
      tone: 'text-emerald-600 dark:text-emerald-300',
      source: dataSource,
      trend: { current: summary.totalRevenue, previous: summary.previousTotalRevenue, invertGood: false },
    },
    {
      label: 'Total Spend',
      value: formatCurrency(summary.totalSpend),
      icon: WalletCards,
      tone: 'text-amber-600 dark:text-amber-300',
      source: dataSource,
      trend: { current: summary.totalSpend, previous: summary.previousTotalSpend, invertGood: true },
    },
    {
      label: 'Net Profit',
      value: formatCurrency(netProfit),
      icon: TrendingUp,
      tone: netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300',
      source: dataSource,
      trend: { current: netProfit, previous: previousNetProfit, invertGood: false },
    },
    {
      label: 'ROI',
      value: formatMultiplier(roi),
      icon: Calculator,
      tone: 'text-[#6246ea] dark:text-violet-300',
      source: dataSource,
      trend: { current: roi, previous: previousRoi, invertGood: false },
    },
    {
      label: 'CAC',
      value: formatCurrency(cac),
      icon: UserPlus,
      tone: 'text-sky-600 dark:text-sky-300',
      source: cacSource as 'live' | 'estimated',
      trend: null,
    },
    {
      label: 'Net Profit Margin',
      value: `${netProfitMargin.toFixed(1)}%`,
      icon: Target,
      tone: netProfitMargin >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300',
      source: dataSource,
      trend: { current: netProfitMargin, previous: previousNetProfitMargin, invertGood: false },
    },
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <article key={metric.label} className="app-surface rounded-lg p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="app-muted text-sm font-semibold">{metric.label}</p>
              <div className="flex items-center gap-2">
                <DataSourceBadge source={metric.source} />
                <Icon className={`size-5 ${metric.tone}`} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-100">{metric.value}</p>
            {metric.trend ? <TrendIndicator {...metric.trend} /> : null}
          </article>
        );
      })}
      {summary.budgetVsActual ? (
        <article className="app-surface rounded-lg p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="app-muted text-sm font-semibold">Budget vs Actual (CPA)</p>
            <DataSourceBadge source="live" />
          </div>
          <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-100">
            {formatCurrency(summary.budgetVsActual.actualCpa)}
            <span className="app-muted ml-2 text-sm font-medium">
              / target {formatCurrency(summary.budgetVsActual.targetCpa)}
            </span>
          </p>
        </article>
      ) : null}
    </section>
  );
}
