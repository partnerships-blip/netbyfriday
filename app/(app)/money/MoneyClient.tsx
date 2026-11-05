'use client';
import { RecordView } from '@/components/RecordView';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Pill, Bar, EVIDENCE, cx } from '@/components/ui';
import { FormModal } from '@/components/FormModal';
import { DraftModal, type DraftTarget } from '@/components/DraftModal';
import { SendInvoiceModal, type SendTarget } from '@/components/SendInvoiceModal';
import { flag } from '@/lib/flags';
import { invoiceFields, paymentFields, incomeFields, expenseFields, goalFields } from '@/components/forms';
import { useAction, toast } from '@/components/Toaster';
import { createInvoice, recordPayment, deletePayment, voidInvoice, addIncome, deleteIncome, addExpense, deleteExpense, saveGoals } from '@/app/(app)/actions';
import { formatCents, formatCentsExact, shortDate, monthLabel, dayNumber, addDays, termsDays } from '@/lib/finance/core.js';
import { STREAM_COLOR, STREAM_LABEL } from '@/lib/brand';

const STATE: Record<string, { label: string; tone: any }> = { paid: { label: 'Paid', tone: 'ok' }, overdue: { label: 'Overdue', tone: 'danger' }, partial: { label: 'Partially paid', tone: 'warn' }, awaiting: { label: 'Awaiting payment', tone: 'neutral' } };
type Modal = null | { kind: 'invoice' } | { kind: 'pay'; id: string; balance: number } | { kind: 'income' } | { kind: 'expense' } | { kind: 'goals' };

