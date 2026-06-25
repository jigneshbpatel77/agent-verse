import { redirect } from 'next/navigation';

export default function AlertsPage() {
  redirect('/agents/analytics?tab=monitoring');
}
