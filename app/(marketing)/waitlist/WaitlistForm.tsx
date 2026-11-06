'use client';
import Link from 'next/link';
import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { joinWaitlist, type WaitlistState } from './actions';

const input = 'h-12 w-full rounded-xl border border-line2 bg-white px-4 text-[16px] outline-none focus:border-plum';
function Submit() { const { pending } = useFormStatus(); return <button disabled={pending} className="h-14 rounded-[14px] bg-plum px-7 text-[17px] font-bold text-bg transition hover:-translate-y-0.5 disabled:opacity-60">{pending ? 'Joining…' : 'Request early access'}</button>; }
export function WaitlistForm() {
  const [state, action] = useFormState<WaitlistState, FormData>(joinWaitlist, {});
  const [startedAt] = useState(() => Date.now());
  if (state.ok) return (
    <div role="status" className="rounded-[24px] bg-white p-8 shadow-[0_18px_40px_rgba(50,21,47,.1)]">
      <div className="text-3xl font-extrabold tracking-tight">{state.already ? 'You’re already on the list.' : 'You’re on the list.'}</div>
      <p className="mt-3 text-[17px] leading-relaxed text-[#4A2A45]">We’ll email you an invite code when a beta spot opens. In the meantime, see how it works on the <Link href="/" className="underline">home page</Link>.</p>
    </div>);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-[24px] bg-white p-7 shadow-[0_18px_40px_rgba(50,21,47,.1)]">
      <label className="flex flex-col gap-1.5 text-sm font-bold">Email *<input name="email" type="email" required autoComplete="email" className={input} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-bold">Name<input name="name" autoComplete="name" className={input} /></label>
        <label className="flex flex-col gap-1.5 text-sm font-bold">Main handle<input name="handle" placeholder="@yourhandle" className={input} /></label>
      </div>
      <label className="flex flex-col gap-1.5 text-sm font-bold">What do you create?
        <select name="creatorType" className={input} defaultValue=""><option value="">Choose one (optional)</option>{['Lifestyle', 'Beauty', 'Fashion', 'Travel', 'Food', 'Fitness & wellness', 'Tech', 'Parenting', 'Other'].map(o => <option key={o}>{o}</option>)}</select></label>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <input type="hidden" name="startedAt" value={startedAt} />
      <label className="flex items-start gap-2.5 text-sm leading-relaxed text-[#4A2A45]"><input type="checkbox" name="consent" required className="mt-1 h-4 w-4 accent-[#32152F]" />I agree that netbyfriday may email me about my beta invite and product updates. You can ask us to remove you at any time. See the <Link href="/privacy" className="underline">privacy notice</Link>.</label>
      {state.error && <p role="alert" className="text-[13px] text-danger">{state.error}</p>}
      <Submit />
    </form>
  );
}
