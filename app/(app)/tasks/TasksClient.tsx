'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Btn, Empty, Pill, cx } from '@/components/ui';
import { RecordView, dueLabel, type Column } from '@/components/RecordView';
import { FormModal } from '@/components/FormModal';
import { taskFields } from '@/components/forms';
import { useAction, toast } from '@/components/Toaster';
import { createTask, updateTask, deleteTask } from '@/app/(app)/actions';
import { addDays } from '@/lib/finance/core.js';
import type { Task } from '@/lib/types';

type Opt = { id: string; label: string };
const PRIORITY: Record<string, { l: string; tone: 'danger' | 'neutral' | 'accent' }> = { high: { l: 'High', tone: 'danger' }, normal: { l: 'Normal', tone: 'neutral' }, low: { l: 'Low', tone: 'neutral' } };

export function TasksClient({ tasks, deals, contacts, invoices, today, readOnly }: { tasks: Task[]; deals: Opt[]; contacts: Opt[]; invoices: Opt[]; today: string; readOnly: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [editing, setEditing] = useState<Task | 'new' | null>(null);
  const name = (list: Opt[], id: string | null) => (id ? list.find(x => x.id === id)?.label ?? null : null);
  const links = (t: Task) => [t.dealId && { href: `/partnerships?deal=${t.dealId}`, l: name(deals, t.dealId) }, t.contactId && { href: `/contacts?contact=${t.contactId}`, l: name(contacts, t.contactId) }, t.invoiceId && { href: '/money', l: name(invoices, t.invoiceId) }].filter(Boolean) as { href: string; l: string | null }[];
  const late = (t: Task) => t.status === 'open' && !!t.dueOn && t.dueOn < today;
  const setStatus = (id: string, status: string) => readOnly ? toast('Demo mode is read-only.') : run(() => updateTask({ id, status }), () => router.refresh());
  const open = (t: Task) => !readOnly && setEditing(t);

  const columns: Column<Task>[] = [
    { key: 'done', label: '', className: 'w-10', render: t => <input type="checkbox" aria-label={`Mark “${t.title}” ${t.status === 'open' ? 'done' : 'open'}`} checked={t.status === 'done'} disabled={pending} onClick={e => e.stopPropagation()} onChange={() => setStatus(t.id, t.status === 'open' ? 'done' : 'open')} className="mt-0.5 h-4 w-4 accent-[#32152F]" /> },
    { key: 'title', label: 'Task', sort: t => t.title.toLowerCase(), render: t => <span className={cx('font-medium', t.status === 'done' && 'text-faint line-through')}>{t.title}</span> },
    { key: 'due', label: 'Due', sort: t => t.dueOn, render: t => <span className={cx('whitespace-nowrap font-mono text-xs', late(t) ? 'text-danger' : 'text-sub')}>{t.status === 'done' ? 'Done' : dueLabel(t.dueOn, today)}</span> },
    { key: 'priority', label: 'Priority', sort: t => ({ high: 0, normal: 1, low: 2 })[t.priority], render: t => <Pill tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].l}</Pill> },
    { key: 'links', label: 'Linked to', hideOnMobile: true, render: t => <span className="flex flex-col gap-0.5">{links(t).map(x => <Link key={x.href} href={x.href} onClick={e => e.stopPropagation()} className="text-[13px] text-sub underline underline-offset-2 hover:text-ink">{x.l}</Link>)}{!links(t).length && <span className="text-muted">—</span>}</span> }
  ];

  return (
    <>
      <RecordView<Task> storageKey="tasks" rows={tasks} getId={t => t.id} today={today} noun="task" views={['table', 'board', 'calendar']} columns={columns}
        search={t => `${t.title} ${t.notes} ${links(t).map(x => x.l).join(' ')}`} onOpen={open}
        filters={[{ key: 'open', label: 'Open', test: t => t.status === 'open' }, { key: 'late', label: 'Overdue', test: late },
          { key: 'week', label: 'Next 7 days', test: t => t.status === 'open' && !!t.dueOn && t.dueOn >= today && t.dueOn <= addDays(today, 7) },
          { key: 'done', label: 'Done', test: t => t.status === 'done' }, { key: 'all', label: 'All', test: () => true }]}
        board={{ groups: [{ key: 'open', label: 'Open' }, { key: 'done', label: 'Done' }], groupOf: t => t.status, onMove: readOnly ? undefined : setStatus,
          card: t => <div className="flex flex-col gap-1"><span className={cx('font-medium leading-snug', t.status === 'done' && 'text-faint line-through')}>{t.title}</span>
            <span className="flex items-center justify-between gap-2"><span className={cx('font-mono text-[11px]', late(t) ? 'text-danger' : 'text-muted')}>{dueLabel(t.dueOn, today)}</span>{t.priority === 'high' && <Pill tone="danger">High</Pill>}</span>
            {links(t)[0] && <span className="truncate text-xs text-muted">{links(t)[0].l}</span>}</div> }}
        calendar={{ dateOf: t => t.dueOn, label: t => t.title, tone: t => t.status === 'done' ? 'done' : late(t) ? 'late' : 'normal' }}
        toolbar={!readOnly && <Btn variant="primary" onClick={() => setEditing('new')}>New task</Btn>}
        empty={<Empty>No tasks yet. Add your first one: a follow-up, a shoot day, or an invoice to send. You can link it to a partnership, contact or invoice so it shows up there too.</Empty>} />
      <FormModal open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'New task' : 'Edit task'} fields={taskFields(deals, contacts, invoices)}
        submitLabel={editing === 'new' ? 'Add task' : 'Save task'}
        initial={editing && editing !== 'new' ? { title: editing.title, dueOn: editing.dueOn ?? '', priority: editing.priority, dealId: editing.dealId ?? '', contactId: editing.contactId ?? '', invoiceId: editing.invoiceId ?? '', notes: editing.notes } : { priority: 'normal', dueOn: today }}
        action={async v => { const r = editing && editing !== 'new' ? await updateTask({ ...v, id: editing.id }) : await createTask(v); if (r.ok) router.refresh(); return r; }}
        onDelete={editing && editing !== 'new' ? async () => { const r = await deleteTask(editing.id); if (r.ok) router.refresh(); return r; } : undefined} deleteLabel="Delete task" />
    </>
  );
}
