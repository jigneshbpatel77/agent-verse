'use client';

import { Calculator, IndianRupee } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatCurrency, formatMultiplier, formatNumber, safeDivide } from './formatters';
import type { CACCalculatorMock } from '@/data/businessAnalyticsMock';

type CalculatorField =
  | 'totalAdSpend'
  | 'whatsappCrmSpend'
  | 'challanAdSpend'
  | 'insuranceAdSpend'
  | 'newSignupsThisMonth'
  | 'challanConversions'
  | 'insuranceClicks';

const fields: Array<{ key: CalculatorField; label: string; prefix?: string }> = [
  { key: 'totalAdSpend', label: 'Total ad spend', prefix: '₹' },
  { key: 'whatsappCrmSpend', label: 'WhatsApp CRM spend', prefix: '₹' },
  { key: 'challanAdSpend', label: 'Challan ad spend', prefix: '₹' },
  { key: 'insuranceAdSpend', label: 'Insurance ad spend', prefix: '₹' },
  { key: 'newSignupsThisMonth', label: 'New signups this month' },
  { key: 'challanConversions', label: 'Challan conversions' },
  { key: 'insuranceClicks', label: 'Insurance clicks' },
];

export function CACCalculator({ calculator }: { calculator: CACCalculatorMock }) {
  const [values, setValues] = useState({
    totalAdSpend: calculator.totalAdSpend,
    whatsappCrmSpend: calculator.whatsappCrmSpend,
    challanAdSpend: calculator.challanAdSpend,
    insuranceAdSpend: calculator.insuranceAdSpend,
    newSignupsThisMonth: calculator.newSignupsThisMonth,
    challanConversions: calculator.challanConversions,
    insuranceClicks: calculator.insuranceClicks,
  });

  const outputs = useMemo(() => {
    const overallCAC = safeDivide(values.totalAdSpend, values.newSignupsThisMonth);
    const challanCAC = safeDivide(values.challanAdSpend, values.challanConversions);
    const insuranceCAC = safeDivide(values.insuranceAdSpend, values.insuranceClicks);
    const spendEfficiency = safeDivide(calculator.revenueForEfficiency, values.totalAdSpend);

    return {
      overallCAC,
      challanCAC,
      insuranceCAC,
      spendEfficiency,
    };
  }, [calculator.revenueForEfficiency, values]);

  function updateValue(key: CalculatorField, value: string) {
    const numericValue = Number(value);
    setValues((current) => ({
      ...current,
      [key]: Number.isFinite(numericValue) ? numericValue : 0,
    }));
  }

  return (
    <section className="app-surface rounded-lg p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="size-5 text-[#6246ea] dark:text-violet-300" />
            <h2 className="app-heading text-lg font-semibold">User Acquisition Cost Calculator</h2>
          </div>
          <p className="app-muted mt-1 text-sm">Edit mock spend and conversion inputs to see CAC health update live.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-lg border border-[#e6eaf2] px-3 py-2 text-xs font-medium text-[#4f5d73] dark:border-slate-700 dark:text-slate-300">
          <IndianRupee className="size-4 text-[#6246ea] dark:text-violet-300" />
          Revenue base {formatCurrency(calculator.revenueForEfficiency)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <label key={field.key} className="block rounded-lg border border-[#e6eaf2] p-3 dark:border-slate-700">
              <span className="app-muted block text-xs font-semibold">{field.label}</span>
              <span className="mt-2 flex h-10 items-center rounded-lg border border-[#e1e6ef] bg-white px-3 dark:border-slate-700 dark:bg-slate-950/40">
                {field.prefix ? <span className="mr-2 text-sm text-[#71809a] dark:text-slate-400">{field.prefix}</span> : null}
                <input
                  type="number"
                  min="0"
                  value={values[field.key]}
                  onChange={(event) => updateValue(field.key, event.target.value)}
                  className="w-full bg-transparent text-sm font-semibold text-[#111827] outline-none dark:text-slate-100"
                />
              </span>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <CACResult label="Overall CAC" value={outputs.overallCAC} />
          <CACResult label="Challan CAC" value={outputs.challanCAC} />
          <CACResult label="Insurance CAC" value={outputs.insuranceCAC} />
          <div className="rounded-lg border border-[#e6eaf2] p-4 dark:border-slate-700 dark:bg-slate-950/30">
            <p className="app-muted text-xs font-semibold">Spend efficiency score</p>
            <p className="mt-2 text-xl font-semibold text-[#111827] dark:text-slate-100">{formatMultiplier(outputs.spendEfficiency)}</p>
            <p className="app-muted mt-1 text-xs">Revenue / Total Spend</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CACResult({ label, value }: { label: string; value: number }) {
  const health = getCACHealth(value);

  return (
    <div className="rounded-lg border border-[#e6eaf2] p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="app-muted text-xs font-semibold">{label}</p>
          <p className="mt-2 text-xl font-semibold text-[#111827] dark:text-slate-100">{formatCurrency(value)}</p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${health.className}`}>{health.label}</span>
      </div>
      <p className="app-muted mt-1 text-xs">{formatNumber(Math.round(value))} per acquisition unit</p>
    </div>
  );
}

function getCACHealth(value: number) {
  if (value < 50) {
    return {
      label: 'Healthy',
      className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
  }
  if (value <= 150) {
    return {
      label: 'Watch',
      className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    };
  }
  return {
    label: 'High',
    className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
  };
}
