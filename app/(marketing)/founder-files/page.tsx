import Link from 'next/link';
import { FOUNDER_FILES } from '@/lib/marketing/founder-files';
export const metadata = { title: 'The Founder Files', description: 'Notes on building NETBYFRIDAY: why features exist, what founding creators asked for, and what changed.' };
const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function FounderFilesPage() {
  return (
    <section className="mx-auto max-w-[1240px] px-6 py-[clamp(56px,8vw,112px)]">
      <div className="text-xs font-extrabold uppercase tracking-[.2em]">From the build</div>
      <h1 className="mt-3 text-[clamp(42px,6vw,80px)] font-extrabold leading-[.98] tracking-[-.045em]">The Founder <span className="nbf-hl">Files.</span></h1>
      <p className="mt-5 max-w-[640px] text-[18px] leading-relaxed text-[#4A2A45]">Notes on building NETBYFRIDAY: why features work the way they do, what founding creators asked for, and what changed because of it.</p>
      <div className="mt-12 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        {FOUNDER_FILES.map((f, i) => (
          <Link key={f.slug} href={`/founder-files/${f.slug}`} className={`group flex min-h-[300px] flex-col justify-between gap-6 rounded-[24px] p-7 transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(50,21,47,.1)] ${i === 0 ? 'bg-plum text-bg' : 'border border-line bg-white'}`}>
            <div className="flex flex-col gap-3">
              <span className={`font-mono text-[11px] uppercase tracking-[.14em] ${i === 0 ? 'text-chartreuse' : 'text-muted'}`}>{f.kicker}</span>
              <h2 className="text-[26px] font-extrabold leading-tight tracking-[-.03em]">{f.title}</h2>
              <p className={`text-[15px] leading-relaxed ${i === 0 ? 'text-[#E4D6E1]' : 'text-sub'}`}>{f.summary}</p>
            </div>
            <span className={`text-[13px] font-semibold ${i === 0 ? 'text-[#CDB9C9]' : 'text-muted'}`}>{fmt(f.date)} · <span className="underline underline-offset-4 group-hover:no-underline">Read</span></span>
          </Link>))}
      </div>
      <p className="mt-10 text-[15px] text-sub">The story of why NETBYFRIDAY exists is in <Link href="/about" className="font-semibold text-ink underline underline-offset-4">Our story</Link>.</p>
    </section>
  );
}
