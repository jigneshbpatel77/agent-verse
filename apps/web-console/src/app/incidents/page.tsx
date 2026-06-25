import { redirect } from 'next/navigation';

export default function IncidentsPage() {
  redirect('/agents/analytics?tab=root-cause');
}
