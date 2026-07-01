import { Building2, Megaphone } from 'lucide-react';
import { formatCurrency } from './formatters';
import type { SpendBreakdownMock, SpendItemMock } from '@/data/businessAnalyticsMock';

export function SpendBreakdown({ spendBreakdown }: { spendBreakdown: SpendBreakdownMock }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="app-heading text-lg font-semibold">Spend Breakdown</h2>
        <p className="app-muted mt-1 text-sm">Mock spend inputs split by acquisition channels and operating costs.</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <SpendCard title="Ad Spend" icon={Megaphone} items={spendBreakdown.adSpend} totalLabel="Total ad spend" />
        <SpendCard title="Tools & Other" icon={Building2} items={spendBreakdown.toolsAndOther} totalLabel="Total other spend" />
      </div>
    </section>
  );
}

function SpendCard({
  title,
  icon: Icon,
  items,
  totalLabel,
}: {
  title: string;
  icon: typeof Megaphone;
  items: SpendItemMock[];
  totalLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <article className="app-surface rounded-lg p-5">
      <div className="flex items-center gap-2">
        <Icon className="size-5 text-[#6246ea] dark:text-violet-300" />
        <h3 className="app-heading text-base font-semibold">{title}</h3>
      </div>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 rounded-lg border border-[#e6eaf2] px-3 py-3 text-sm dark:border-slate-700">
            <span className="text-[#4f5d73] dark:text-slate-300">{item.label}</span>
            <span className="font-semibold text-[#111827] dark:text-slate-100">{formatCurrency(item.amount)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4 rounded-lg bg-[#efecff] px-3 py-3 text-sm dark:bg-violet-500/15">
        <span className="font-semibold text-[#4f3ee7] dark:text-violet-200">{totalLabel}</span>
        <span className="font-semibold text-[#4f3ee7] dark:text-violet-200">{formatCurrency(total)}</span>
      </div>
    </article>
  );
}
