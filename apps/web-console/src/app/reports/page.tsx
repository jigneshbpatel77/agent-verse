import { redirect } from 'next/navigation';

export default function ReportsPage() {
  redirect('/agents/analytics?tab=business');
}
