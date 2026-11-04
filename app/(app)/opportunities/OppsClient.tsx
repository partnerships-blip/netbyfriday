'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Pill, Empty, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { DraftModal, type DraftTarget } from '@/components/DraftModal';
import { oppFields } from '@/components/forms';
import { useAction, toast } from '@/components/Toaster';
import { createOpportunity, setOpportunityStatus, restoreOpportunities } from '@/app/(app)/actions';
import type { Opportunity } from '@/lib/types';

export function OppsClient({ opps, suggestions, readOnly }: { opps: Opportunity[]; suggestions: { name: string; fit: string; dealId?: string }[]; readOnly: boolean }) {
  const router = useRouter();
  const [cat, setCat] = useState('All');
  const [adding, setAdding] = useState<null | Record<string, string>>(null);
  const [draft, setDraft] = useState<DraftTarget | null>(null);
  const [, run] = useAction();
  const refresh = () => router.refresh();
  const visible = opps.filter(o => o.status !== 'dismissed');
  const cats = ['All', ...Array.from(new Set(visible.map(o => o.category)))];
  const list = visible.filter(o => cat === 'All' || o.category === cat);
  const dismissed = opps.length - visible.length;
  const set = (id: string, status: Opportunity['status']) => readOnly ? toast('Demo mode is read-only.') : run(() => setOpportunityStatus({ id, status }), refresh);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex flex-1 flex-wrap gap-1.5">{cats.map(c => <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)} className={cx('h-8 rounded-full border px-3.5 text-[13px]', cat === c ? 'border-ink bg-ink text-white' : 'border-line2 bg-white')}>{c}</button>)}</div>
        {!readOnly && <Btn variant="primary" onClick={() => setAdding({ category: 'Potential new brand outreach', source: 'Added by you' })}>Add opportunity</Btn>}
      </div>

      {suggestions.length > 0 && !readOnly && <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-center gap-2"><Pill tone="accent">Suggested opportunity</Pill><span className="text-[13px] text-sub">Past paid partners you haven't contacted in 90+ days</span></div>
        {suggestions.map(s => <div key={s.name} className="flex flex-wrap items-center gap-2 border-t border-soft2 pt-2 text-sm"><span className="font-medium">{s.name}</span><span className="flex-1 text-xs text-muted">{s.fit}</span>
          <Btn size="sm" onClick={() => setAdding({ name: s.name, category: 'Past brand renewal', source: 'Your records · ' + s.fit, fit: s.fit })}>Track</Btn></div>)}
      </Card>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
        {list.map(o => (
          <Card key={o.id} className="flex flex-col gap-3 p-[18px]">
            <div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">{o.category}</span><Pill tone={o.status === 'saved' ? 'ink' : o.status === 'pitched' ? 'ok' : 'accent'}>{o.status[0].toUpperCase() + o.status.slice(1)}</Pill></div>
            <div><h3 className="font-head text-[26px] leading-[1.1]">{o.name}</h3>{o.location && <div className="mt-1 text-[13px] text-muted">{o.location}</div>}</div>
            {o.fit && <div><div className="text-xs font-semibold">Why it may fit</div><p className="text-sm leading-relaxed text-[#4A2A45]">{o.fit}</p></div>}
            {o.angle && <div><div className="text-xs font-semibold">Suggested angle</div><p className="text-sm leading-relaxed text-[#4A2A45]">{o.angle}</p></div>}
            <div className="font-mono text-[11px] leading-relaxed text-muted">Source: {o.source}</div>
            <div className="mt-auto flex flex-wrap gap-1.5">
              <Btn variant="accent" onClick={() => setDraft({ kind: 'Pitch: ' + o.name, opportunityId: o.id, label: o.name })}>Draft pitch</Btn>
              <Btn onClick={() => set(o.id, o.status === 'saved' ? 'new' : 'saved')}>{o.status === 'saved' ? 'Saved' : 'Save'}</Btn>
              {o.status !== 'pitched' && <Btn onClick={() => set(o.id, 'pitched')}>Mark pitched</Btn>}
              <Btn variant="ghost" onClick={() => set(o.id, 'dismissed')}>Dismiss</Btn>
            </div>
          </Card>
        ))}
      </div>
      {!list.length && <Empty>Opportunities come from your partnership history and leads you add yourself. As you record paid partnerships, renewal suggestions will appear above.</Empty>}
      {dismissed > 0 && !readOnly && <Btn variant="ghost" className="w-fit" onClick={() => run(() => restoreOpportunities(), refresh)}>Restore {dismissed} dismissed</Btn>}
      {adding && <FormModal open onClose={() => setAdding(null)} title="Add opportunity" fields={oppFields} initial={adding} submitLabel="Add opportunity" action={async v => { const r = await createOpportunity(v); if (r.ok) refresh(); return r; }} />}
      <DraftModal target={draft} onClose={() => setDraft(null)} />
    </div>
  );
}
