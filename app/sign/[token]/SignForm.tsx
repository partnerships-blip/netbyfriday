'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const inputCls = 'h-11 w-full rounded-[10px] border border-line2 bg-white px-3 text-[15px] outline-none focus:border-ink';

export function SignForm({ token, hash }: { token: string; hash: string }) {
  const router = useRouter();
  const [f, setF] = useState({ name: '', title: '', email: '', signature: '' });
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ok = consent && f.name.trim().length > 1 && f.signature.trim().length > 1 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim());
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const res = await fetch(`/api/sign/${token}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...f, consent, hash }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error || 'The agreement could not be signed. Nothing was saved.'); setBusy(false); return; }
    router.refresh();
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-[22px] border border-line bg-white p-[clamp(20px,4vw,36px)] print:hidden">
      <h2 className="font-head text-[26px]">Sign as the brand</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] font-medium">Your full name<input className={inputCls} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} autoComplete="name" /></label>
        <label className="flex flex-col gap-1 text-[13px] font-medium">Title (optional)<input className={inputCls} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Partnerships Manager" /></label>
        <label className="flex flex-col gap-1 text-[13px] font-medium sm:col-span-2">Work email<input className={inputCls} type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} autoComplete="email" /></label>
        <label className="flex flex-col gap-1 text-[13px] font-medium sm:col-span-2">Type your name to sign<input className={`${inputCls} font-head text-2xl italic`} value={f.signature} onChange={e => setF({ ...f, signature: e.target.value })} /></label>
      </div>
      <label className="flex items-start gap-2 text-[14px] leading-snug"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1" />I agree to do business electronically and to sign this agreement electronically. My typed name is my signature, and I’m authorized to sign for the brand.</label>
      {error && <p role="alert" className="rounded-[10px] bg-[#FBEAE6] px-3 py-2 text-[13px] text-[#9A2B12]">{error}</p>}
      <button disabled={!ok || busy} className="inline-flex h-12 w-fit items-center rounded-[12px] bg-ink px-6 text-[15px] font-semibold text-white disabled:opacity-40">{busy ? 'Signing…' : 'Sign agreement'}</button>
      <p className="text-xs leading-relaxed text-muted">When you sign, we record your name, email, the time, your IP address and browser, and a fingerprint of this exact text, and add them to the agreement’s audit trail. Both parties can download the signed copy.</p>
    </form>
  );
}
