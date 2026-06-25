import { redirect } from 'next/navigation';

export default function SettingsPage() {
  redirect('/agents/analytics?tab=system');
}
