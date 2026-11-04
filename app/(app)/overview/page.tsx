import Link from 'next/link';
import { loadApp } from '@/lib/data/load';
import { flag } from '@/lib/flags';
import { Card, Eyebrow } from '@/components/ui';
import { formatCents, shortDate, daysBetween, monthLabel } from '@/lib/finance/core.js';
import { DELIVERABLE_LABEL } from '@/lib/brand';
import { RevenueChart } from '@/components/overview/RevenueChart';
import { Briefing } from '@/components/overview/Briefing';
import { InsightList } from '@/components/InsightList';
import { EmptyStart } from '@/components/overview/EmptyStart';

export default async function OverviewPage() {
  const app = await loadApp();
  const m = app.metrics;
  const first = (app.profile.displayName || '').split(' ')[0];
  const hr = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: app.ws.timezone }).format(new Date()));
  const delta = m.prevMonthCents > 0 ? Math.round((m.thisMonthCents - m.prevMonthCents) / m.prevMonthCents * 100) : null;
  const empty = !app.input.deals.length && !m.ledger.length && !app.input.invoices.length;
  const cards = [
    { label: 'Revenue this month', value: formatCents(m.thisMonthCents), sub: delta === null ? 'Money received this month. Not enough history to compare.' : `${delta >= 0 ? '+' : ''}${delta}% vs ${monthLabel(m.months[10])} (${formatCents(m.prevMonthCents)}) · received to date`, href: '/money', danger: false },
    { label: 'Outstanding payments', value: formatCents(m.outstandingCents), sub: m.overdueCents ? `${formatCents(m.overdueCents)} overdue · ${formatCents(m.upcomingCents)} not yet due` : `${formatCents(m.upcomingCents)} not yet due · nothing overdue`, href: '/money', danger: m.overdueCents > 0 },
    { label: 'Active partnerships', value: String(m.active.length), sub: `${m.openDeliverables.length} open deliverables · ${m.weekDeliverables.length} due this week`, href: '/partnerships', danger: false },
    { label: 'Pipeline value', value: formatCents(m.pipelineCents), sub: `${m.pipeline.length} unconfirmed deals · not counted as revenue`, href: '/partnerships', danger: false }
  ];
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <h1 className="font-head text-[36px] leading-[1.02] md:text-5xl">Good {hr < 12 ? 'morning' : hr < 18 ? 'afternoon' : 'evening'}{first ? `, ${first}` : ''}.</h1>
        <p className="text-[17px] text-muted">Here's what's happening in your business.</p>
      </div>
      {empty && !app.demo && <EmptyStart today={m.today} />}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        {cards.map(c => (
          <Link key={c.label} href={c.href} className="flex flex-col gap-2.5 rounded-card border border-line bg-white p-[18px] transition hover:-translate-y-px hover:border-[#9A8396]">
            <Eyebrow>{c.label}</Eyebrow>
            <span className="font-head tnum text-[40px] leading-none">{c.value}</span>
            <span className={`text-[13px] leading-snug ${c.danger ? 'text-danger' : 'text-sub'}`}>{c.sub}</span>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <RevenueChart months={m.revenueByMonth} />
        {app.prefs.dailyBriefing && <Briefing date={shortDate(m.today)} text={m.briefing} items={m.checklist} done={app.checklistDone} readOnly={app.readOnly} />}
      </div>
      <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col px-5 pb-2 pt-5">
          <div className="flex items-baseline justify-between pb-3.5"><h2 className="font-head text-[26px]">Your business today</h2>{flag('insights') && <Link href="/intelligence" className="text-[13px] text-sub underline underline-offset-[3px]">All insights</Link>}</div>
          <InsightList insights={m.insights.slice(0, 5)} variant="compact" deals={app.input.deals.map(d => ({ id: d.id, email: d.contactEmail, brand: d.brandName }))} invoices={m.invoices.map((v: any) => ({ id: v.id, client: v.clientName, number: v.number }))} />
        </Card>
        <Card className="flex flex-col gap-3 p-5">
          <Eyebrow>Upcoming deliverables</Eyebrow>
          {m.nextDeliverables.slice(0, 6).map((x: any) => {
            const n = daysBetween(m.today, x.dueOn);
            return (
              <Link key={x.id} href={`/partnerships?deal=${x.dealId}`} className="flex items-baseline gap-3 border-t border-soft py-2">
                <span className={`w-14 flex-none font-mono text-xs ${n < 0 ? 'text-danger' : n <= 3 ? 'text-ink' : 'text-muted'}`}>{n === 0 ? 'Today' : n < 0 ? `${-n}d late` : `In ${n}d`}</span>
                <span className="min-w-0"><span className="block text-sm font-medium">{x.name}</span><span className="block text-xs text-muted">{x.brandName} · {shortDate(x.dueOn)} · {DELIVERABLE_LABEL[x.status]}</span></span>
              </Link>
            );
          })}
          {!m.nextDeliverables.length && <p className="text-sm text-muted">No deliverables scheduled.</p>}
        </Card>
      </div>
    </>
  );
}
