import Link from 'next/link';
import { BETA_OFFER } from '@/lib/billing/plans';
// During the private beta the site shows one offer: free. Illustrative paid tiers (PLANS) stay unpublished until prices are approved.
export function PricingCards() {
  return (
    <div className="grid gap-4 min-[860px]:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5 rounded-[28px] bg-plum p-[clamp(24px,3vw,36px)] text-bg">
        <span className="w-fit rounded-full bg-chartreuse px-3 py-1 text-[12px] font-bold text-plum">Founding creator beta</span>
        <div className="text-[clamp(40px,5vw,60px)] font-extrabold leading-[1] tracking-[-.04em]">{BETA_OFFER.headline}</div>
        <ul className="grid gap-2 sm:grid-cols-2">{BETA_OFFER.includes.map(f => <li key={f} className="flex gap-2 text-[15px]"><span className="mt-2 h-2 w-2 flex-none rotate-45 bg-chartreuse" />{f}</li>)}</ul>
        <Link href="/waitlist" className="flex h-12 w-fit items-center justify-center rounded-[14px] bg-chartreuse px-6 text-[16px] font-bold text-plum transition hover:-translate-y-0.5">Get Early Access</Link>
      </div>
      <div className="flex flex-col justify-between gap-5 rounded-[28px] border border-line bg-white p-[clamp(24px,3vw,36px)]">
        <div className="flex flex-col gap-3">
          <span className="font-mono text-[12px] uppercase tracking-[.14em] text-muted">After the beta</span>
          <p className="text-[22px] font-extrabold leading-snug tracking-[-.02em]">{BETA_OFFER.note}</p>
        </div>
        <p className="text-[14px] leading-relaxed text-sub">Beta creators get a say in what the paid plans include, and the first look at founding-member pricing.</p>
      </div>
    </div>
  );
}
