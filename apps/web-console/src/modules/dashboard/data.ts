import {
  BarChart3,
  Bot,
  BrainCircuit,
  BriefcaseBusiness,
  Code2,
  FileText,
  FlaskConical,
  Megaphone,
  Network,
  Scale,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
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

export const agents: AgentRecord[] = [
  {
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
    accent: 'text-[#6246ea] bg-[#efecff] dark:bg-violet-950/40',
  },
  {
    key: 'research',
    name: 'Research Agent',
    icon: FlaskConical,
    status: 'Active',
    activeTasks: 7,
    tasks: 186,
    successRate: 97.8,
    avgResponseTime: '1.35s',
    lastActivity: '1m ago',
    version: 'v1.6.9',
    accent: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/40',
  },
  {
    key: 'architecture',
    name: 'Architecture Agent',
    icon: Network,
    status: 'Active',
    activeTasks: 4,
    tasks: 153,
    successRate: 98.1,
    avgResponseTime: '1.28s',
    lastActivity: '3m ago',
    version: 'v1.7.1',
    accent: 'text-[#6246ea] bg-[#efecff] dark:bg-violet-950/40',
  },
  {
    key: 'engineering',
    name: 'Engineering Agent',
    icon: Code2,
    status: 'Degraded',
    activeTasks: 19,
    tasks: 312,
    successRate: 98.9,
    avgResponseTime: '1.45s',
    lastActivity: '18s ago',
    version: 'v2.1.0',
    accent: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40',
  },
  {
    key: 'security',
    name: 'Security Agent',
    icon: ShieldCheck,
    status: 'Active',
    activeTasks: 3,
    tasks: 98,
    successRate: 99.5,
    avgResponseTime: '1.02s',
    lastActivity: '5m ago',
    version: 'v1.5.4',
    accent: 'text-red-500 bg-red-50 dark:bg-red-950/40',
  },
  {
    key: 'quality',
    name: 'Quality Agent',
    icon: Sparkles,
    status: 'Active',
    activeTasks: 6,
    tasks: 124,
    successRate: 97.3,
    avgResponseTime: '1.67s',
    lastActivity: '2m ago',
    version: 'v1.9.3',
    accent: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    key: 'content',
    name: 'Content Agent',
    icon: FileText,
    status: 'Idle',
    activeTasks: 1,
    tasks: 87,
    successRate: 98.6,
    avgResponseTime: '1.22s',
    lastActivity: '22m ago',
    version: 'v1.4.8',
    accent: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/40',
  },
  {
    key: 'legal-finance',
    name: 'Legal & Finance Agent',
    icon: Scale,
    status: 'Active',
    activeTasks: 2,
    tasks: 40,
    successRate: 96.8,
    avgResponseTime: '1.78s',
    lastActivity: '8m ago',
    version: 'v1.3.5',
    accent: 'text-[#6246ea] bg-[#efecff] dark:bg-violet-950/40',
  },
  {
    key: 'product',
    name: 'Product Agent',
    icon: BrainCircuit,
    status: 'Active',
    activeTasks: 5,
    tasks: 112,
    successRate: 98.2,
    avgResponseTime: '1.31s',
    lastActivity: '4m ago',
    version: 'v1.2.8',
    accent: 'text-pink-500 bg-pink-50 dark:bg-pink-950/40',
  },
  {
    key: 'devops',
    name: 'DevOps Agent',
    icon: Workflow,
    status: 'Active',
    activeTasks: 8,
    tasks: 176,
    successRate: 99.1,
    avgResponseTime: '0.96s',
    lastActivity: '35s ago',
    version: 'v2.0.2',
    accent: 'text-sky-500 bg-sky-50 dark:bg-sky-950/40',
  },
  {
    key: 'growth',
    name: 'Growth Agent',
    icon: Megaphone,
    status: 'Idle',
    activeTasks: 0,
    tasks: 64,
    successRate: 97.9,
    avgResponseTime: '1.56s',
    lastActivity: '31m ago',
    version: 'v1.1.7',
    accent: 'text-lime-600 bg-lime-50 dark:bg-lime-950/40',
  },
  {
    key: 'support',
    name: 'Support Agent',
    icon: Bot,
    status: 'Active',
    activeTasks: 11,
    tasks: 201,
    successRate: 98.7,
    avgResponseTime: '1.18s',
    lastActivity: '55s ago',
    version: 'v1.6.1',
    accent: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40',
  },
  {
    key: 'orchestration',
    name: 'Orchestration Agent',
    icon: BriefcaseBusiness,
    status: 'Active',
    activeTasks: 16,
    tasks: 289,
    successRate: 99.0,
    avgResponseTime: '0.88s',
    lastActivity: '12s ago',
    version: 'v2.2.4',
    accent: 'text-[#6246ea] bg-[#efecff] dark:bg-violet-950/40',
  },
];

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

export const taskStatusData = [
  { name: 'Completed', value: 1156, color: '#22c55e' },
  { name: 'Running', value: 132, color: '#6246ea' },
  { name: 'Failed', value: 67, color: '#ef4444' },
  { name: 'Pending', value: 48, color: '#f59e0b' },
];

export const systemComponents = [
  { name: 'API Gateway', status: 'Healthy', uptime: '99.99%', latency: '42ms' },
  { name: 'PostgreSQL', status: 'Healthy', uptime: '99.98%', latency: '18ms' },
  { name: 'Redis Cache', status: 'Healthy', uptime: '99.97%', latency: '7ms' },
  { name: 'Kafka Cluster', status: 'Healthy', uptime: '99.96%', latency: '23ms' },
  { name: 'Qdrant', status: 'Healthy', uptime: '99.95%', latency: '31ms' },
  { name: 'ClickHouse', status: 'Healthy', uptime: '99.94%', latency: '28ms' },
  { name: 'Prometheus', status: 'Healthy', uptime: '99.95%', latency: '12ms' },
  { name: 'Grafana', status: 'Healthy', uptime: '99.93%', latency: '26ms' },
];

export const recentAlerts = [
  { severity: 'High', title: 'Engineering Agent response time above 2s', time: '2m ago' },
  { severity: 'Medium', title: 'Quality Agent failed tasks increased', time: '15m ago' },
  { severity: 'Info', title: 'Vehicle Data Sync workflow started', time: '32m ago' },
  { severity: 'Low', title: 'System backup completed successfully', time: '1h ago' },
];

export const analyticsEndpoints = [
  { endpoint: '/RC/rc_details_get_and_store', requests: '186k', errorRate: '0.8%', p95: '812ms', p99: '1.42s' },
  { endpoint: '/challan/details', requests: '91k', errorRate: '1.1%', p95: '944ms', p99: '1.88s' },
  { endpoint: '/fastag/summary', requests: '74k', errorRate: '0.4%', p95: '621ms', p99: '1.21s' },
  { endpoint: '/service-history/fetch', requests: '43k', errorRate: '1.6%', p95: '1.18s', p99: '2.34s' },
];

export function getAgent(agentKey: string): AgentRecord {
  return agents.find((agent) => agent.key === agentKey) ?? agents[0];
}
