'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Field, Input, Pill, Select, Textarea, cx } from '@/components/ui';
import { toast } from '@/components/Toaster';
import { saveContract, deleteContract } from '@/app/(app)/actions';
import { addDays, formatCents, parseMoneyToCents, shortDate } from '@/lib/finance/core.js';
import type { Contract, ExtractedField } from '@/lib/types';

type Deal = { id: string; label: string; brandName: string; feeCents: number };
const cents = (n: number | null) => (n === null ? '' : (n / 100).toFixed(2));

/** The contract wording a proposed term came from, and whether it was found in the text. */
function Source({ f }: { f?: ExtractedField }) {
  if (!f?.quote) return null;
  return (
    <div className={cx('rounded-[8px] border-l-[3px] px-2.5 py-1.5 text-[12px] leading-relaxed', f.found === false ? 'border-danger bg-[#FBEFEB] text-[#7A2E1E]' : 'border-[#C9D77A] bg-[#F7FBE6] text-sub')}>
      <span className="font-mono text-[10px] uppercase tracking-[.08em]">{f.found === false ? 'Not found in the contract text · check this' : f.found ? 'From the contract' : 'From the contract (PDF)'}</span>
      <span className="block italic">“{f.quote}”</span>
    </div>
  );
}

export function ContractReview({ contract: c, deals, readOnly, today, demo }: { contract: Contract; deals: Deal[]; readOnly: boolean; today: string; demo: boolean }) {
  const router = useRouter();
  const x = c.extracted;
  const confirmed = c.status === 'confirmed';
  const [v, setV] = useState({
    title: c.title, brandName: c.brandName, fee: cents(c.feeCents), paymentTerms: c.paymentTerms, signedOn: c.signedOn ?? '',
    usageRights: c.usageRights, usageStartsOn: c.usageStartsOn ?? '', usageEndsOn: c.usageEndsOn ?? '',
    exclusivity: c.exclusivity, exclusivityStartsOn: c.exclusivityStartsOn ?? '', exclusivityEndsOn: c.exclusivityEndsOn ?? '',
    whitelisting: c.whitelisting, revisions: c.revisions, killFee: c.killFee, otherTerms: c.otherTerms
  });
  const usageDays = Number(x?.fields.usageDays?.value) || null, exclDays = Number(x?.fields.exclusivityDays?.value) || null;
  const matching = deals.filter(d => v.brandName && d.brandName.toLowerCase() === v.brandName.toLowerCase());
  const [link, setLink] = useState<'none' | 'existing' | 'new'>(c.dealId ? 'existing' : matching.length ? 'existing' : 'new');
  const [dealId, setDealId] = useState(c.dealId ?? matching[0]?.id ?? '');
  const [campaign, setCampaign] = useState(x?.fields.campaign?.value || x?.fields.title?.value || c.title);   // the contract's own campaign name, not the "Brand x Creator" title
  const [updateFee, setUpdateFee] = useState(false);
  const [dels, setDels] = useState((x?.deliverables ?? []).map(d => ({ name: d.name, dueOn: d.dueOn ?? '', include: true, quote: d.quote, found: d.found })));
  const [reminders, setReminders] = useState(true);
  const [busy, setBusy] = useState<'save' | 'confirm' | 'delete' | null>(null);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV(s => ({ ...s, [k]: e.target.value }));
  const linkedDeal = deals.find(d => d.id === dealId);
  const feeCents = v.fee ? parseMoneyToCents(v.fee) : null;

  // Start date + stated length → end date, computed by the engine (never by the AI).
  const fillEnd = (start: 'usageStartsOn' | 'exclusivityStartsOn', end: 'usageEndsOn' | 'exclusivityEndsOn', days: number | null) =>
    days && v[start] ? <button type="button" className="text-[12px] text-sub underline underline-offset-2" onClick={() => setV(s => ({ ...s, [end]: addDays(s[start], days) }))}>Set end to {days} days after start ({shortDate(addDays(v[start], days))})</button> : null;

  async function submit(confirm: boolean) {
    if (readOnly) return toast('Demo mode is read-only.');
    const chosen = dels.filter(d => d.include);
    if (confirm && chosen.some(d => !d.dueOn)) return toast('Add a due date to each deliverable you’re adding, or untick it.');
    setBusy(confirm ? 'confirm' : 'save');
    const r = await saveContract({ id: c.id, confirm, ...v,
      link: confirmed ? { mode: 'none' } : link === 'existing' ? { mode: 'existing', dealId, updateFee } : link === 'new' ? { mode: 'new', campaign } : { mode: 'none' },
      deliverables: confirmed ? [] : chosen.map(d => ({ name: d.name, dueOn: d.dueOn })), reminders: !confirmed && reminders });
    setBusy(null);
    if (!r.ok) return toast(r.error);
    toast(confirm && !confirmed ? 'Contract confirmed' : 'Saved');
    if (confirm) router.push('/contracts'); else router.refresh();
  }

  // A render helper (not a component), so inputs keep focus while typing.
  const F = ({ k, label, children, wide }: { k?: string; label: string; children: ReactNode; wide?: boolean }) => (
    <div className={cx('flex flex-col gap-1.5', wide && 'md:col-span-2')}><Field label={label}>{children}</Field><Source f={k ? (x?.fields as any)?.[k] : undefined} /></div>
  );

  const summary = useMemo(() => [
    v.brandName && `Brand: ${v.brandName}`, feeCents !== null && `Fee: ${formatCents(feeCents)}`,
    v.usageEndsOn && `Usage ends ${shortDate(v.usageEndsOn)}`, v.exclusivityEndsOn && `Exclusivity ends ${shortDate(v.exclusivityEndsOn)}`
  ].filter(Boolean) as string[], [v, feeCents]);

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">{confirmed ? <Pill tone="ok">Confirmed</Pill> : <Pill tone="warn">Needs review</Pill>}{x && <Pill tone="neutral">{x.source === 'pdf' ? 'Read from PDF' : 'Read from text'}</Pill>}</div>
            <h1 className="font-head text-[36px] leading-[1.05] md:text-[44px]">{v.title || 'Untitled contract'}</h1>
            {!confirmed && <p className="max-w-[640px] text-[15px] leading-relaxed text-muted">Check each term against the contract wording shown under it. Edit anything that’s wrong. Nothing is added to your partnerships until you confirm.</p>}
          </div>
        </div>

        {!!x?.warnings.length && (
          <div className="flex flex-col gap-1 rounded-card border border-[#E8D9A8] bg-[#FBF6E6] p-4 text-[13px] leading-relaxed text-[#5C4410]">
            <span className="font-mono text-[10px] uppercase tracking-[.08em]">Please check</span>
            {x.warnings.map((w, i) => <span key={i}>• {w}</span>)}
          </div>
        )}

        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <h2 className="font-head text-[24px] md:col-span-2">Deal</h2>
          {F({ k: 'title', label: 'Contract title', children: <Input value={v.title} onChange={set('title')} disabled={readOnly} /> })}
          {F({ k: 'brandName', label: 'Brand', children: <Input value={v.brandName} onChange={set('brandName')} disabled={readOnly} /> })}
          {F({ k: 'fee', label: 'Total fee ($)', children: <Input value={v.fee} onChange={set('fee')} inputMode="decimal" disabled={readOnly} /> })}
          {F({ k: 'signedOn', label: 'Signed on', children: <Input type="date" value={v.signedOn} onChange={set('signedOn')} disabled={readOnly} /> })}
          {F({ k: 'paymentTerms', label: 'Payment terms', wide: true, children: <Input value={v.paymentTerms} onChange={set('paymentTerms')} disabled={readOnly} /> })}
        </Card>

        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <h2 className="font-head text-[24px] md:col-span-2">Usage rights</h2>
          {F({ k: 'usageRights', label: 'What the brand can do with your content', wide: true, children: <Textarea value={v.usageRights} onChange={set('usageRights')} rows={2} disabled={readOnly} /> })}
          {F({ k: 'usageStartsOn', label: 'Starts', children: <Input type="date" value={v.usageStartsOn} onChange={set('usageStartsOn')} disabled={readOnly} /> })}
          {F({ k: 'usageEndsOn', label: 'Ends', children: <Input type="date" value={v.usageEndsOn} onChange={set('usageEndsOn')} disabled={readOnly} /> })}
          <div className="md:col-span-2">{usageDays ? (v.usageStartsOn ? fillEnd('usageStartsOn', 'usageEndsOn', usageDays) : <span className="text-[12px] text-muted">The contract gives {usageDays} days. Add the start date (often the first post) to set the end date.</span>) : null}</div>
          {F({ k: 'whitelisting', label: 'Whitelisting / paid ads', wide: true, children: <Input value={v.whitelisting} onChange={set('whitelisting')} disabled={readOnly} /> })}
        </Card>

        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <h2 className="font-head text-[24px] md:col-span-2">Exclusivity</h2>
          {F({ k: 'exclusivity', label: 'What you can’t do, and in which category', wide: true, children: <Textarea value={v.exclusivity} onChange={set('exclusivity')} rows={2} disabled={readOnly} /> })}
          {F({ k: 'exclusivityStartsOn', label: 'Starts', children: <Input type="date" value={v.exclusivityStartsOn} onChange={set('exclusivityStartsOn')} disabled={readOnly} /> })}
          {F({ k: 'exclusivityEndsOn', label: 'Ends', children: <Input type="date" value={v.exclusivityEndsOn} onChange={set('exclusivityEndsOn')} disabled={readOnly} /> })}
          <div className="md:col-span-2">{exclDays ? (v.exclusivityStartsOn ? fillEnd('exclusivityStartsOn', 'exclusivityEndsOn', exclDays) : <span className="text-[12px] text-muted">The contract gives {exclDays} days. Add the start date to set the end date.</span>) : null}</div>
        </Card>

        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <h2 className="font-head text-[24px] md:col-span-2">Other terms</h2>
          {F({ k: 'revisions', label: 'Revisions', children: <Input value={v.revisions} onChange={set('revisions')} disabled={readOnly} /> })}
          {F({ k: 'killFee', label: 'Kill fee / cancellation', children: <Input value={v.killFee} onChange={set('killFee')} disabled={readOnly} /> })}
          {F({ k: 'otherTerms', label: 'Anything else to remember', wide: true, children: <Textarea value={v.otherTerms} onChange={set('otherTerms')} rows={3} disabled={readOnly} /> })}
        </Card>

        {!confirmed && (
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="font-head text-[24px]">Deliverables in this contract</h2>
            {dels.map((d, i) => (
              <div key={i} className="flex flex-col gap-1.5 border-t border-soft2 pt-3 first-of-type:border-0 first-of-type:pt-0">
                <div className="grid items-center gap-2 md:grid-cols-[24px_minmax(0,1fr)_170px]">
                  <input type="checkbox" checked={d.include} aria-label={`Add ${d.name}`} onChange={e => setDels(a => a.map((y, j) => j === i ? { ...y, include: e.target.checked } : y))} disabled={readOnly} />
                  <Input value={d.name} aria-label="Deliverable" onChange={e => setDels(a => a.map((y, j) => j === i ? { ...y, name: e.target.value } : y))} disabled={readOnly} />
                  <Input type="date" value={d.dueOn} aria-label="Due date" onChange={e => setDels(a => a.map((y, j) => j === i ? { ...y, dueOn: e.target.value } : y))} disabled={readOnly} />
                </div>
                <Source f={{ value: d.name, quote: d.quote, found: d.found }} />
              </div>))}
            {!dels.length && <p className="text-sm text-muted">No deliverables were found. You can add them to the partnership later.</p>}
            {!readOnly && <Btn size="sm" className="w-fit" onClick={() => setDels(a => [...a, { name: '', dueOn: '', include: true, quote: '', found: undefined }])}>Add a deliverable</Btn>}
          </Card>
        )}
      </div>

      <div className="flex flex-col gap-3 lg:sticky lg:top-6">
        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Original</Eyebrow>
          {c.hasFile ? <a href={`/api/contracts/${c.id}/file`} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm font-semibold underline underline-offset-2">{c.fileName || 'Open contract'} ↗</a>
            : <span className="text-sm text-muted">{demo ? 'Sample contract (no file in demo mode).' : x?.source === 'pdf' ? 'The original PDF wasn’t stored. Keep your own copy.' : 'Read from pasted text. No file stored.'}</span>}
          {summary.length > 0 && <div className="flex flex-col gap-1 border-t border-soft2 pt-3 text-[13px]">{summary.map(s => <span key={s}>{s}</span>)}</div>}
        </Card>

        {!confirmed ? (
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>When you confirm</Eyebrow>
            <Field label="Partnership">
              <Select value={link} onChange={e => setLink(e.target.value as any)} disabled={readOnly}>
                <option value="existing" disabled={!deals.length}>Add to an existing partnership</option>
                <option value="new">Create a new partnership</option>
                <option value="none">Don’t link it</option>
              </Select>
            </Field>
            {link === 'existing' && <>
              <Select value={dealId} onChange={e => setDealId(e.target.value)} aria-label="Choose partnership" disabled={readOnly}>
                <option value="">Choose…</option>{deals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </Select>
              {linkedDeal && feeCents !== null && feeCents !== linkedDeal.feeCents && (
                <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={updateFee} onChange={e => setUpdateFee(e.target.checked)} className="mt-0.5" />Update the partnership fee from {formatCents(linkedDeal.feeCents)} to {formatCents(feeCents)}</label>)}
            </>}
            {link === 'new' && <Field label="Campaign name"><Input value={campaign} onChange={e => setCampaign(e.target.value)} disabled={readOnly} /></Field>}
            <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={reminders} onChange={e => setReminders(e.target.checked)} className="mt-0.5" disabled={readOnly} />Remind me a week before usage rights and exclusivity end</label>
            <ul className="flex flex-col gap-1 rounded-[10px] bg-bg p-3 text-[12px] leading-relaxed text-sub">
              <li>• Saves these terms on the {link === 'new' ? 'new' : link === 'existing' ? 'chosen' : ''} partnership{link === 'none' ? ' (none linked)' : ''}</li>
              {dels.filter(d => d.include).length > 0 && <li>• Adds {dels.filter(d => d.include).length} deliverable{dels.filter(d => d.include).length === 1 ? '' : 's'}</li>}
              <li>• Doesn’t create invoices or change any money you’ve recorded</li>
            </ul>
            <Btn variant="primary" size="lg" disabled={readOnly || !!busy || (link === 'existing' && !dealId)} onClick={() => submit(true)}>{busy === 'confirm' ? 'Confirming…' : 'Confirm contract'}</Btn>
            <Btn disabled={readOnly || !!busy} onClick={() => submit(false)}>{busy === 'save' ? 'Saving…' : 'Save for later'}</Btn>
          </Card>
        ) : (
          <Card className="flex flex-col gap-3 p-5">
            <Eyebrow>Confirmed {c.confirmedAt ? shortDate(c.confirmedAt.slice(0, 10)) : ''}</Eyebrow>
            <Btn variant="primary" disabled={readOnly || !!busy} onClick={() => submit(true)}>{busy ? 'Saving…' : 'Save changes'}</Btn>
          </Card>
        )}
        {!readOnly && <button className="w-fit text-[13px] text-muted underline underline-offset-2 hover:text-danger" disabled={!!busy}
          onClick={async () => { if (!confirm('Delete this contract and its file? Partnerships, deliverables and tasks it created stay.')) return; setBusy('delete'); const r = await deleteContract(c.id); if (!r.ok) { setBusy(null); return toast(r.error); } router.push('/contracts'); }}>Delete contract</button>}
        <p className="text-xs leading-relaxed text-muted">Today is {shortDate(today)}. AI-read terms can be wrong; the contract itself is what counts. This isn’t legal advice.</p>
      </div>
    </div>
  );
}
