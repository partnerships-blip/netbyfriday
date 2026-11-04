import { loadApp } from '@/lib/data/load';
import { PageHeader } from '@/components/ui';
import { SettingsClient } from './SettingsClient';

export default async function SettingsPage() {
  const app = await loadApp();
  return (
    <>
      <PageHeader title="Settings" sub="Brand, profile, goals, notifications and data." />
      <SettingsClient brand={app.brand} profile={app.realProfile} prefs={app.prefs} demo={app.demo} email={app.user.email ?? ''}
        goals={{ monthly: Number(app.ws.monthly_goal_cents), annual: Number(app.ws.annual_goal_cents) }} />
    </>
  );
}
