import { AgentDashboard } from '@/modules/agents/agent-dashboard';

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ agentKey: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { agentKey } = await params;
  const { tab } = await searchParams;

  return <AgentDashboard agentKey={agentKey} showServiceAnalyticsAction={agentKey === 'analytics'} initialAnalyticsKey={tab} />;
}
