'use client';
// Getting-started checklist on the dashboard. Progress comes from the creator's own records (nothing is ticked by hand),
// optional steps can be skipped, and the whole card can be hidden. Skips are stored per user in notification_reads.
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Btn, Bar } from '../ui';
import { FormModal } from '../FormModal';
import { dealFields, invoiceFields, contactFields } from '../forms';
import { createDeal, createInvoice, createContact, markNotificationsRead, setDemoMode } from '@/app/(app)/actions';

import type { SetupStep } from '@/lib/setup';
const COPY: Record<SetupStep['id'], { title: string; why: string; cta: string; optional: boolean }> = {
  profile: { title: 'Complete your creator profile', why: 'Your niche and platforms help the Advisor give answers that fit your business.', cta: 'Open settings', optional: false },
  brand: { title: 'Add your first brand', why: 'Add a contact at a brand you work with. Brands collect every partnership, invoice and person in one place.', cta: 'Add a brand contact', optional: true },
  deal: { title: 'Add your first partnership', why: 'Start with your most recent brand deal: the fee, the stage, and what you owe.', cta: 'Add a partnership', optional: false },
  invoice: { title: 'Set up your first invoice', why: 'Payment terms like NET30 or NET60 tell you when money is due and what’s overdue.', cta: 'Create an invoice', optional: true },
  advisor: { title: 'Ask the AI Advisor a question', why: 'Try “What should I follow up on this week?” Answers come from your own records.', cta: 'Ask the Advisor', optional: true }
};

export function SetupChecklist({ steps, today, brands, empty }: { steps: SetupStep[]; today: string; brands: string[]; empty: boolean }) {
  const [m, setM] = useState<'' | 'deal' | 'invoice' | 'contact'>('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const finished = steps.filter(s => s.done || s.skipped).length;
  const store = async (keys: string[]) => { setBusy(true); await markNotificationsRead(keys); setBusy(false); router.refresh(); };

  const act = (id: SetupStep['id']) => {
    if (id === 'profile') return <Link href="/settings" className="inline-flex h-9 items-center rounded-[10px] bg-plum px-3.5 text-[13px] font-semibold text-white">{COPY[id].cta}</Link>;
    if (id === 'advisor') return <Link href="/advisor" className="inline-flex h-9 items-center rounded-[10px] bg-plum px-3.5 text-[13px] font-semibold text-white">{COPY[id].cta}</Link>;
    return <Btn variant="primary" onClick={() => setM(id === 'brand' ? 'contact' : id)}>{COPY[id].cta}</Btn>;
  };

  return (
    <Card className="flex flex-col gap-4 p-5 md:p-6" aria-labelledby="setup-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="setup-title" className="font-head text-[26px] leading-tight">{empty ? 'Set up your workspace' : 'Finish setting up'}</h2>
          <p className="max-w-[620px] text-[14px] leading-relaxed text-muted">Every number here comes from records you add. A few minutes now and your dashboard starts working for you. Nothing to connect.</p>
        </div>
        <div className="flex flex-none items-center gap-2">
          {empty && <Btn variant="ghost" onClick={async () => { await setDemoMode(true); router.refresh(); }}>Explore the demo</Btn>}
          <Btn variant="ghost" disabled={busy} onClick={() => store(['setup:hide'])}>Hide</Btn>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1"><Bar pct={finished / steps.length * 100} h={8} /></div>
        <span className="flex-none text-[13px] font-semibold text-sub" aria-live="polite">{finished} of {steps.length} done</span>
      </div>
      <ol className="flex flex-col divide-y divide-line">
        {steps.map(s => {
          const c = COPY[s.id];
          return (
            <li key={s.id} className="flex items-start gap-3 py-3 sm:gap-4">
              <span aria-hidden className={`grid h-6 w-6 flex-none place-items-center mt-0.5 rounded-full border-2 text-[12px] font-bold ${s.done ? 'border-plum bg-plum text-white' : s.skipped ? 'border-line2 text-faint' : 'border-line2'}`}>{s.done ? '✓' : s.skipped ? '–' : ''}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"><div className="flex min-w-0 flex-1 flex-col">
                <span className={`text-[15px] font-semibold ${s.done || s.skipped ? 'text-sub line-through decoration-1' : ''}`}>{c.title}{c.optional && !s.done && <span className="ml-2 align-middle text-[11px] font-semibold uppercase tracking-[.08em] text-faint no-underline">Optional</span>}</span>
                {!s.done && !s.skipped && <span className="text-[13px] leading-snug text-sub">{c.why}</span>}
                <span className="sr-only">{s.done ? 'Done' : s.skipped ? 'Skipped' : 'Not done yet'}</span>
              </div>
              {!s.done && !s.skipped && <div className="flex flex-none flex-wrap items-center gap-2">
                {act(s.id)}
                {c.optional && <button disabled={busy} onClick={() => store([`setup:skip:${s.id}`])} className="h-9 px-2 text-[13px] font-semibold text-sub underline underline-offset-2">Skip</button>}
              </div>}
              </div>
            </li>);
        })}
      </ol>
      <FormModal open={m === 'deal'} onClose={() => setM('')} title="New partnership" fields={dealFields} initial={{ stage: 'lead' }} submitLabel="Add partnership" action={createDeal} />
      <FormModal open={m === 'invoice'} onClose={() => setM('')} title="New invoice" fields={invoiceFields([])} initial={{ issuedOn: today, terms: 'Net 30', stream: 'brand' }} submitLabel="Create invoice" action={createInvoice} />
      <FormModal open={m === 'contact'} onClose={() => setM('')} title="New contact" fields={contactFields(brands)} initial={{}} submitLabel="Add contact" action={createContact} />
    </Card>
  );
}
