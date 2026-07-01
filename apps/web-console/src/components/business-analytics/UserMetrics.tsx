import { TrendingUp, UserPlus, UsersRound } from 'lucide-react';
import { formatNumber } from './formatters';
import type { UserMetricMock } from '@/data/businessAnalyticsMock';

const iconByMetric = {
  dau: UsersRound,
  mau: UsersRound,
  'new-signups': UserPlus,
} satisfies Record<UserMetricMock['key'], typeof UsersRound>;

export function UserMetrics({ userMetrics }: { userMetrics: UserMetricMock[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="app-heading text-lg font-semibold">User Metrics</h2>
        <p className="app-muted mt-1 text-sm">Mock activity and acquisition metrics with trend badges.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {userMetrics.map((metric) => {
          const Icon = iconByMetric[metric.key];
          const trendSymbol = metric.trendDirection === 'up' ? '↑' : '→';
          return (
            <article key={metric.key} className="app-surface rounded-lg p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="app-muted text-sm font-semibold">{metric.label}</p>
                <Icon className="size-5 text-[#6246ea] dark:text-violet-300" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-[#111827] dark:text-slate-100">{formatNumber(metric.value)}</p>
              <span
                className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  metric.trendDirection === 'up'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {metric.trendDirection === 'up' ? <TrendingUp className="size-3" /> : null}
                {trendSymbol} {metric.trendPercent}%
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
