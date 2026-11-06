import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FOUNDER_FILES, founderFile } from '@/lib/marketing/founder-files';

export function generateStaticParams() { return FOUNDER_FILES.map(f => ({ slug: f.slug })); }
export function generateMetadata({ params }: { params: { slug: string } }) {
  const f = founderFile(params.slug);
  return f ? { title: f.title, description: f.summary } : {};
}
const fmt = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export default function FounderFilePage({ params }: { params: { slug: string } }) {
  const f = founderFile(params.slug);
  if (!f) notFound();
  const others = FOUNDER_FILES.filter(x => x.slug !== f.slug).slice(0, 2);
  return (
    <article className="mx-auto max-w-[760px] px-6 py-[clamp(56px,8vw,112px)]">
      <Link href="/founder-files" className="text-[14px] font-semibold text-sub underline underline-offset-4">The Founder Files</Link>
      <div className="mt-8 font-mono text-[12px] uppercase tracking-[.14em] text-muted">{f.kicker}</div>
      <h1 className="mt-3 text-[clamp(36px,5vw,60px)] font-extrabold leading-[1.02] tracking-[-.04em]">{f.title}</h1>
      <p className="mt-4 text-[15px] text-muted">{f.byline} · {fmt(f.date)}</p>
      <p className="mt-8 text-[21px] font-semibold leading-snug text-[#4A2A45]">{f.summary}</p>
      <div className="mt-8 flex flex-col gap-5 text-[18px] leading-[1.75] text-[#3B2A38]">{f.body.map((p, i) => <p key={i}>{p}</p>)}</div>
      {others.length > 0 && <aside className="mt-14 border-t border-line pt-8">
        <div className="text-xs font-extrabold uppercase tracking-[.2em]">More from the Founder Files</div>
        <ul className="mt-4 flex flex-col gap-3">{others.map(o => <li key={o.slug}><Link href={`/founder-files/${o.slug}`} className="text-[18px] font-bold underline underline-offset-4">{o.title}</Link></li>)}</ul>
      </aside>}
    </article>
  );
}
