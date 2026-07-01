'use client';

import { ArrowRight, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DateRangeMock } from '@/data/businessAnalyticsMock';

export function DateRangeFilter({
  range,
  onApply,
  dataSourceLabel = 'Static fallback mock data',
  isLoading = false,
  errorMessage,
}: {
  range: DateRangeMock;
  onApply: (range: DateRangeMock) => void;
  dataSourceLabel?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
}) {
  const [draftRange, setDraftRange] = useState(range);

  useEffect(() => {
    setDraftRange(range);
  }, [range]);

  return (
    <section className="app-surface rounded-lg p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="app-heading text-2xl font-semibold">Business Analytics</h1>
          <p className="app-muted mt-1 text-sm">
            Data source: {isLoading ? 'Loading live RDS/DuckDB report...' : dataSourceLabel}
          </p>
          <p className="mt-2 text-xs font-medium text-[#71809a] dark:text-slate-400">
            Applied range: {range.startDate} to {range.endDate}
          </p>
          {errorMessage ? (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">{errorMessage}</p>
          ) : null}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onApply(draftRange);
          }}
          className="flex flex-wrap items-end gap-3"
        >
          <DateInput
            label="Start"
            value={draftRange.startDate}
            onChange={(value) => setDraftRange((current) => ({ ...current, startDate: value }))}
          />
          <DateInput
            label="End"
            value={draftRange.endDate}
            onChange={(value) => setDraftRange((current) => ({ ...current, endDate: value }))}
          />
          <button type="submit" className="app-button-secondary inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold">
            Apply
            <ArrowRight className="size-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-[#71809a] dark:text-slate-400">{label}</span>
      <span className="relative block">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71809a]" />
        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 rounded-lg border border-[#e1e6ef] bg-white pl-9 pr-3 text-sm font-semibold text-[#111827] outline-none transition focus:border-[#6246ea] dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-100"
        />
      </span>
    </label>
  );
}
