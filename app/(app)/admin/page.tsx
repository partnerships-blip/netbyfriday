import { notFound } from 'next/navigation';
import { loadApp } from '@/lib/data/load';
import { createClient } from '@/lib/supabase/server';
import { PageHeader, Card, Eyebrow } from '@/components/ui';
import { AdminClient } from './AdminClient';
import { WaitlistAdmin } from './WaitlistAdmin';
import { SITE } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const app = await loadApp();
  if (!app.isAdmin) notFound();
  const sb = createClient();
  // These functions return aggregates only and check admin status in the database.
  const [{ data: overview, error }, { data: feedback }, { data: invites }, { data: waitlist }] = await Promise.all([sb.rpc('admin_overview'), sb.rpc('admin_feedback', { p_limit: 50 }), sb.rpc('admin_invites'), sb.rpc('admin_waitlist', { p_limit: 500 })]);
  if (error) notFound();
  const o = overview as Record<string, any>;
  const stats = [['Beta users', o.users], ['Completed onboarding', o.onboarding_completed], ['Active last 7 days', o.active_7d], ['Using partnerships', o.workspaces_with_deals], ['Using invoices', o.workspaces_with_invoices], ['Recording payments', o.workspaces_with_payments], ['Using the Advisor', o.workspaces_using_advisor], ['AI requests (7d)', o.ai_requests_7d], ['Open feedback', o.feedback_open]];
  return (
    <>
      <PageHeader title="Beta admin" sub="Aggregate usage only. Earnings, contracts and business records are never shown here." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">{stats.map(([l, v]) => <Card key={l} className="flex flex-col gap-1 px-4 py-3.5"><span className="text-[13px] font-medium">{l}</span><span className="font-head text-[30px] leading-none">{v ?? 0}</span></Card>)}</div>
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex flex-col gap-2 p-5"><Eyebrow>Onboarding drop-off (not completed, by step)</Eyebrow>{Object.entries(o.onboarding_by_step ?? {}).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span>Step {Number(k) + 1}</span><span>{String(v)}</span></div>)}{!Object.keys(o.onboarding_by_step ?? {}).length && <p className="text-sm text-muted">Everyone who started has finished.</p>}</Card>
        <Card className="flex flex-col gap-2 p-5"><Eyebrow>Opt-in events, last 7 days</Eyebrow>{Object.entries(o.events_7d ?? {}).map(([k, v]) => <div key={k} className="flex justify-between text-sm"><span className="font-mono text-xs">{k}</span><span>{String(v)}</span></div>)}{!Object.keys(o.events_7d ?? {}).length && <p className="text-sm text-muted">No opted-in events yet.</p>}</Card>
      </div>
      <WaitlistAdmin rows={waitlist ?? []} signupUrl={`${SITE.url}/signup`} />
      <AdminClient feedback={feedback ?? []} invites={invites ?? []} />
    </>
  );
}
