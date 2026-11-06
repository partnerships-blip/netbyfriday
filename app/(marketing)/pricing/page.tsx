import Link from 'next/link';
import { PricingCards } from '@/components/marketing/PricingCards';
export const metadata = { title: 'Pricing' };
export default function PricingPage() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-[clamp(56px,8vw,112px)]">
      <h1 className="text-[clamp(42px,6vw,80px)] font-extrabold leading-[.98] tracking-[-.045em]">Free during <span className="nbf-hl">private beta.</span></h1>
      <p className="mt-4 max-w-[640px] text-[18px] leading-relaxed text-[#4A2A45]">Founding-member pricing will be announced before paid access begins. Nobody is moved to a paid plan without choosing it.</p>
      <div className="mt-10"><PricingCards /></div>
      <p className="mt-8 text-[15px] text-sub">Questions about plans? <Link className="underline" href="/#faq">Read the FAQ</Link> or <Link className="underline" href="/waitlist">request early access</Link>.</p>
    </section>
  );
}
