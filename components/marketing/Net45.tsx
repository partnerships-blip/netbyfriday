'use client';
import { useEffect, useRef, useState } from 'react';

const STEPS: [string, number, string, string, string[]][] = [
  ['Pitch', 0, 'You send the pitch.', 'A deck, a rate, a DM. The deal starts long before any money moves.', ['Pitch date and proposed fee', 'Follow-up reminder after a week', 'Pipeline value, never counted as revenue']],
  ['Contract', 6, 'Terms get agreed.', 'Fee, usage, exclusivity and payment terms are set here, and they decide when you can expect to be paid.', ['Fee, usage rights, exclusivity', 'NET terms and deposit schedule', 'Contract status']],
  ['Create', 12, 'You shoot and edit.', 'Drafts, feedback rounds and approvals. The part everyone sees as “the job.”', ['Every deliverable and its deadline', 'Drafts in review and approvals', 'Late deliverable alerts']],
  ['Post', 21, 'The content goes live.', 'The campaign looks finished from the outside. The business side isn’t.', ['Post dates and usage windows', 'Campaign marked complete', 'Invoice prompt']],
  ['Invoice', 22, 'You send the invoice.', 'Your payment terms start counting from here.', ['Invoice amount and due date', 'Partial payments', 'Printable invoice']],
  ['NET45', 67, 'Then you wait.', 'Forty-five days after the invoice, payment is due. Meanwhile, rent isn’t on NET45.', ['Days until each invoice is due', 'Overdue alerts', 'Reminder drafts you approve']]
];
const POS = [0, 12, 24, 36, 48, 100];
export function Net45() {
  const [step, setStep] = useState(4);
  const picked = useRef(false);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => { if (!picked.current) setStep(s => (s + 1) % 6); }, 3400);
    return () => clearInterval(t);
  }, []);
  const pick = (i: number) => { picked.current = true; setStep(i); };
  const cur = STEPS[step];
  return (
    <div className="flex flex-col gap-8">
      <div className="relative mx-6 hidden h-[120px] min-[860px]:block">
        <div className="absolute left-0 right-0 top-[22px] h-1 rounded bg-[rgba(250,247,243,.14)]"><div className="h-full rounded bg-chartreuse transition-[width] duration-500" style={{ width: POS[step] + '%' }} /></div>
        <div className="absolute top-[64px] flex items-center justify-center border-t-2 border-dashed border-[#6C4B67] pt-1 text-center text-xs font-semibold text-[#CDB9C9]" style={{ left: 'calc(48% + 40px)', right: 30 }}>45 days between invoice and due date</div>
        {STEPS.map(([label, day], i) => { const on = i === step, past = i < step; return (
          <button key={label} onClick={() => pick(i)} aria-pressed={on} className="absolute -translate-x-1/2 text-center" style={{ left: POS[i] + '%' }}>
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full border-2 text-sm font-extrabold transition" style={{ background: on ? '#DFFF43' : past ? '#FAF7F3' : '#32152F', borderColor: on || past ? '#DFFF43' : 'rgba(250,247,243,.35)', color: on || past ? '#32152F' : '#CDB9C9' }}>{i + 1}</span>
            <span className="mt-2 block whitespace-nowrap text-sm font-extrabold" style={{ color: on ? '#DFFF43' : '#FAF7F3' }}>{label}</span>
            <span className="block text-[11px] text-[#CDB9C9]">Day {day}</span>
          </button>); })}
      </div>
      <div className="flex flex-col gap-1.5 min-[860px]:hidden">{STEPS.map(([label, day], i) => <button key={label} onClick={() => pick(i)} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-left ${i === step ? 'bg-[rgba(250,247,243,.1)]' : ''}`}>
        <span className="grid h-9 w-9 place-items-center rounded-full text-sm font-extrabold" style={{ background: i === step ? '#DFFF43' : i < step ? '#FAF7F3' : 'transparent', color: i <= step ? '#32152F' : '#CDB9C9', border: '2px solid ' + (i <= step ? '#DFFF43' : 'rgba(250,247,243,.35)') }}>{i + 1}</span>
        <span className="font-extrabold" style={{ color: i === step ? '#DFFF43' : '#FAF7F3' }}>{label}</span><span className="text-xs text-[#CDB9C9]">Day {day}</span></button>)}</div>
      <div className="grid gap-4 min-[860px]:grid-cols-[1.15fr_1fr]">
        <div className="rounded-[24px] bg-[rgba(250,247,243,.06)] p-7"><div className="text-[clamp(40px,6vw,64px)] font-extrabold leading-none tracking-[-.04em] text-chartreuse">Day {cur[1]}</div>
          <div className="mt-3 text-2xl font-extrabold tracking-tight">{cur[2]}</div><p className="mt-2 text-[17px] leading-relaxed text-[#CDB9C9]">{cur[3]}</p></div>
        <div className="rounded-[24px] border border-[rgba(250,247,243,.14)] p-7"><div className="text-xs font-extrabold uppercase tracking-[.2em] text-[#CDB9C9]">What netbyfriday tracks here</div>
          <ul className="mt-3 flex flex-col gap-2">{cur[4].map(t => <li key={t} className="flex gap-2 text-[16px]"><span className="mt-2 h-2 w-2 flex-none rotate-45 bg-chartreuse" />{t}</li>)}</ul></div>
      </div>
    </div>
  );
}
