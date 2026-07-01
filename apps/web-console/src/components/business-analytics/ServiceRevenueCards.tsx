import { CreditCard, Gauge, ReceiptIndianRupee } from 'lucide-react';
import { DataSourceBadge } from './DataSourceBadge';
import { formatCurrency, formatNumber } from './formatters';
import type { ServiceRevenueMock } from '@/data/businessAnalyticsMock';

const iconByService = {
  challan: ReceiptIndianRupee,
  'service-history': Gauge,
  fastag: CreditCard,
} satisfies Record<ServiceRevenueMock['key'], typeof ReceiptIndianRupee>;

export function ServiceRevenueCards({
  services,
  totalAdSpend,
}: {
  services: ServiceRevenueMock[];
  totalAdSpend: number;
}) {
  const totalServiceRevenue = services.reduce((sum, service) => sum + service.amount, 0);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="app-heading text-lg font-semibold">Service-wise Revenue</h2>
        <p className="app-muted mt-1 text-sm">
          Total revenue and order count by service for the selected date range. Spend/Profit are allocated from
          total ad spend by revenue share.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        {services.map((service) => {
          const Icon = iconByService[service.key];
          const allocatedSpend =
            totalServiceRevenue > 0 ? (service.amount / totalServiceRevenue) * totalAdSpend : 0;
          const profit = service.amount - allocatedSpend;
          return (
            <article key={service.key} className="app-surface rounded-lg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[#111827] dark:text-slate-100">{service.title}</h3>
                  <p className="app-muted mt-1 text-sm">{service.description}</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-500/15 dark:text-violet-200">
                  <Icon className="size-5" />
                </span>
              </div>

              <p className="mt-5 text-2xl font-semibold text-[#111827] dark:text-slate-100">{formatCurrency(service.amount)}</p>

              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-lg border border-[#e6eaf2] p-3 dark:border-slate-700">
                  <dt className="app-muted text-xs">Total Orders</dt>
                  <dd className="mt-1 font-semibold text-[#111827] dark:text-slate-100">{formatNumber(service.recordCount)}</dd>
                </div>
                <div className="rounded-lg border border-[#e6eaf2] p-3 dark:border-slate-700">
                  <dt className="app-muted flex items-center justify-between gap-2 text-xs">
                    Spend
                    <DataSourceBadge source="estimated" />
                  </dt>
                  <dd className="mt-1 font-semibold text-[#111827] dark:text-slate-100">{formatCurrency(allocatedSpend)}</dd>
                </div>
                <div className="rounded-lg border border-[#e6eaf2] p-3 dark:border-slate-700 sm:col-span-2">
                  <dt className="app-muted flex items-center justify-between gap-2 text-xs">
                    Profit
                    <DataSourceBadge source="estimated" />
                  </dt>
                  <dd
                    className={`mt-1 font-semibold ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'}`}
                  >
                    {formatCurrency(profit)}
                  </dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}
