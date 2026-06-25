import { BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type AgentStatus = 'Active' | 'Idle' | 'Degraded' | 'Paused';

export interface AgentRecord {
  key: string;
  name: string;
  icon: LucideIcon;
  status: AgentStatus;
  activeTasks: number;
  tasks: number;
  successRate: number;
  avgResponseTime: string;
  lastActivity: string;
  version: string;
  accent: string;
}

export const analyticsAgent: AgentRecord = {
  key: 'analytics',
  name: 'Analytics Agent',
  icon: BarChart3,
  status: 'Active',
  activeTasks: 12,
  tasks: 245,
  successRate: 99.2,
  avgResponseTime: '1.12s',
  lastActivity: '42s ago',
  version: 'v1.8.2',
  accent: 'text-[#6246ea] bg-[#efecff] dark:bg-violet-950/40 dark:text-violet-300',
};

export const agents: AgentRecord[] = [analyticsAgent];

export const summaryTrend = [
  { label: '00:00', tasks: 42, success: 96, latency: 1.6 },
  { label: '03:00', tasks: 88, success: 97, latency: 1.4 },
  { label: '06:00', tasks: 132, success: 97.6, latency: 1.3 },
  { label: '09:00', tasks: 104, success: 98.1, latency: 1.5 },
  { label: '12:00', tasks: 151, success: 98.4, latency: 1.2 },
  { label: '15:00', tasks: 276, success: 98.8, latency: 1.1 },
  { label: '18:00', tasks: 221, success: 98.2, latency: 1.4 },
  { label: '21:00', tasks: 191, success: 98.7, latency: 1.42 },
];

export function getAgent(agentKey: string): AgentRecord {
  return agentKey === analyticsAgent.key ? analyticsAgent : analyticsAgent;
}
