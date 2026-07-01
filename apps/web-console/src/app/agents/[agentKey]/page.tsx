import { AgentDashboard } from '@/modules/agents/agent-dashboard';
import { redirect } from 'next/navigation';

export default async function AgentPage({ params }: { params: Promise<{ agentKey: string }> }) {
  const { agentKey } = await params;
  if (agentKey !== 'analytics') {
    redirect('/agents/analytics?tab=dashboard');
  }

  return <AgentDashboard agentKey="analytics" />;
}
