import { RcSystemDashboard } from '@/modules/analytics/rc-system/rc-system-dashboard';

export default async function SystemAnalyticsServicePage({
  params,
}: {
  params: Promise<{ serviceKey: string }>;
}) {
  const { serviceKey } = await params;
  return <RcSystemDashboard serviceKey={serviceKey} />;
}
