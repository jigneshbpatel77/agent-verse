import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export function TrendIndicator({
  current,
  previous,
  invertGood = false,
}: {
  current: number;
  previous: number;
  invertGood?: boolean;
}) {
  if (!Number.isFinite(previous) || previous === 0) {
    return null;
  }

  const changePercent = ((current - previous) / Math.abs(previous)) * 100;
  const isGood = invertGood ? changePercent <= 0 : changePercent >= 0;
  const Icon = changePercent >= 0 ? ArrowUpRight : ArrowDownRight;
  const tone = isGood ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300';

  return (
    <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon className="size-3.5" />
      {Math.abs(changePercent).toFixed(1)}% vs previous period
    </span>
  );
}
