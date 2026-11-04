import { redirect } from 'next/navigation';
import { loadApp } from '@/lib/data/load';
import { Shell } from '@/components/Shell';
import { brandVars } from '@/lib/brand';
import { dayNumber } from '@/lib/finance/core.js';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const app = await loadApp();
  if (!app.demo && !app.realProfile.onboardingCompletedAt) redirect('/onboarding');
  const m = app.metrics;
  const read = new Set(app.readKeys);
  const p = app.profile;
  const date = new Date(dayNumber(m.today) * 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return (
    <div style={brandVars(app.brand.accent, app.brand.headlineFont) as React.CSSProperties}>
      <Shell brandName={app.brand.name} logoUrl={app.brand.logoUrl} demo={app.demo} isAdmin={app.isAdmin} dateLabel={date}
        initials={(p.displayName || app.user.email || '?').split(/[\s@]/).filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase()}
        name={p.displayName || app.user.email || ''} business={p.businessName || '—'} optedIn={app.prefs.emailDigest || app.prefs.pushAlerts}
        badges={{ '/money': m.overdueInvoices.length, '/tasks': m.overdueTasks.length, '/intelligence': m.insights.filter((i: any) => i.id !== 'empty').length }}
        notifications={m.notifications.map((n: any) => ({ ...n, unread: app.demo ? true : !read.has(n.key) }))}>
        {children}
      </Shell>
    </div>
  );
}
