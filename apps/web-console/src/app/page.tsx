import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/agents/analytics?tab=dashboard');
}
