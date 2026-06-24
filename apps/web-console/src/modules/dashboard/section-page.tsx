import { Activity, ClipboardCheck, Database, FileBarChart, Inbox, Layers3, Settings, TriangleAlert, Workflow } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  Workflows: Workflow,
  Tasks: Layers3,
  Approvals: ClipboardCheck,
  Alerts: TriangleAlert,
  Reports: FileBarChart,
  'Knowledge Base': Database,
  Deployments: Activity,
  Incidents: Inbox,
  Settings,
};

export function SectionPage({ title }: { title: string }) {
  const Icon = icons[title] ?? Activity;

  return (
    <div className="space-y-6">
      <section className="app-surface rounded-lg p-6">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-lg bg-[#efecff] text-[#6246ea] dark:bg-violet-950/40 dark:text-violet-300">
            <Icon className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">{title}</h1>
            <p className="mt-1 text-sm text-[#71809a] dark:text-slate-400">Operational workspace for {title.toLowerCase()}.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {['Open', 'In Progress', 'Resolved'].map((label, index) => (
          <article key={label} className="app-surface rounded-lg p-5">
            <p className="text-sm font-medium text-[#71809a] dark:text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold text-slate-950 dark:text-slate-50">{[24, 11, 148][index]}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
