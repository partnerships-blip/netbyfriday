'use client';
import { flag } from '@/lib/flags';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from '@/components/Modal';
import { Btn, Eyebrow, Input, Select, Textarea, Pill, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { DraftModal, type DraftTarget } from '@/components/DraftModal';
import { dealFields, deliverableFields } from '@/components/forms';
import { DEAL_TYPE_LABEL, SCHEDULE_LABEL, TRIGGER_LABEL } from '@/lib/deals';
import { useAction, toast } from '@/components/Toaster';
import { addDeliverable, updateDeliverable, deleteDeliverable, updateDeal, deleteDeal } from '@/app/(app)/actions';
import { STAGES, formatCents, shortDate, dealOutstanding } from '@/lib/finance/core.js';
import { DELIVERABLE_LABEL } from '@/lib/brand';
import type { Contact, Deal, Deliverable, Stage, Task } from '@/lib/types';
import Link from 'next/link';
import { TaskList } from '@/components/TaskList';
import type { InvoiceLite } from './Board';

const DTONE: Record<string, any> = { not_started: 'neutral', in_progress: 'accent', in_review: 'warn', approved: 'ok', posted: 'ok', scheduled: 'neutral' };
const DRAFTS = ['Following up on an unanswered proposal', 'Requesting a contract', 'Following up on payment', 'Reconnecting with a previous partner', 'Proposing a new campaign'];

export function DealDrawer({ deal, allDeals, contacts = [], tasks = [], invoices, received, onClose, onMove, onSettle, readOnly, today }: { onSettle?: (id: string) => void; deal: Deal | null; allDeals: Deal[]; contacts?: Contact[]; tasks?: Task[]; invoices: InvoiceLite[]; received: Record<string, number>; onClose: () => void; onMove: (id: string, s: Stage) => void; readOnly: boolean; today: string }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftTarget | null>(null);
  const [dl, setDl] = useState({ name: '', dueOn: '' });
  const [editDel, setEditDel] = useState<Deliverable | null>(null);
  const [notes, setNotes] = useState(deal?.notes ?? '');
  useEffect(() => setNotes(deal?.notes ?? ''), [deal?.id, deal?.notes]);
  if (!deal) return null;
  const guard = (fn: () => void) => () => (readOnly ? toast('Demo mode is read-only.') : fn());
  const history = allDeals.filter(d => d.brandName === deal.brandName && d.stage !== 'lost').sort((a, b) => (a.startedOn < b.startedOn ? 1 : -1));
  const paidDeals = history.filter(d => (received[d.id] || 0) > 0);
  const brandInvoices = invoices.filter(v => history.some(d => d.id === v.dealId) || v.clientName.toLowerCase() === deal.brandName.toLowerCase());
  // Same basis as Brands & Contacts: payments recorded on this brand's invoices, linked or billed to it by name.
  const histReceived = brandInvoices.reduce((a, v) => a + v.paidCents, 0);
  const facts: [string, string][] = [['Type', DEAL_TYPE_LABEL[deal.dealType ?? 'sponsored']], ...(deal.giftedValueCents ? [['Gifted product value', `${formatCents(deal.giftedValueCents)} · non-cash, not revenue`] as [string, string]] : []), ...(deal.commissionTerms ? [['Commission', `${deal.commissionTerms} · counted when paid out`] as [string, string]] : []), ['Payment schedule', [SCHEDULE_LABEL[deal.paymentSchedule ?? 'single'], deal.scheduleNote].filter(Boolean).join(' · ')], ['Payment clock starts', deal.paymentTrigger ? TRIGGER_LABEL[deal.paymentTrigger] : 'Not set'], ['Agency', deal.agency], ['Contact', deal.contactName], ['Email', deal.contactEmail], ['Platforms', deal.platforms.join(', ')], ['Contract', deal.contractStatus], ['Usage rights', deal.usageRights], ['Exclusivity', deal.exclusivity], ['Payment terms', deal.paymentTerms], ['Content category', deal.contentCategory], ['Started', shortDate(deal.startedOn)], ['Last contact', shortDate(deal.lastContactOn)], ['Received on this deal', formatCents(received[deal.id] || 0)]];
  const cycle = (s: string) => { const order = ['not_started', 'in_progress', 'in_review', 'approved', 'posted']; return order[(order.indexOf(s) + 1) % order.length]; };
  const refresh = () => router.refresh();

  return (
    <Drawer open onClose={onClose}>
      <div className="flex flex-col gap-[22px] px-6 py-[22px]">
        <div className="flex items-start gap-3">
          <div className="flex flex-1 flex-col gap-1"><Eyebrow>{deal.brandName}{deal.agency ? ` · via ${deal.agency}` : ''}</Eyebrow><h2 className="font-head text-[32px] leading-[1.08]">{deal.campaign || deal.brandName}</h2></div>
          <Btn onClick={onClose}>Close</Btn>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Select aria-label="Stage" value={deal.stage} disabled={readOnly} onChange={e => onMove(deal.id, e.target.value as Stage)} className="w-auto">{STAGES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</Select>
          <span className="font-head text-[28px]">{formatCents(deal.feeCents)}</span>
          <span className="text-xs text-muted">{deal.feeIsEstimate ? 'Your estimate, not an offer' : 'Agreed fee · not revenue until paid'}</span>
          {!readOnly && <Btn size="sm" className="ml-auto" onClick={() => setEditing(true)}>Edit details</Btn>}
        </div>
        {deal.stage === 'paid' && (() => {
          const out = dealOutstanding(deal, invoices.filter(v => v.dealId === deal.id));
          if (out.known ? out.totalCents === 0 : (received[deal.id] || 0) > 0) return null;
          return (
            <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-[#E8D9A8] bg-[#FBF6E6] p-3.5 text-[13px] text-[#5C4410]">
              <span className="min-w-0 flex-1">Marked Paid, but {out.known ? `${formatCents(out.totalCents)} isn’t recorded yet` : 'no payment is recorded yet'}. Revenue counts only recorded payments.</span>
              {!readOnly && onSettle && <Btn size="sm" variant="primary" onClick={() => onSettle(deal.id)}>{out.known ? `Record ${formatCents(out.totalCents)} received` : 'Record payment'}</Btn>}
            </div>);
        })()}
        {deal.description && <p className="text-[15px] leading-relaxed text-[#4A2A45]">{deal.description}</p>}
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-soft bg-soft sm:grid-cols-2">
          {facts.map(([k, v]) => <div key={k} className="flex flex-col gap-0.5 bg-white px-3 py-2.5"><dt className="text-[11px] text-muted">{k}</dt><dd className="break-words text-sm leading-snug">{v || '—'}</dd></div>)}
        </dl>

        <section className="flex flex-col gap-2">
          <Eyebrow>Deliverables</Eyebrow>
          {deal.deliverables.map(x => (
            <div key={x.id} className="flex items-center gap-3 border-b border-soft2 py-2.5">
              <div className="min-w-0 flex-1"><div className="text-sm font-medium">{x.name}{x.platform ? <span className="font-normal text-muted"> · {x.platform}</span> : null}</div>
                <div className="text-xs text-muted">{[x.submitBy && !x.submittedOn ? `Draft due ${shortDate(x.submitBy)}` : '', x.submittedOn ? `Submitted ${shortDate(x.submittedOn)}` : '', x.revisions ? `${x.revisions} revision${x.revisions === 1 ? '' : 's'}` : '', x.publishedOn ? `Published ${shortDate(x.publishedOn)}` : `Post by ${shortDate(x.dueOn)}`, x.notes].filter(Boolean).join(' · ')}</div>
                {x.contentUrl && <a href={x.contentUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-ink underline underline-offset-2">View post</a>}</div>
              <button disabled={readOnly || pending} title="Advance status" onClick={() => run(() => updateDeliverable({ id: x.id, status: cycle(x.status) }), refresh)}><Pill tone={DTONE[x.status]}>{DELIVERABLE_LABEL[x.status]}</Pill></button>
              {!readOnly && <button aria-label={`Edit ${x.name}`} className="text-xs text-muted hover:text-ink" onClick={() => setEditDel(x)}>Edit</button>}
              {!readOnly && <button aria-label={`Remove ${x.name}`} className="text-xs text-muted hover:text-danger" onClick={() => confirm(`Remove “${x.name}”?`) && run(() => deleteDeliverable(x.id), refresh)}>Remove</button>}
            </div>
          ))}
          {!deal.deliverables.length && <p className="text-sm text-muted">No deliverables yet.</p>}
          {!readOnly && <form className="flex flex-wrap gap-1.5" onSubmit={e => { e.preventDefault(); if (!dl.name.trim() || !dl.dueOn) return toast('Add a name and due date.', 'error'); run(() => addDeliverable({ dealId: deal.id, name: dl.name, dueOn: dl.dueOn }), () => { setDl({ name: '', dueOn: '' }); refresh(); }); }}>
            <Input aria-label="Deliverable" value={dl.name} onChange={e => setDl({ ...dl, name: e.target.value })} placeholder="e.g. 1 TikTok video" className="h-9 min-w-[160px] flex-1" />
            <Input aria-label="Due date" type="date" value={dl.dueOn} onChange={e => setDl({ ...dl, dueOn: e.target.value })} className="h-9 w-auto" />
            <Btn variant="primary" disabled={pending}>Add</Btn>
          </form>}
        </section>

        <section className="flex flex-col gap-2">
          <Eyebrow>Contact</Eyebrow>
          {(() => {
            const linked = contacts.find(c => c.id === deal.contactId);
            const options = [...contacts].sort((a, b) => Number(b.brandId === deal.brandId) - Number(a.brandId === deal.brandId) || a.name.localeCompare(b.name));
            return (<>
              {linked ? <Link href={`/contacts?contact=${linked.id}`} className="flex flex-col rounded-xl border border-line px-3 py-2.5 hover:border-faint"><span className="text-sm font-semibold">{linked.name}</span><span className="text-xs text-muted">{[linked.role, linked.email, linked.phone].filter(Boolean).join(' · ') || 'No details yet'}</span></Link>
                : <p className="text-sm text-muted">{deal.contactName ? `${deal.contactName}${deal.contactEmail ? ' · ' + deal.contactEmail : ''} (not saved as a contact)` : 'No contact linked.'}</p>}
              {!readOnly && <div className="flex flex-wrap items-center gap-2">
                <Select aria-label="Linked contact" value={deal.contactId ?? ''} className="h-9 w-auto max-w-full" onChange={e => run(() => updateDeal({ id: deal.id, contactId: e.target.value }), refresh)}>
                  <option value="">{options.length ? 'No contact' : 'No contacts saved yet'}</option>
                  {options.map(c => <option key={c.id} value={c.id}>{c.name}{c.brandName ? ` · ${c.brandName}` : ''}</option>)}
                </Select>
                <Link href="/contacts" className="text-[13px] text-sub underline underline-offset-[3px]">Add a contact</Link>
              </div>}
            </>);
          })()}
        </section>

        <section className="flex flex-col gap-2">
          <Eyebrow>Tasks</Eyebrow>
          <TaskList tasks={tasks.filter(t => t.dealId === deal.id)} today={today} readOnly={readOnly} link={{ dealId: deal.id, ...(deal.contactId ? { contactId: deal.contactId } : {}) }} showDone empty="No tasks for this partnership." />
        </section>

        <section className="flex flex-col gap-3 rounded-xl bg-bg p-4">
          <Eyebrow>Relationship with {deal.brandName}</Eyebrow>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[['Received', formatCents(histReceived)], ['Collaborations', String(history.length)], ['Avg paid deal', paidDeals.length ? formatCents(paidDeals.reduce((a, d) => a + (received[d.id] || 0), 0) / paidDeals.length) : '—'], ['Most recent', shortDate(history[0]?.startedOn)]].map(([k, v]) => <div key={k}><div className="text-[11px] text-muted">{k}</div><div className="tnum text-base font-semibold">{v}</div></div>)}
          </div>
          <div className="flex flex-col">{history.map(h => <div key={h.id} className="flex justify-between gap-2.5 border-t border-line py-1.5 text-[13px]"><span>{h.campaign || '—'}</span><span className="tnum whitespace-nowrap text-sub">{formatCents(h.feeCents)} · {STAGES.find(s => s[0] === h.stage)![1]}</span></div>)}</div>
          {brandInvoices.length > 0 && <div className="flex flex-col gap-1"><div className="text-xs font-semibold">Payment history</div>
            {brandInvoices.map(v => <div key={v.id} className="tnum text-[13px] text-[#4A2A45]">{v.number} · {formatCents(v.amountCents)} · {v.payments.length ? v.payments.map(p => `${formatCents(p.amountCents)} received ${shortDate(p.date)}`).join(', ') : v.state === 'overdue' ? 'Overdue' : 'Awaiting payment'}</div>)}</div>}
        </section>

        <section className="flex flex-col gap-2">
          <Eyebrow>Follow-up assistant</Eyebrow>
          <div className="flex flex-wrap gap-1.5">{DRAFTS.map(k => <button key={k} onClick={() => setDraft({ kind: k, dealId: deal.id, label: deal.brandName, to: deal.contactEmail })} className="h-8 rounded-full border border-line2 bg-white px-3 text-[13px] hover:border-ink">{k}</button>)}</div>
        </section>

        <section className="flex flex-col gap-1.5">
          <Eyebrow>Notes</Eyebrow>
          <Textarea value={notes} readOnly={readOnly} onChange={e => setNotes(e.target.value)} onBlur={() => !readOnly && notes !== deal.notes && run(() => updateDeal({ id: deal.id, notes }), refresh)} rows={3} aria-label="Notes" />
        </section>

        {flag('attachments') && <Attachments dealId={deal.id} files={deal.attachments ?? []} readOnly={readOnly} onChange={refresh} />}

        {!readOnly && <div className="border-t border-soft pt-4"><Btn variant="danger" onClick={() => confirm('Delete this partnership and its deliverables?') && run(() => deleteDeal(deal.id), () => { onClose(); refresh(); })}>Delete partnership</Btn></div>}
      </div>
      <FormModal open={editing} onClose={() => setEditing(false)} title="Edit partnership" fields={dealFields} submitLabel="Save changes"
        initial={{ brand: deal.brandName, campaign: deal.campaign, dealType: deal.dealType ?? 'sponsored', giftedValue: deal.giftedValueCents ? String(deal.giftedValueCents / 100) : '', commissionTerms: deal.commissionTerms ?? '', paymentSchedule: deal.paymentSchedule ?? 'single', paymentTrigger: deal.paymentTrigger ?? '', scheduleNote: deal.scheduleNote ?? '', agency: deal.agency, contactName: deal.contactName, contactEmail: deal.contactEmail, fee: String(deal.feeCents / 100), feeIsEstimate: deal.feeIsEstimate, stage: deal.stage, paymentTerms: deal.paymentTerms, contentCategory: deal.contentCategory, contractStatus: deal.contractStatus, usageRights: deal.usageRights, exclusivity: deal.exclusivity, description: deal.description, notes: deal.notes }}
        action={async v => { const r = await updateDeal({ ...v, id: deal.id }); if (r.ok) refresh(); return r; }} />
      {editDel && <FormModal open onClose={() => setEditDel(null)} title="Edit deliverable" fields={deliverableFields} submitLabel="Save deliverable"
        initial={{ name: editDel.name, platform: editDel.platform ?? '', status: editDel.status, revisions: String(editDel.revisions ?? 0), submitBy: editDel.submitBy ?? '', submittedOn: editDel.submittedOn ?? '', dueOn: editDel.dueOn, publishedOn: editDel.publishedOn ?? '', contentUrl: editDel.contentUrl ?? '', notes: editDel.notes }}
        action={async v => { const r = await updateDeliverable({ ...v, id: editDel.id }); if (r.ok) refresh(); return r; }} />}
      <DraftModal target={draft} onClose={() => setDraft(null)} />
    </Drawer>
  );
}

function Attachments({ dealId, files, readOnly, onChange }: { dealId: string; files: { id: string; fileName: string }[]; readOnly: boolean; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (f?: File) => {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast('Files must be under 10 MB.', 'error');
    setBusy(true);
    const fd = new FormData(); fd.append('file', f); fd.append('dealId', dealId);
    const res = await fetch('/api/attachments', { method: 'POST', body: fd });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(j.error || 'Upload failed.', 'error');
    toast('File attached'); onChange();
  };
  return (
    <section className="flex flex-col gap-1.5">
      <Eyebrow>Attachments</Eyebrow>
      <div className="flex flex-wrap gap-1.5">
        {files.map(a => <a key={a.id} href={`/api/attachments/${a.id}`} target="_blank" rel="noopener" className="rounded-lg border border-line px-2.5 py-1.5 font-mono text-xs hover:border-ink">{a.fileName}</a>)}
        {!files.length && <span className="text-sm text-muted">No files.</span>}
      </div>
      {!readOnly && <label className={cx('inline-flex h-9 w-fit cursor-pointer items-center rounded-[10px] border border-line2 px-3.5 text-[13px]', busy && 'opacity-50')}>{busy ? 'Uploading…' : 'Attach a file'}<input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.docx,.txt,.csv" onChange={e => upload(e.target.files?.[0])} /></label>}
      <p className="text-xs text-muted">PDF, image, Word, text or CSV up to 10 MB. Stored privately. Contents are not read by the AI in this beta.</p>
    </section>
  );
}
