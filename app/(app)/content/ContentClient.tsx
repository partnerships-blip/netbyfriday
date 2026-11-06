'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Empty, Pill, cx } from '@/components/ui';
import { RecordView, dueLabel, type Column } from '@/components/RecordView';
import { useAction, toast } from '@/components/Toaster';
import { updateDeliverable } from '@/app/(app)/actions';
import { DELIVERABLE_LABEL } from '@/lib/brand';
import { addDays } from '@/lib/finance/core.js';
import type { Deliverable } from '@/lib/types';

type Row = Deliverable & { brandName: string; campaign: string };
const DONE = ['approved', 'posted'];
const ORDER = ['not_started', 'in_progress', 'in_review', 'approved', 'posted'];
const TONE: Record<string, any> = { not_started: 'neutral', in_progress: 'accent', in_review: 'warn', approved: 'ok', posted: 'ok', scheduled: 'neutral' };

export function ContentClient({ rows, today, readOnly }: { rows: Row[]; today: string; readOnly: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const late = (x: Row) => !DONE.includes(x.status) && x.dueOn < today;
  const advance = (x: Row) => readOnly ? toast('Demo mode is read-only.') : run(() => updateDeliverable({ id: x.id, status: ORDER[(ORDER.indexOf(x.status) + 1) % ORDER.length] }), () => router.refresh());
  const cols: Column<Row>[] = [
    { key: 'name', label: 'Deliverable', sort: x => x.name.toLowerCase(), render: x => <span className={cx('font-medium', DONE.includes(x.status) && 'text-sub')}>{x.name}</span> },
    { key: 'deal', label: 'Partnership', sort: x => x.brandName.toLowerCase(), render: x => <Link href={`/partnerships?deal=${x.dealId}`} onClick={e => e.stopPropagation()} className="text-sub underline underline-offset-2 hover:text-ink">{x.brandName}{x.campaign ? ` – ${x.campaign}` : ''}</Link> },
    { key: 'due', label: 'Due', sort: x => x.dueOn, render: x => <span className={cx('whitespace-nowrap font-mono text-xs', late(x) ? 'text-danger' : 'text-sub')}>{DONE.includes(x.status) ? '—' : dueLabel(x.dueOn, today)}</span> },
    { key: 'status', label: 'Status', sort: x => ORDER.indexOf(x.status), render: x => <button disabled={pending} title="Advance status" onClick={e => { e.stopPropagation(); advance(x); }}><Pill tone={TONE[x.status]}>{DELIVERABLE_LABEL[x.status]}</Pill></button> }
  ];
  return (
    <RecordView<Row> storageKey="content" rows={rows} getId={x => x.id} today={today} noun="deliverable" views={['table', 'calendar']} columns={cols}
      search={x => `${x.name} ${x.brandName} ${x.campaign}`} onOpen={x => router.push(`/partnerships?deal=${x.dealId}`)}
      filters={[{ key: 'open', label: 'To do', test: x => !DONE.includes(x.status) }, { key: 'week', label: 'Due this week', test: x => !DONE.includes(x.status) && x.dueOn >= today && x.dueOn <= addDays(today, 7) },
        { key: 'review', label: 'In review', test: x => x.status === 'in_review' }, { key: 'late', label: 'Late', test: late }, { key: 'done', label: 'Done', test: x => DONE.includes(x.status) }, { key: 'all', label: 'All', test: () => true }]}
      calendar={{ dateOf: x => x.dueOn, label: x => `${x.name} · ${x.brandName}`, tone: x => DONE.includes(x.status) ? 'done' : late(x) ? 'late' : 'normal' }}
      empty={<Empty>No deliverables yet. Open a partnership and add what you owe the brand (a Reel, a TikTok, a story set) with its due date. They all collect here. <Link href="/partnerships" className="font-semibold text-ink underline underline-offset-2">Go to partnerships</Link></Empty>} />
  );
}
