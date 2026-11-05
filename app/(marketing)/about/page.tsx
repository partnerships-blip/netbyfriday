import Link from 'next/link';
import { founderStory } from '@/lib/marketing/story';
export const metadata = { title: 'Our story', description: 'Why Poca built NETBYFRIDAY: the business workspace for creators.' };
export default function About() {
  const s = founderStory();
  return (
    <article className="mx-auto max-w-[760px] px-6 py-[clamp(56px,8vw,112px)]">
      <span className="flex h-9 w-fit items-center gap-2.5 rounded-full border border-[#E4F28A] bg-[#F3FFC4] px-4 text-xs font-extrabold uppercase tracking-[.2em]"><span className="h-2 w-2 rotate-45 bg-plum" />{s.byline || 'Our story'}</span>
      <h1 className="mt-6 text-[clamp(40px,6vw,76px)] font-extrabold leading-[.98] tracking-[-.045em]">{s.title}</h1>
      <div className="mt-10 flex flex-col gap-5 text-[18px] leading-[1.7] text-[#4A2A45]">
        {s.blocks.map((b, i) => b.kind === 'quote'
          ? <blockquote key={i} className="my-3 rounded-[24px] bg-plum px-7 py-6 text-[clamp(22px,2.6vw,30px)] font-extrabold leading-snug tracking-[-.03em] text-bg">{b.text}</blockquote>
          : <p key={i}>{b.text}</p>)}
      </div>
      <div className="mt-12 flex flex-wrap gap-3">
        <Link href="/waitlist" className="flex h-14 items-center gap-2 rounded-[14px] bg-plum px-7 text-[17px] font-bold text-bg transition hover:-translate-y-0.5">Join the waitlist <span aria-hidden>→</span></Link>
        <Link href="/#product" className="flex h-14 items-center rounded-[14px] border-[1.5px] border-plum px-7 text-[17px] font-bold">See the platform</Link>
      </div>
    </article>
  );
}
