import Link from 'next/link';
import type { Plan } from '@/lib/billing/plans';
export function PricingCards({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid gap-4 min-[860px]:grid-cols-3">{plans.map(p => (
      <div key={p.key} className={`flex flex-col gap-5 rounded-[28px] p-[30px] ${p.recommended ? 'bg-plum text-bg' : 'border border-line bg-white'}`}>
        <div className="flex items-center justify-between"><span className="text-[22px] font-extrabold tracking-tight">{p.name}</span>{p.recommended && <span className="rounded-full bg-chartreuse px-2.5 py-0.5 text-xs font-extrabold text-plum">Recommended</span>}</div>
        <div><span className="text-[52px] font-extrabold leading-none tracking-[-.04em]">{p.price}</span> <span className="text-sm opacity-75">{p.per}</span></div>
        <p className="text-[15px] leading-relaxed opacity-85">{p.desc}</p>
        <ul className="flex flex-1 flex-col gap-2">{p.features.map(f => <li key={f} className="flex gap-2 text-[15px]"><span className={`mt-2 h-2 w-2 flex-none rotate-45 ${p.recommended ? 'bg-chartreuse' : 'bg-plum'}`} />{f}</li>)}</ul>
        <Link href="/waitlist" className={`flex h-12 items-center justify-center rounded-[14px] text-[16px] font-bold transition hover:-translate-y-0.5 ${p.recommended ? 'bg-chartreuse text-plum' : 'bg-plum text-bg'}`}>{p.cta}</Link>
      </div>))}</div>
  );
}
