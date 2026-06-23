export type AgentDisplayStatus = 'Active' | 'Paused' | 'Degraded' | 'Idle';

export function agentStatusDot(status: AgentDisplayStatus, pulse = false): string {
  const color = {
    Active: 'bg-emerald-500',
    Paused: 'bg-red-500',
    Degraded: 'bg-orange-500',
    Idle: 'bg-slate-400',
  }[status];

  return `relative inline-flex size-2 rounded-full ${color}${pulse ? ' animate-pulse' : ''}`;
}

export function agentStatusPill(status: AgentDisplayStatus): string {
  return {
    Active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    Paused: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    Degraded: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    Idle: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  }[status];
}

export function normalizeAgentStatus(status: string): AgentDisplayStatus {
  if (status === 'Active') return 'Active';
  if (status === 'Paused' || status === 'Offline') return 'Paused';
  if (status === 'Degraded') return 'Degraded';
  return 'Idle';
}
