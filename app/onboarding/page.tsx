import { redirect } from 'next/navigation';
import { requireWorkspace, todayIn } from '@/lib/auth';
import { mapProfile } from '@/lib/data/load';
import { brandVars } from '@/lib/brand';
import { OnboardingFlow } from './OnboardingFlow';
import { Toaster } from '@/components/Toaster';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { sb, ws } = await requireWorkspace();
  const { data } = await sb.from('creator_profiles').select('*').eq('workspace_id', ws.id).single();
  const profile = mapProfile(data);
  if (profile.onboardingCompletedAt) redirect('/overview');
  return (
    <div style={brandVars(ws.accent, ws.headline_font) as React.CSSProperties}>
      <OnboardingFlow profile={profile} today={todayIn(ws.timezone)} goals={{ monthly: Number(ws.monthly_goal_cents), annual: Number(ws.annual_goal_cents) }} />
      <Toaster />
    </div>
  );
}
