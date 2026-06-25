import { redirect } from 'next/navigation';

export default function DeploymentsPage() {
  redirect('/agents/analytics?tab=optimization');
}
