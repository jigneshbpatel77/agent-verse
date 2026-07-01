import { Info, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatNumber } from './formatters';
import type { InsuranceRevenueMock } from '@/data/businessAnalyticsMock';

const RATE_LABELS: Record<string, string> = {
  bike: '₹200 / sale',
  car: '₹600 / sale',
  cv: '₹1,200 / sale',
};

export function InsuranceRevenueCard({
  insuranceRevenue,
  note,
}: {
  insuranceRevenue: InsuranceRevenueMock[];
  note: string;
}) {
  const totalSales = insuranceRevenue.reduce((s, i) => s + i.saleCount, 0);
  const totalRevenue = insuranceRevenue.reduce((s, i) => s + i.revenue, 0);

  return (
    <section className="app-surface rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-[#6246ea] dark:text-violet-300" />
            <h2 className="app-heading text-lg font-semibold">Insurance Revenue — Policybazaar Affiliate</h2>
          </div>
          <p className="app-muted mt-1 text-sm">Bike, Car &amp; CV affiliate revenue from date-wise confirmed Policybazaar counts.</p>
        </div>
        <div className="inline-flex max-w-xl items-start gap-2 rounded-lg border border-[#e6eaf2] bg-[#fbfcff] px-3 py-2 text-xs text-[#4f5d73] dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">
          <Info className="mt-0.5 size-4 shrink-0 text-[#6246ea] dark:text-violet-300" />
          <span>{note}</span>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-[#e6eaf2] dark:border-slate-700">
        {/* Table header */}
        <div className="grid grid-cols-3 border-b border-[#e6eaf2] bg-[#f8f9fc] px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[#6b7280] dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
          <span>Category</span>
          <span className="text-center">Total Sales</span>
          <span className="text-right">Revenue</span>
        </div>

        {/* Category rows */}
        {insuranceRevenue.map((item, idx) => (
          <div
            key={item.key}
            className={`grid grid-cols-3 items-center px-4 py-3.5 text-sm ${idx < insuranceRevenue.length - 1 ? 'border-b border-[#e6eaf2] dark:border-slate-700' : ''}`}
          >
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[#111827] dark:text-slate-100">{item.title}</span>
              <span className="text-xs text-[#9ca3af] dark:text-slate-500">
                {RATE_LABELS[item.key] ?? `₹${formatNumber(item.ratePerSale)} / sale`}
              </span>
            </div>
            <div className="text-center font-semibold text-[#111827] dark:text-slate-100">
              {formatNumber(item.saleCount)}
            </div>
            <div className="text-right font-semibold text-emerald-600 dark:text-emerald-300">
              {formatCurrency(item.revenue)}
            </div>
          </div>
        ))}

        {/* Total row */}
        {insuranceRevenue.length > 1 && (
          <div className="grid grid-cols-3 items-center border-t border-[#e6eaf2] bg-[#f8f9fc] px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900/60">
            <span className="font-bold text-[#111827] dark:text-slate-100">Total</span>
            <span className="text-center font-bold text-[#111827] dark:text-slate-100">
              {formatNumber(totalSales)}
            </span>
            <span className="text-right font-bold text-emerald-600 dark:text-emerald-300">
              {formatCurrency(totalRevenue)}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
