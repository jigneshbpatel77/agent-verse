export function DataSourceBadge({ source }: { source: 'live' | 'estimated' }) {
  const isLive = source === 'live';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isLive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
      }`}
    >
      {isLive ? 'Live' : 'Estimated'}
    </span>
  );
}
