import { AgentDashboard } from '@/modules/agents/agent-dashboard';

export default async function AgentPage({ params }: { params: Promise<{ agentKey: string }> }) {
  const { agentKey } = await params;

  return <AgentDashboard agentKey={agentKey} showServiceAnalyticsAction={agentKey === 'analytics'} />;
}
