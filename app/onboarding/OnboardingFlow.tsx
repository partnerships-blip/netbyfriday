'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Eyebrow, Field, Input, Select, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { useAction, toast } from '@/components/Toaster';
import { CsvImport } from '@/components/CsvImport';
import { ImportPrototype } from '@/components/ImportPrototype';
import { flag } from '@/lib/flags';
import { saveOnboardingStep, saveGoals, completeOnboarding, setDemoMode, createDeal, createInvoice, addIncome } from '@/app/(app)/actions';
import { dealFields, invoiceFields, incomeFields } from '@/components/forms';
import type { Profile } from '@/lib/types';

const NICHES = ['Food & cooking', 'Beauty', 'Fashion', 'Lifestyle', 'Travel', 'Fitness & wellness', 'Parenting', 'Home & design', 'Tech', 'Gaming', 'Finance', 'Comedy', 'Other'];
const PRIORITIES = ['Earn more from brand partnerships', 'Get organized financially', 'Find new business opportunities', 'Understand my business performance', 'Build more predictable income', 'Grow beyond brand deals'];

function Chips({ options, value, onChange, multi }: { options: string[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean }) {
  return <div className="flex flex-wrap gap-2">{options.map(o => {
    const on = multi ? (value as string[]).includes(o) : value === o;
    return <button key={o} type="button" aria-pressed={on} onClick={() => onChange(multi ? (on ? (value as string[]).filter(x => x !== o) : [...(value as string[]), o]) : o)}
      className={cx('h-9 rounded-full border px-3.5 text-sm', on ? 'border-ink bg-ink text-white' : 'border-line2 bg-white')}>{o}</button>;
  })}</div>;
}

export function OnboardingFlow({ profile, today, goals }: { profile: Profile; today: string; goals: { monthly: number; annual: number } }) {
  const router = useRouter();
  const [step, setStep] = useState(Math.max(1, Math.min(3, profile.onboardingStep || 1)));
  const [p, setP] = useState({ displayName: profile.displayName, businessName: profile.businessName, niche: profile.niche || NICHES[0], location: profile.location, platforms: profile.platforms, followerRange: profile.followerRange || '10k–50k', revenueStreams: profile.revenueStreams, hasManager: profile.hasManager, businessStructure: profile.businessStructure || 'Individual / sole proprietor', priority: profile.priority });
  const [goalType, setGoalType] = useState<'Monthly' | 'Annual'>('Monthly');
  const [goal, setGoal] = useState(goals.monthly ? String(goals.monthly / 100) : '');
  const [err, setErr] = useState('');
  const [modal, setModal] = useState<'' | 'deal' | 'invoice' | 'income' | 'csv' | 'proto'>('');
  const [added, setAdded] = useState<string[]>([]);
  const [pending, run] = useAction();
  const upd = (k: keyof typeof p) => (v: any) => { setP(s => ({ ...s, [k]: v })); setErr(''); };

  const next = () => {
    if (step === 1 && !p.displayName.trim()) return setErr('Add your name.');
    if (step === 2 && !p.priority) return setErr('Pick one priority. You can change it later.');
    run(async () => {
      if (step === 2 && goal.trim()) {
        const n = Number(goal.replace(/[^0-9.]/g, '')); if (!n) return { ok: false, error: 'Enter the goal as a number, like 10000.' };
        const g = await saveGoals(goalType === 'Monthly' ? { monthly: String(n), annual: String(n * 12) } : { monthly: String(Math.round(n / 12)), annual: String(n) });
        if (!g.ok) return g;
      }
      return saveOnboardingStep(step + 1, p);
    }, () => setStep(s => s + 1));
  };
  const finish = () => run(() => completeOnboarding(), () => router.replace('/overview'));
  const demo = () => run(async () => { await saveOnboardingStep(step, p); return setDemoMode(true); }, () => router.replace('/overview'));
  const onAdded = (label: string) => () => { setAdded(a => [...a, label]); setModal(''); };

  return (
    <div className="flex min-h-dvh bg-bg">
      <div className="sticky top-0 hidden h-dvh w-[42%] max-w-[560px] flex-col justify-between bg-ink px-12 py-11 text-bg md:flex">
        <div className="flex items-center gap-2.5"><div className="h-[22px] w-[22px] rounded-md bg-ac" /><div className="text-[15px] font-semibold">netbyfriday</div></div>
        <div className="font-head text-[60px] leading-none text-balance">The business behind being booked.</div>
        <ol className="flex flex-col gap-2.5">{['Create an account', 'Creator profile', 'Business goals', 'Import business information'].map((l, i) => (
          <li key={l} className={cx('flex gap-3.5 text-sm', i === step ? 'text-white' : i < step ? 'text-[#CDB9C9]' : 'text-[#6C4B67]')}><span className="font-mono text-xs">0{i + 1}</span>{l}</li>))}</ol>
      </div>
      <div className="flex flex-1 justify-center px-5 py-8 md:px-12 md:py-16">
        <div className="animate-in flex w-full max-w-[560px] flex-col gap-7">
          <div className="flex flex-col gap-2.5"><Eyebrow>Step {step + 1} of 4</Eyebrow><div className="h-[3px] overflow-hidden rounded bg-line"><div className="h-full bg-ink transition-[width]" style={{ width: `${(step + 1) * 25}%` }} /></div></div>

          {step === 1 && <div className="flex flex-col gap-5">
            <div><h1 className="font-head text-[42px] leading-tight">Your creator profile</h1><p className="mt-2 text-[15px] text-muted">This shapes your dashboard and how the Advisor frames suggestions.</p></div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Your name"><Input value={p.displayName} onChange={e => upd('displayName')(e.target.value)} /></Field>
              <Field label="Creator or business name"><Input value={p.businessName} onChange={e => upd('businessName')(e.target.value)} /></Field>
              <Field label="Primary niche"><Select value={p.niche} onChange={e => upd('niche')(e.target.value)}>{NICHES.map(n => <option key={n}>{n}</option>)}</Select></Field>
              <Field label="Location"><Input value={p.location} onChange={e => upd('location')(e.target.value)} placeholder="City, State" /></Field>
            </div>
            <Field label="Main platforms"><Chips multi options={['Instagram', 'TikTok', 'YouTube', 'Pinterest', 'Substack', 'Podcast', 'Twitch']} value={p.platforms} onChange={upd('platforms')} /></Field>
            <Field label="Approximate followers (largest platform)"><Chips options={['Under 10k', '10k–50k', '50k–100k', '100k–250k', '250k–1M', '1M+']} value={p.followerRange} onChange={upd('followerRange')} /></Field>
            <Field label="Revenue streams"><Chips multi options={['Brand partnerships', 'Affiliate', 'Events', 'Digital products', 'Appearances', 'Other']} value={p.revenueStreams} onChange={upd('revenueStreams')} /></Field>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field label="Work with a talent manager?"><Chips options={['No', 'Yes']} value={p.hasManager ? 'Yes' : 'No'} onChange={v => upd('hasManager')(v === 'Yes')} /></Field>
              <Field label="Business structure"><Select value={p.businessStructure} onChange={e => upd('businessStructure')(e.target.value)}>{['Individual / sole proprietor', 'LLC', 'S-Corp', 'Partnership', 'Not sure yet'].map(n => <option key={n}>{n}</option>)}</Select></Field>
            </div>
          </div>}

          {step === 2 && <div className="flex flex-col gap-5">
            <h1 className="font-head text-[42px] leading-tight text-balance">What is your biggest business priority right now?</h1>
            <div className="grid gap-2.5 sm:grid-cols-2">{PRIORITIES.map(o => (
              <button key={o} type="button" onClick={() => upd('priority')(o)} aria-pressed={p.priority === o} className={cx('flex min-h-16 items-start gap-3 rounded-xl border p-4 text-left text-[15px] leading-snug', p.priority === o ? 'border-ink bg-white' : 'border-line2 bg-paper')}>
                <span className={cx('mt-0.5 h-4 w-4 flex-none rounded-full border-[1.5px]', p.priority === o ? 'border-ink bg-ink' : 'border-line2')} />{o}</button>))}</div>
            <Field label="Revenue goal (optional)">
              <div className="flex flex-wrap gap-2.5">
                <Chips options={['Monthly', 'Annual']} value={goalType} onChange={setGoalType} />
                <div className="flex h-10 min-w-[180px] flex-1 items-center gap-1.5 rounded-[10px] border border-line2 bg-white px-3"><span className="text-muted">$</span><input inputMode="decimal" value={goal} onChange={e => setGoal(e.target.value)} placeholder="10,000" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
              </div>
            </Field>
          </div>}

          {step === 3 && <div className="flex flex-col gap-5">
            <div><h1 className="font-head text-[42px] leading-tight">Bring in your business</h1><p className="mt-2 text-[15px] text-muted">Your dashboard shows only what you add. Nothing is estimated or filled in for you.</p></div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {([['Import from CSV', 'A spreadsheet of past partnerships.', 'csv'], ['Add a partnership', 'Enter one deal by hand.', 'deal'], ['Add an invoice', 'Track money you are owed.', 'invoice'], ['Record past income', 'Money you received without an invoice.', 'income'], ...(flag('prototypeImport') ? [['Import from the prototype', 'Bring over records saved in this browser.', 'proto']] : [])] as string[][]).map(([t, d, k]) => (
                <button key={t} type="button" disabled={!k} onClick={() => setModal(k as any)} className="flex flex-col gap-1 rounded-xl border border-line2 bg-paper p-4 text-left hover:border-ink disabled:cursor-not-allowed disabled:opacity-55">
                  <span className="text-[15px] font-semibold">{t}</span><span className="text-[13px] leading-snug text-muted">{d}</span></button>))}
            </div>
            {added.length > 0 && <div className="flex flex-col gap-1.5"><Eyebrow>Added</Eyebrow>{added.map((a, i) => <div key={i} className="flex items-center gap-2 text-sm"><span className="h-1.5 w-1.5 rounded-full bg-ok" />{a}</div>)}</div>}
          </div>}

          {err && <p role="alert" className="text-sm text-danger">{err}</p>}
          <div className="flex flex-wrap items-center gap-2.5">
            {step > 1 && <Btn size="lg" onClick={() => setStep(s => s - 1)}>Back</Btn>}
            <Btn variant="primary" size="lg" disabled={pending} onClick={step === 3 ? finish : next}>{step === 3 ? 'Go to my dashboard' : 'Continue'}</Btn>
            <Btn variant="ghost" className="ml-auto" onClick={demo}>Skip and explore the demo</Btn>
          </div>
        </div>
      </div>
      <FormModal open={modal === 'deal'} onClose={() => setModal('')} title="Add a partnership" fields={dealFields} initial={{ stage: 'paid' }} submitLabel="Add partnership" action={async v => { const r = await createDeal(v); if (r.ok) onAdded(`Partnership · ${v.brand}`)(); return r; }} />
      <FormModal open={modal === 'invoice'} onClose={() => setModal('')} title="Add an invoice" fields={invoiceFields([])} initial={{ issuedOn: today, terms: 'Net 30', stream: 'brand' }} submitLabel="Add invoice" action={async v => { const r = await createInvoice(v); if (r.ok) onAdded(`Invoice · ${v.clientName}`)(); return r; }} />
      <FormModal open={modal === 'income'} onClose={() => setModal('')} title="Record income" note="Only money you actually received. Invoiced work should be recorded as a payment on the invoice instead." fields={incomeFields} initial={{ receivedOn: today, stream: 'affiliate' }} submitLabel="Add income" action={async v => { const r = await addIncome(v); if (r.ok) onAdded(`Income · ${v.amount}`)(); return r; }} />
      <CsvImport open={modal === 'csv'} onClose={() => setModal('')} onDone={n => { setAdded(a => [...a, `${n} partnerships from CSV`]); setModal(''); }} />
      <ImportPrototype open={modal === 'proto'} onClose={() => setModal('')} onDone={s => { setAdded(a => [...a, s]); setModal(''); toast('Prototype records imported'); }} />
    </div>
  );
}
