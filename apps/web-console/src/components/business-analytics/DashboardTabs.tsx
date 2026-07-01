'use client';

import { useSearchParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';

interface DashboardTab {
  key: string;
  label: string;
  content: ReactNode;
}

export function DashboardTabs({ tabs }: { tabs: DashboardTab[] }) {
  const searchParams = useSearchParams();
  const requestedKey = searchParams.get('subtab');
  const initialKey = tabs.some((tab) => tab.key === requestedKey) ? requestedKey! : tabs[0]?.key;
  const [activeKey, setActiveKey] = useState(initialKey);
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <section className="space-y-5">
      <div
        role="tablist"
        aria-label="Business analytics sections"
        className="inline-flex flex-wrap gap-1 rounded-lg border border-[#e6eaf2] bg-[#f8f9fc] p-1 dark:border-slate-700 dark:bg-slate-900/60"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveKey(tab.key)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6246ea] ${
                isActive
                  ? 'bg-white text-[#6246ea] shadow-sm dark:bg-slate-700 dark:text-violet-200'
                  : 'app-muted hover:text-[#111827] dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="space-y-6">
        {activeTab?.content}
      </div>
    </section>
  );
}
