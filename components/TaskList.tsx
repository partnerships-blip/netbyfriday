'use client';
// Compact task list used inside related-records panels and the dashboard: check off, see due date, quick-add linked tasks.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cx } from './ui';
import { useAction, toast } from './Toaster';
import { createTask, updateTask } from '@/app/(app)/actions';
import { dueLabel } from './RecordView';
import type { Task } from '@/lib/types';

export function TaskList({ tasks, today, readOnly, link, context, labels, empty = 'No open tasks.', showDone = false, limit }: {
  tasks: Task[]; today: string; readOnly: boolean; link?: { dealId?: string; contactId?: string; invoiceId?: string };
  context?: (t: Task) => string | null; labels?: Record<string, string>; empty?: string; showDone?: boolean; limit?: number;
}) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [title, setTitle] = useState('');
  const [dueOn, setDueOn] = useState('');
  const list = tasks.filter(t => showDone || t.status === 'open').sort((a, b) => (a.status !== b.status ? (a.status === 'open' ? -1 : 1) : (a.dueOn ?? '9999') < (b.dueOn ?? '9999') ? -1 : 1));
  const shown = limit ? list.slice(0, limit) : list;
  const toggle = (t: Task) => readOnly ? toast('Demo mode is read-only.') : run(() => updateTask({ id: t.id, status: t.status === 'open' ? 'done' : 'open' }), () => router.refresh());
  return (
    <div className="flex flex-col">
      {shown.map(t => {
        const late = t.status === 'open' && !!t.dueOn && t.dueOn < today;
        const ctx = context?.(t) ?? labels?.[t.id] ?? null;
        return (
          <div key={t.id} className="flex items-start gap-2.5 border-t border-soft2 py-2 first:border-0">
            <input type="checkbox" aria-label={`Mark “${t.title}” ${t.status === 'open' ? 'done' : 'open'}`} checked={t.status === 'done'} disabled={pending} onChange={() => toggle(t)} className="mt-1 h-4 w-4 accent-[#32152F]" />
            <div className="min-w-0 flex-1">
              <div className={cx('text-sm leading-snug', t.status === 'done' && 'text-faint line-through')}>{t.priority === 'high' && t.status === 'open' && <span className="mr-1 font-bold text-danger">!</span>}{t.title}</div>
              {ctx && <div className="truncate text-xs text-muted">{ctx}</div>}
            </div>
            <span className={cx('whitespace-nowrap font-mono text-[11px]', late ? 'text-danger' : 'text-muted')}>{t.status === 'done' ? 'Done' : dueLabel(t.dueOn, today)}</span>
          </div>);
      })}
      {!shown.length && <p className="py-1 text-sm text-muted">{empty}</p>}
      {limit && list.length > limit && <Link href="/tasks" className="pt-1 text-[13px] text-sub underline underline-offset-[3px]">All {list.length} tasks</Link>}
      {link && !readOnly && (
        <form className="mt-2 flex flex-wrap gap-1.5" onSubmit={e => { e.preventDefault(); if (!title.trim()) return toast('Name the task first.', 'error'); run(() => createTask({ title, dueOn, ...link }), () => { setTitle(''); setDueOn(''); router.refresh(); }); }}>
          <input aria-label="New task" value={title} onChange={e => setTitle(e.target.value)} placeholder="Add a task" className="h-9 min-w-[150px] flex-1 rounded-[10px] border border-line2 bg-white px-3 text-sm outline-none focus:border-ink" />
          <input aria-label="Task due date" type="date" value={dueOn} onChange={e => setDueOn(e.target.value)} className="h-9 rounded-[10px] border border-line2 bg-white px-2 text-sm" />
          <button disabled={pending} className="h-9 rounded-[10px] bg-ink px-3.5 text-[13px] font-medium text-white disabled:opacity-50">Add task</button>
        </form>
      )}
    </div>
  );
}
