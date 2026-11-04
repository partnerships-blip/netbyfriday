'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Field, Input, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { goalFields } from '@/components/forms';
import { ImportPrototype } from '@/components/ImportPrototype';
import { useAction, toast } from '@/components/Toaster';
import { saveBrand, saveProfile, savePrefs, saveGoals, setDemoMode } from '@/app/(app)/actions';
import { ACCENTS } from '@/lib/brand';
import { flag } from '@/lib/flags';
import { formatCents } from '@/lib/finance/core.js';
import type { Brand, Profile } from '@/lib/types';

// Module-level so inputs inside keep focus across re-renders.
function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return <Card className="flex flex-col gap-4 p-5"><div><h2 className="text-base font-semibold">{title}</h2>{sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}</div>{children}</Card>;
}

export function SettingsClient({ brand, profile, prefs, demo, email, goals }: { brand: Brand; profile: Profile; prefs: Record<string, boolean>; demo: boolean; email: string; goals: { monthly: number; annual: number } }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [name, setName] = useState(brand.name);
  const [p, setP] = useState({ displayName: profile.displayName, businessName: profile.businessName, niche: profile.niche, location: profile.location, platforms: profile.platforms.join(', ') });
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const refresh = () => router.refresh();
  const logo = async (f?: File) => {
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast('Logo must be under 2 MB.', 'error');
    const fd = new FormData(); fd.append('file', f);
    const r = await fetch('/api/logo', { method: f ? 'POST' : 'DELETE', body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return toast(j.error || 'Upload failed.', 'error');
    toast('Logo updated'); refresh();
  };
  const Toggle = ({ k, label, desc }: { k: string; label: string; desc: string }) => (
    <div className="flex items-center gap-3.5 border-t border-soft2 py-2.5">
      <div className="flex-1"><div className="text-sm font-medium">{label}</div><div className="text-[13px] text-muted">{desc}</div></div>
      <button role="switch" aria-checked={prefs[k]} aria-label={label} onClick={() => run(() => savePrefs({ [k]: !prefs[k] }), refresh)} className={cx('relative h-6 w-[42px] flex-none rounded-full transition', prefs[k] ? 'bg-ink' : 'bg-line2')}><span className={cx('absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all', prefs[k] ? 'left-[21px]' : 'left-[3px]')} /></button>
    </div>
  );

  return (
    <div className="flex max-w-[820px] flex-col gap-3">
      {demo && <Card className="flex flex-wrap items-center gap-3 border-dashed p-4"><span className="flex-1 text-sm">You are viewing demo data. Settings below apply to your real workspace.</span><Btn variant="primary" onClick={() => run(() => setDemoMode(false), refresh)}>Switch to my workspace</Btn></Card>}
      {flag('whiteLabel') && <Section title="Brand" sub="Working title and identity. Changes apply everywhere.">
        <Field label="Product name"><div className="flex max-w-[460px] gap-2"><Input value={name} onChange={e => setName(e.target.value)} maxLength={60} /><Btn disabled={pending || demo || name === brand.name} onClick={() => run(() => saveBrand({ name }), refresh)}>Save</Btn></div></Field>
        <Field label="Logo">
          <div className="flex items-center gap-2.5">
            {brand.logoUrl ? <div className="h-11 w-11 rounded-[10px] border border-line bg-cover bg-center" style={{ backgroundImage: `url("${brand.logoUrl}")` }} /> : <div className="stripes h-11 w-11 rounded-[10px] border border-line" />}
            <label className={cx('inline-flex h-9 cursor-pointer items-center rounded-[9px] border border-line2 px-3.5 text-[13px]', demo && 'pointer-events-none opacity-50')}>Upload PNG, JPG or WebP<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => logo(e.target.files?.[0])} /></label>
            {brand.logoUrl && !demo && <Btn variant="ghost" onClick={async () => { await fetch('/api/logo', { method: 'DELETE' }); refresh(); }}>Remove</Btn>}
          </div>
        </Field>
        <Field label="Accent color"><div className="flex gap-2.5">{Object.entries(ACCENTS).map(([k, a]) => <button key={k} disabled={demo} aria-label={a.label} title={a.label} aria-pressed={brand.accent === k} onClick={() => run(() => saveBrand({ accent: k }), refresh)} className="h-9 w-9 rounded-full border-[3px] border-white" style={{ background: a.ac, boxShadow: `0 0 0 ${brand.accent === k ? 2 : 1}px #32152F` }} />)}</div></Field>
        <Field label="Headline typeface"><div className="flex flex-wrap gap-2">{([['serif', 'Editorial serif', 'var(--font-serif)'], ['sans', 'Modern sans', 'var(--font-geist-sans)']] as const).map(([k, l, ff]) => (
          <button key={k} disabled={demo} aria-pressed={brand.headlineFont === k} onClick={() => run(() => saveBrand({ headlineFont: k }), refresh)} className={cx('h-[52px] rounded-[10px] border px-[18px] text-2xl', brand.headlineFont === k ? 'border-ink bg-white' : 'border-line2 bg-paper')} style={{ fontFamily: ff }}>{l}</button>))}</div></Field>
      </Section>}

      <Section title="Creator profile" sub={`Signed in as ${email}`}>
        <div className="grid gap-3 sm:grid-cols-2">
          {([['displayName', 'Name'], ['businessName', 'Business name'], ['niche', 'Niche'], ['location', 'Location'], ['platforms', 'Platforms (comma separated)']] as const).map(([k, l]) => <Field key={k} label={l}><Input value={p[k]} onChange={e => setP({ ...p, [k]: e.target.value })} /></Field>)}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Btn variant="primary" disabled={pending || demo} onClick={() => run(() => saveProfile({ ...p, platforms: p.platforms.split(',').map(s => s.trim()).filter(Boolean) }), refresh)}>Save profile</Btn>
          <span className="text-[13px] text-sub">Monthly goal {goals.monthly ? formatCents(goals.monthly) : 'not set'} · Annual goal {goals.annual ? formatCents(goals.annual) : 'not set'}</span>
          <Btn size="sm" disabled={demo} onClick={() => setGoalsOpen(true)}>Edit goals</Btn>
        </div>
      </Section>

      <Section title="Notifications">
        <div><Toggle k="dailyBriefing" label="Daily briefing in app" desc="Shown on Overview each day." />
          <Toggle k="emailDigest" label="Email digest" desc="Weekly summary by email. Off until you opt in. Delivery is not active in this beta." />
          <Toggle k="pushAlerts" label="Push notifications" desc="Deadline and payment alerts. Off until you opt in. Delivery is not active in this beta." /></div>
      </Section>

      <Section title="Privacy" sub="The beta team sees only aggregate usage, never your earnings, contracts, or records.">
        <div><Toggle k="analyticsOptIn" label="Share product usage analytics" desc="Event names only (for example, 'invoice created'). No amounts, names, or record contents." /></div>
        <div className="flex flex-wrap gap-2"><a href="/api/export" className="inline-flex h-9 items-center rounded-[10px] border border-line2 bg-white px-3.5 text-[13px] font-medium">Export my data (JSON)</a></div>
      </Section>

      <Section title="Integrations" sub="Planned. Each will use the platform's official API and ask for your permission first.">
        <div>{[['Gmail', 'Detect brand inquiries and payment emails. Read-only.'], ['Instagram', 'Followers, reach and content performance.'], ['TikTok', 'Account and video metrics.'], ['YouTube', 'Channel analytics.'], ['Stripe', 'Subscriptions and invoice payment links.']].map(([n, d]) => (
          <div key={n} className="flex items-center gap-3.5 border-t border-soft2 py-2.5"><div className="flex-1"><div className="text-sm font-medium">{n}</div><div className="text-[13px] text-muted">{d}</div></div><span className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">Not available yet</span></div>))}</div>
      </Section>

      <Section title="Data" sub="Demo mode shows a fictional creator and is read-only. Your workspace holds only what you enter.">
        <div className="flex flex-wrap gap-2">
          <Btn variant="primary" onClick={() => run(() => setDemoMode(!demo), refresh)}>{demo ? 'Switch to my workspace' : 'View the demo'}</Btn>
          <Btn disabled={demo} onClick={() => setImportOpen(true)}>Import from the prototype</Btn>
        </div>
      </Section>

      <FormModal open={goalsOpen} onClose={() => setGoalsOpen(false)} title="Revenue goals" fields={goalFields} initial={{ monthly: goals.monthly ? String(goals.monthly / 100) : '', annual: goals.annual ? String(goals.annual / 100) : '' }} submitLabel="Save goals" action={async v => { const r = await saveGoals(v); if (r.ok) refresh(); return r; }} />
      <ImportPrototype open={importOpen} onClose={() => setImportOpen(false)} onDone={s => { toast(s); setImportOpen(false); refresh(); }} />
    </div>
  );
}
