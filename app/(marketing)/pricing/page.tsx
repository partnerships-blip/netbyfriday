import Link from 'next/link';
import { PLANS, ILLUSTRATIVE_LABEL } from '@/lib/billing/plans';
import { PricingCards } from '@/components/marketing/PricingCards';
export const metadata = { title: 'Pricing' };
export default function PricingPage() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-[clamp(56px,8vw,112px)]">
      <h1 className="text-[clamp(42px,6vw,80px)] font-extrabold leading-[.98] tracking-[-.045em]">Start free. <span className="nbf-hl">Grow into it.</span></h1>
      <p className="mt-4 max-w-[640px] text-[18px] leading-relaxed text-[#4A2A45]">netbyfriday is in private beta. Beta creators use it free while we build. These plans show where pricing is heading.</p>
      <p className="mt-2 text-sm font-semibold text-muted">{ILLUSTRATIVE_LABEL}</p>
      <div className="mt-10"><PricingCards plans={PLANS} /></div>
      <p className="mt-8 text-[15px] text-sub">Questions about plans? <Link className="underline" href="/#faq">Read the FAQ</Link> or join the <Link className="underline" href="/waitlist">waitlist</Link>.</p>
    </section>
  );
}
