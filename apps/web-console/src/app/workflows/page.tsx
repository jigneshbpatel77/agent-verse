import { redirect } from 'next/navigation';

export default function WorkflowsPage() {
  redirect('/agents/analytics?tab=system');
}