export function MoneyClient({ m, deals, income, expenses, readOnly, today, invoiceSettings, fromName }: { m: any; deals: { id: string; label: string; email: string; brand: string; contactName?: string }[]; invoiceSettings?: { paymentDetails: string; email: string }; fromName?: string; income: any[]; expenses: any[]; readOnly: boolean; today: string; profile: any; brandName: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<'Open' | 'Overdue' | 'Paid' | 'All' | 'Calendar'>('Open');
  const [modal, setModal] = useState<Modal>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftTarget | null>(null);
  const [send, setSend] = useState<SendTarget | null>(null);
  const links = flag('invoiceLinks');
  const [pending, run] = useAction();
  const refresh = () => router.refresh();
  const guard = (fn: () => void) => () => (readOnly ? toast('Demo mode is read-only.') : fn());
  const wrap = (fn: (v: any) => Promise<any>) => async (v: any) => { const r = await fn(v); if (r.ok) refresh(); return r; };

  const F: Record<string, (v: any) => boolean> = { Open: v => v.balanceCents > 0, Overdue: v => v.daysLate > 0, Paid: v => v.balanceCents === 0, All: () => true };
  const rows = tab === 'Calendar' ? [] : m.invoices.filter(F[tab]).sort((a: any, b: any) => (a.dueOn < b.dueOn ? -1 : 1));
  const dim = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7), 0)).getUTCDate();
  const stats = [
    ['Revenue received', formatCents(m.trailing12Cents), 'Payments + direct income, last 12 months', ''],
    ['Outstanding', formatCents(m.upcomingCents), `${m.openCount - m.overdueCount} invoices not yet due`, ''],
    ['Overdue', formatCents(m.overdueCents), `${m.overdueCount} past due date`, m.overdueCents ? 'text-danger' : ''],
    ['Expected next 30 days', formatCents(m.expectedNext30Cents), 'Invoices due soon. Not guaranteed.', 'text-sub'],
    ['Contracted, not invoiced', formatCents(m.uninvoicedCents), 'Confirmed work still to bill', 'text-sub'],
    ['Pipeline', formatCents(m.pipelineCents), 'Unconfirmed. Never revenue.', 'text-muted'],
    ['Expenses', formatCents(m.expenses12Cents), 'Recorded, last 12 months', ''],
    ['Estimated profit', formatCents(m.profit12Cents), 'Revenue received − expenses', '']
  ];
  const maxS = Math.max(1, ...m.byStream.map((s: any) => s.totalCents)), maxB = Math.max(1, ...m.byCounterparty.map((b: any) => b.totalCents));

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
        {stats.map(([l, v, s, c]) => <Card key={l} className="flex flex-col gap-1.5 px-4 py-3.5"><span className="text-[13px] font-medium">{l}</span><span className={cx('font-head tnum text-[30px] leading-none', c)}>{v}</span><span className="text-xs leading-snug text-muted">{s}</span></Card>)}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {[[`${monthLabel(m.months[11])} goal`, m.thisMonthCents, m.goals.monthlyCents, m.goals.monthPct, `day ${Number(today.slice(8, 10))} of ${dim}`], [`${today.slice(0, 4)} goal`, m.ytdCents, m.goals.annualCents, m.goals.yearPct, 'year to date']].map(([l, rec, goal, pct, when]: any) => (
          <Card key={l} className="flex flex-col gap-3 p-[18px]">
            <div className="flex items-baseline justify-between"><Eyebrow>{l}</Eyebrow>{!readOnly && <Btn variant="ghost" onClick={() => setModal({ kind: 'goals' })}>Edit</Btn>}</div>
            <div className="flex flex-wrap items-baseline gap-2.5"><span className="font-head tnum text-4xl leading-none">{formatCents(rec)}</span><span className="text-sm text-muted">of {goal ? formatCents(goal) : 'no goal set'}</span>{goal > 0 && <span className="ml-auto font-mono text-[13px]">{pct}%</span>}</div>
            <Bar pct={pct} h={8} />
            <div className="text-[13px] text-sub">{goal ? (rec >= goal ? 'Goal reached.' : `${formatCents(goal - rec)} remaining · ${when}`) : 'Set a goal to track progress.'}</div>
          </Card>
        ))}
      </div>

      <Card className="flex flex-col gap-3 px-5 py-[18px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="mr-auto font-head text-[26px]">Invoices</h2>
          <div className="flex gap-1 rounded-[10px] bg-bg p-[3px]" role="tablist">{(['Open', 'Overdue', 'Paid', 'All', 'Calendar'] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('h-[30px] rounded-lg px-3 text-[13px]', tab === t ? 'bg-white font-semibold' : '')}>{t}</button>)}</div>
          {!readOnly && <Btn variant="primary" onClick={() => setModal({ kind: 'invoice' })}>New invoice</Btn>}
        </div>
        {tab === 'Calendar' && <RecordView<any> storageKey="invoices-calendar" rows={m.invoices} getId={v => v.id} today={today} views={['calendar']} columns={[]} noun="invoice"
          onOpen={v => { setTab(v.balanceCents ? (v.daysLate ? 'Overdue' : 'Open') : 'Paid'); setExpanded(v.id); }}
          calendar={{ dateOf: v => v.dueOn, label: v => `${v.number} · ${v.clientName} · ${v.balanceCents ? formatCents(v.balanceCents) + ' due' : 'paid'}`, tone: v => v.balanceCents === 0 ? 'done' : v.daysLate ? 'late' : 'normal' }}
          empty={<p className="py-3 text-sm text-muted">No invoices yet.</p>} />}
        <div className={cx('hidden grid-cols-[88px_minmax(0,1.4fr)_100px_100px_150px_minmax(0,1.6fr)] gap-3 border-b border-line py-2 font-mono text-[10px] uppercase tracking-[.08em] text-muted', tab !== 'Calendar' && 'md:grid')}><span>Invoice</span><span>Client</span><span>Amount</span><span>Balance</span><span>Status</span><span className="text-right">Actions</span></div>
        {rows.map((v: any) => (
          <div key={v.id} className="border-b border-soft2">
            <div className="grid grid-cols-2 items-center gap-3 py-3 text-sm md:grid-cols-[88px_minmax(0,1.4fr)_100px_100px_150px_minmax(0,1.6fr)]">
              <button onClick={() => setExpanded(expanded === v.id ? null : v.id)} className="text-left font-mono text-xs underline-offset-2 hover:underline" aria-expanded={expanded === v.id}>{v.number}</button>
              <span className="min-w-0"><span className="font-medium">{v.clientName}</span><br /><span className="text-xs text-muted">Due {shortDate(v.dueOn)} · {v.terms}</span></span>
              <span className="tnum">{formatCentsExact(v.amountCents)}</span>
              <span className="tnum font-medium">{formatCentsExact(v.balanceCents)}</span>
              <span className="flex flex-wrap items-center gap-1"><Pill tone={STATE[v.state].tone}>{v.daysLate ? `Overdue ${v.daysLate}d` : v.daysUntil !== null ? `${STATE[v.state].label} · ${v.daysUntil}d` : STATE[v.state].label}</Pill>{links && v.sentAt && <span className="font-mono text-[10px] text-muted">Sent {shortDate(v.sentAt.slice(0, 10))}</span>}</span>
              <span className="col-span-2 flex flex-wrap gap-1.5 md:col-span-1 md:justify-end">
                {v.balanceCents > 0 && !readOnly && <Btn size="sm" onClick={() => setModal({ kind: 'pay', id: v.id, balance: v.balanceCents })}>Record payment</Btn>}
                {links && v.balanceCents > 0 && <Btn size="sm" variant="primary" onClick={() => { const d = deals.find(x => x.id === v.dealId); setSend({ id: v.id, number: v.number, clientName: v.clientName, description: v.description, balanceCents: v.balanceCents, dueOn: v.dueOn, terms: v.terms, to: v.billToEmail || d?.email || '', contactName: d?.contactName || '', sentAt: v.sentAt ?? null, hasLink: !!v.shareToken, overdue: v.daysLate > 0 }); }}>{v.sentAt ? 'Resend' : 'Send'}</Btn>}
                {v.balanceCents > 0 && <Btn size="sm" onClick={() => { const d = deals.find(x => x.id === v.dealId); setDraft({ kind: 'Following up on payment', invoiceId: v.id, label: v.clientName, to: d?.email }); }}>Reminder</Btn>}
                <a href={`/api/invoices/${v.id}/print`} target="_blank" rel="noopener" className="inline-flex h-[30px] items-center rounded-[10px] border border-line2 bg-white px-2.5 text-xs font-medium">PDF</a>
              </span>
            </div>
            {expanded === v.id && <div className="animate-in mb-3 flex flex-col gap-2 rounded-[10px] bg-bg p-3.5 text-[13px]">
              <div className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">Payments</div>
              {v.payments.map((p: any) => <div key={p.id} className="flex items-center justify-between gap-2"><span className="tnum">{formatCentsExact(p.amountCents)} received {shortDate(p.date)}</span>{!readOnly && <button className="text-xs text-muted hover:text-danger" onClick={() => confirm('Remove this payment? Revenue totals will change.') && run(() => deletePayment(p.id), refresh)}>Remove</button>}</div>)}
              {!v.payments.length && <span className="text-muted">No payments recorded.</span>}
              <div className="tnum text-sub">{formatCentsExact(v.paidCents)} paid of {formatCentsExact(v.amountCents)} · issued {shortDate(v.issuedOn)}</div>
              {!readOnly && !v.payments.length && <Btn size="sm" variant="danger" className="w-fit" onClick={() => confirm(`Void ${v.number}? It will no longer count as outstanding.`) && run(() => voidInvoice(v.id), refresh)}>Void invoice</Btn>}
            </div>}
          </div>
        ))}
        {!rows.length && tab !== 'Calendar' && <p className="py-3 text-sm text-muted">No invoices in this view.</p>}
      </Card>

      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-3 px-5 py-[18px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2"><Eyebrow>Expected cash · next 8 weeks</Eyebrow><span className="tnum text-sm font-semibold">{formatCents(m.expected8wCents)}</span></div>
          <div className="flex h-[150px] items-end gap-2" role="img" aria-label={`Expected from unpaid invoices over the next 8 weeks: ${formatCents(m.expected8wCents)}`}>
            {m.expectedWeeks.map((w: any, i: number) => { const max = Math.max(1, ...m.expectedWeeks.map((x: any) => x.cents)); return (
              <div key={w.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${shortDate(w.start)}–${shortDate(w.end)}: ${formatCents(w.cents)}`}>
                {w.cents > 0 && <span className="tnum text-[10px] text-sub">{formatCents(w.cents)}</span>}
                <div className={cx('w-full rounded-t-md transition-[height] duration-300', i === 0 ? 'bg-chartreuse' : 'bg-plum')} style={{ height: `${Math.max(w.cents ? 4 : 1, w.cents / max * 100)}%`, opacity: w.cents ? 1 : 0.15 }} />
                <span className="font-mono text-[10px] text-muted">{i === 0 ? 'This wk' : shortDate(w.start)}</span>
              </div>); })}
          </div>
          <p className="text-xs leading-relaxed text-muted">Unpaid invoice balances by due date. Expected, not received, and not guaranteed. {m.overdueCents ? `${formatCents(m.overdueCents)} overdue is not included. ` : ''}{m.expectedLaterCents ? `${formatCents(m.expectedLaterCents)} is due after 8 weeks.` : ''}</p>
        </Card>
        <Card className="flex flex-col gap-2.5 px-5 py-[18px]">
          <Eyebrow>Payment terms</Eyebrow>
          {m.termsStats.map((t: any) => (
            <div key={t.terms} className="flex items-center gap-3 border-t border-soft2 pt-2.5 first:border-0 first:pt-0">
              <span className="w-[86px] flex-none rounded-full bg-[#F3FFC4] px-2 py-0.5 text-center text-[11px] font-bold">{t.terms}</span>
              <span className="flex min-w-0 flex-1 flex-col text-[13px]"><span className="tnum">{t.openCount} open · {formatCents(t.openCents)}</span>
                <span className={cx('text-xs', t.overdueCount ? 'text-danger' : 'text-muted')}>{t.overdueCount ? `${t.overdueCount} overdue · ${formatCents(t.overdueCents)}` : 'Nothing overdue'}</span></span>
              <span className="text-right text-xs text-sub"><span className="tnum block text-sm font-semibold text-ink">{t.avgDaysToPay === null ? '—' : `${t.avgDaysToPay}d`}</span>avg to pay{t.paidCount ? ` (${t.paidCount})` : ''}</span>
            </div>))}
          {!m.termsStats.length && <p className="text-sm text-muted">Terms appear once you create invoices.</p>}
          <p className="text-xs leading-relaxed text-muted">Average days from issue date to final payment, across fully paid invoices. Small samples are a direction, not a rule.</p>
        </Card>
      </div>

      <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex flex-col gap-3 px-5 py-[18px]">
          <Eyebrow>Revenue by source · 12 months</Eyebrow>
          {m.byStream.filter((s: any) => s.totalCents).sort((a: any, b: any) => b.totalCents - a.totalCents).map((s: any) => (
            <div key={s.key} className="flex flex-col gap-1.5"><div className="flex justify-between text-[13px]"><span>{s.label}</span><span className="tnum">{formatCents(s.totalCents)} <span className="text-muted">· {Math.round(s.totalCents / m.trailing12Cents * 100)}%</span></span></div><Bar pct={s.totalCents / maxS * 100} color={STREAM_COLOR[s.key]} /></div>))}
          {!m.trailing12Cents && <p className="text-sm text-muted">No money received in the last 12 months.</p>}
        </Card>
        <Card className="flex flex-col gap-3 px-5 py-[18px]">
          <Eyebrow>Revenue by client · 12 months</Eyebrow>
          {m.byCounterparty.slice(0, 6).map((b: any) => <div key={b.name} className="flex flex-col gap-1.5"><div className="flex justify-between text-[13px]"><span>{b.name}</span><span className="tnum">{formatCents(b.totalCents)}</span></div><Bar pct={b.totalCents / maxB * 100} color="#32152F" /></div>)}
          {!m.byCounterparty.length && <p className="text-sm text-muted">Revenue with a named client will appear here.</p>}
        </Card>
        <Card className="flex flex-col gap-2.5 px-5 py-[18px]">
          <div className="flex items-baseline justify-between"><Eyebrow>Direct income</Eyebrow>{!readOnly && <Btn variant="ghost" onClick={() => setModal({ kind: 'income' })}>Record income</Btn>}</div>
          <p className="text-xs leading-relaxed text-muted">Money received without an invoice. Invoiced work belongs on its invoice as a payment.</p>
          {income.slice(0, 8).map(e => <div key={e.id} className="flex items-center justify-between gap-2 border-b border-soft2 py-1 text-sm"><span className="min-w-0 truncate">{STREAM_LABEL[e.stream]}{e.counterparty ? ` · ${e.counterparty}` : ''} <span className="text-xs text-muted">{shortDate(e.receivedOn)}</span></span><span className="tnum flex items-center gap-2">{formatCentsExact(e.amountCents)}{!readOnly && <button aria-label="Remove" className="text-xs text-muted hover:text-danger" onClick={() => confirm('Remove this income entry?') && run(() => deleteIncome(e.id), refresh)}>×</button>}</span></div>)}
          {!income.length && <p className="text-sm text-muted">None recorded.</p>}
        </Card>
        <Card className="flex flex-col gap-2.5 px-5 py-[18px]">
          <div className="flex items-baseline justify-between"><Eyebrow>Business expenses</Eyebrow>{!readOnly && <Btn variant="ghost" onClick={() => setModal({ kind: 'expense' })}>Add</Btn>}</div>
          {expenses.slice(0, 10).map(x => <div key={x.id} className="flex items-center justify-between gap-2 border-b border-soft2 py-1 text-sm"><span className="min-w-0 truncate">{x.category} <span className="text-xs text-muted">{shortDate(x.spentOn)}</span></span><span className="tnum flex items-center gap-2">{formatCentsExact(x.amountCents)}{!readOnly && <button aria-label="Remove" className="text-xs text-muted hover:text-danger" onClick={() => confirm('Remove this expense?') && run(() => deleteExpense(x.id), refresh)}>×</button>}</span></div>)}
          <div className="flex justify-between pt-1 text-sm font-semibold"><span>Estimated profit (12 mo)</span><span className="tnum">{formatCents(m.profit12Cents)}</span></div>
          <p className="text-xs leading-relaxed text-muted">Revenue received minus recorded expenses. Taxes are not included. This is not tax advice.</p>
        </Card>
      </div>

      {m.insights.length > 0 && <div className="flex flex-col gap-2.5"><Eyebrow>Financial insights</Eyebrow>
        <div className="grid gap-2.5 md:grid-cols-3">{m.insights.map((i: any) => <Card key={i.id} className="flex flex-col gap-2 p-4"><Pill tone={EVIDENCE[i.evidence].tone} className="w-fit">{EVIDENCE[i.evidence].label}</Pill><div className="text-[15px] font-medium leading-snug">{i.title}</div><div className="text-[13px] leading-relaxed text-sub">{i.action}</div></Card>)}</div></div>}

      <FormModal open={modal?.kind === 'invoice'} onClose={() => setModal(null)} title="New invoice" fields={invoiceFields(deals)} initial={{ issuedOn: today, dueOn: new Date((dayNumber(today) + 30) * 864e5).toISOString().slice(0, 10), terms: 'Net 30', stream: 'brand', dealId: '' }} derive={(v, k) => { if (k !== 'terms' && k !== 'issuedOn') return null; const n = termsDays(v.terms); return n !== null && /^\d{4}-\d{2}-\d{2}$/.test(v.issuedOn || '') ? { dueOn: addDays(v.issuedOn, n) } : null; }} submitLabel="Create invoice" action={wrap(createInvoice)} />
      {modal?.kind === 'pay' && <FormModal open onClose={() => setModal(null)} title="Record a payment" note={`Balance ${formatCentsExact(modal.balance)}. Only record money you have actually received; this is what counts as revenue.`} fields={paymentFields} initial={{ amount: (modal.balance / 100).toFixed(2), receivedOn: today }} submitLabel="Record payment" action={wrap(v => recordPayment({ ...v, invoiceId: modal.id }))} />}
      <FormModal open={modal?.kind === 'income'} onClose={() => setModal(null)} title="Record income" note="Money you received without an invoice: affiliate payouts, ticket sales, product sales." fields={incomeFields} initial={{ receivedOn: today, stream: 'affiliate' }} submitLabel="Add income" action={wrap(addIncome)} />
      <FormModal open={modal?.kind === 'expense'} onClose={() => setModal(null)} title="Add expense" fields={expenseFields} initial={{ spentOn: today }} submitLabel="Add expense" action={wrap(addExpense)} />
      {modal?.kind === 'goals' && <FormModal open onClose={() => setModal(null)} title="Revenue goals" note="Progress is measured against money received." fields={goalFields} initial={{ monthly: m.goals.monthlyCents ? String(m.goals.monthlyCents / 100) : '', annual: m.goals.annualCents ? String(m.goals.annualCents / 100) : '' }} submitLabel="Save goals" action={wrap(saveGoals)} />}
      <DraftModal target={draft} onClose={() => setDraft(null)} />
      {links && <SendInvoiceModal target={send} onClose={() => setSend(null)} fromName={fromName || 'me'} settings={invoiceSettings ?? { paymentDetails: '', email: '' }} readOnly={readOnly} />}
    </>
  );
}
