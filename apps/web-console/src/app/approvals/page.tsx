import { redirect } from 'next/navigation';

export default function ApprovalsPage() {
  redirect('/agents/analytics?tab=system');
}
