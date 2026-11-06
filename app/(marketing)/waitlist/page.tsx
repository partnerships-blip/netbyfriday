import { WaitlistForm } from './WaitlistForm';
export const metadata = { title: 'Get early access' };
export default function WaitlistPage() {
  return (
    <section className="mx-auto grid max-w-[1240px] items-start gap-12 px-6 py-[clamp(56px,8vw,112px)] min-[860px]:grid-cols-2">
      <div className="flex flex-col gap-5">
        <span className="flex h-9 w-fit items-center gap-2.5 rounded-full border border-[#E4F28A] bg-[#F3FFC4] px-4 text-xs font-extrabold uppercase tracking-[.2em]"><span className="h-2 w-2 rotate-45 bg-plum" />Private beta</span>
        <h1 className="text-[clamp(42px,6vw,80px)] font-extrabold leading-[.98] tracking-[-.045em]">Get your business <span className="nbf-hl">out of the DMs.</span></h1>
        <p className="max-w-[520px] text-[18px] leading-relaxed text-[#4A2A45]">netbyfriday is opening to creators in small groups. We’re inviting a small group of creators to help shape it. Request early access and we&apos;ll email you a personal invite code when your spot opens.</p>
        <ul className="flex flex-col gap-2 text-[16px]">{['Partnerships, contacts, invoices and tasks, connected', 'Payment terms and what’s owed, calculated for you', 'An AI Advisor that answers from your own records'].map(t => <li key={t} className="flex gap-2.5"><span className="mt-2 h-2 w-2 flex-none rotate-45 bg-chartreuse ring-1 ring-plum" />{t}</li>)}</ul>
      </div>
      <WaitlistForm />
    </section>
  );
}
