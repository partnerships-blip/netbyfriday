'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { toggleChecklist } from '@/app/(app)/actions';
import { toast } from '../Toaster';

export function Briefing({ date, text, items, done, readOnly }: { date: string; text: string; items: { key: string; text: string; href: string }[]; done: string[]; readOnly: boolean }) {
  const [checked, setChecked] = useState(done);
  const [, start] = useTransition();
  useEffect(() => setChecked(done), [done]);
  const flip = (k: string) => {
    if (readOnly) return toast('Demo mode is read-only.');
    const on = !checked.includes(k);
    setChecked(s => (on ? [...s, k] : s.filter(x => x !== k)));
    start(async () => { const r = await toggleChecklist(k, on); if (!r.ok) { toast(r.error, 'error'); setChecked(done); } });
  };
  return (
    <div className="flex flex-col gap-4 rounded-card bg-ink p-5 text-bg">
      <div className="font-mono text-[11px] uppercase tracking-[.08em] text-[#CDB9C9]">Daily briefing · {date}</div>
      <p className="font-head text-2xl leading-tight text-pretty">{text}</p>
      <ul className="flex flex-col border-t border-[#4A2A45]">
        {items.map(k => { const on = checked.includes(k.key); return (
          <li key={k.key} className="flex items-start gap-3 border-b border-[#4A2A45] py-2.5">
            <button onClick={() => flip(k.key)} aria-label={on ? 'Mark not done' : 'Mark done'} aria-pressed={on} className={`mt-px grid h-[18px] w-[18px] flex-none place-items-center rounded-[5px] border-[1.5px] text-[11px] text-ink ${on ? 'border-bg bg-bg' : 'border-[#6C4B67]'}`}>{on ? '✓' : ''}</button>
            <Link href={k.href} className={`text-sm leading-snug ${on ? 'text-faint line-through' : 'text-bg'}`}>{k.text}</Link>
          </li>); })}
        {!items.length && <li className="py-3 text-sm text-[#CDB9C9]">Nothing needs attention today.</li>}
      </ul>
    </div>
  );
}
