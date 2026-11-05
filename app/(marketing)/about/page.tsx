import Link from 'next/link';
import Image from 'next/image';
import { storyChapters, type StoryBlock } from '@/lib/marketing/story';

export const metadata = {
  title: 'Our story', description: 'Why Poca built NETBYFRIDAY: the business workspace for creators.',
  openGraph: { title: 'The story behind netbyfriday', description: 'Why Poca built the business workspace for creators.', url: '/about', type: 'article', siteName: 'netbyfriday' },
  twitter: { card: 'summary_large_image', title: 'The story behind netbyfriday', description: 'Why Poca built the business workspace for creators.' }
};

// Editorial layout for the founder story. Every word comes from content/founder-story.ts; this file only decides
// how it's set: a cover, four chapters, two photo spreads, pull quotes and a sign-off.
const mono = 'font-mono text-[12px] uppercase tracking-[.18em]';

function Prose({ blocks, dropCap, insertAfter }: { blocks: StoryBlock[]; dropCap?: boolean; insertAfter?: { match: string; node: React.ReactNode } }) {
  return (
    <div className="flex flex-col gap-6 text-[19px] leading-[1.75] text-[#4A2A45]">
      {blocks.map((b, i) => {
        const el = b.kind === 'quote'
          ? <blockquote key={i} className="my-6 border-l-[6px] border-chartreuse pl-6 text-[clamp(26px,3.2vw,40px)] font-extrabold leading-[1.15] tracking-[-.035em] text-ink text-balance">“{b.text}”</blockquote>
          : <p key={i} className={dropCap && i === 0 && b.text.length > 140 ? 'first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:text-[88px] first-letter:font-extrabold first-letter:leading-[.8] first-letter:text-ink' : ''}>{b.text}</p>;
        return insertAfter && b.text.includes(insertAfter.match) ? [el, <div key={i + '-fig'}>{insertAfter.node}</div>] : el;
      })}
    </div>
  );
}

function ChapterHead({ n, title }: { n: string; title: string }) {
  return (
    <header className="flex flex-col gap-3 min-[900px]:sticky min-[900px]:top-28 min-[900px]:self-start">
      <span className={`${mono} text-muted`}>Chapter {n}</span>
      <span className="text-[clamp(64px,8vw,112px)] font-extrabold leading-none tracking-[-.06em] text-transparent [-webkit-text-stroke:2px_#32152F]">{n}</span>
      <h2 className="text-[clamp(28px,3vw,38px)] font-extrabold leading-[1.05] tracking-[-.04em] text-balance">{title}</h2>
    </header>
  );
}

export default function About() {
  const s = storyChapters();
  const [c1, c2, c3, c4] = s.chapters;
  const deck = c1?.blocks.find(b => /wasn.t prepared/i.test(b.text))?.text;
  const friday = c3?.blocks.find(b => b.text.includes('processed by Friday'))?.text.match(/“[^”]+”|"[^"]+"/)?.[0]?.replace(/^["“]|["”]$/g, '');

  return (
    <article>
      {/* Cover */}
      <section className="relative overflow-hidden bg-plum text-bg">
        <div className="mx-auto grid max-w-[1240px] items-end gap-6 px-6 pt-[clamp(48px,7vw,96px)] min-[900px]:grid-cols-[1.15fr_.85fr]">
          <div className="flex flex-col gap-7 pb-[clamp(48px,7vw,96px)]">
            <div className={`${mono} flex items-center gap-3 text-[#CDB9C9]`}><span>The founder issue</span><span className="h-px w-12 bg-[#CDB9C9]/50" /><span>Our story</span></div>
            <h1 aria-label={s.title} className="text-[clamp(52px,8vw,112px)] font-extrabold leading-[.92] tracking-[-.055em]">
              {s.title.replace(/NETBYFRIDAY$/i, '').trim()}<br /><span className="text-chartreuse">netbyfriday</span><span className="text-chartreuse">.</span>
            </h1>
            {deck && <p className="max-w-[560px] text-[clamp(20px,2.2vw,26px)] font-medium leading-[1.4] text-[#E9DEE7]">{deck}</p>}
            <div className="flex items-center gap-4">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-chartreuse text-[17px] font-extrabold text-plum">P</span>
              <span className="flex flex-col"><span className="text-[16px] font-bold">{s.byline || 'Founded by Poca'}</span><span className="text-[14px] text-[#CDB9C9]">Founder and full-time creator</span></span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[460px] self-end">
            <div className="absolute inset-x-[6%] bottom-0 top-[14%] rounded-t-full bg-chartreuse" aria-hidden />
            <Image src="/founder/poca-portrait.webp" alt="Poca, founder of NETBYFRIDAY" width={859} height={1092} priority sizes="(min-width: 900px) 460px, 90vw" className="relative block h-auto w-full" />
            <span className={`${mono} absolute bottom-[18%] left-0 z-10 -rotate-[6deg] rounded-full border-2 border-plum bg-bg px-4 py-2 text-[11px] font-semibold text-plum shadow-[0_10px_30px_rgba(0,0,0,.25)]`}>Still sending invoices</span>
          </div>
        </div>
      </section>

      {/* Contents */}
      <nav aria-label="Chapters" className="border-b border-line bg-bg">
        <ol className="mx-auto grid max-w-[1240px] grid-cols-2 gap-x-6 gap-y-3 px-6 py-6 min-[900px]:grid-cols-4">
          {s.chapters.map(c => <li key={c.n}><a href={`#chapter-${c.n}`} className="flex gap-3 text-[15px] font-semibold hover:underline"><span className="font-mono text-muted">{c.n}</span>{c.title}</a></li>)}
        </ol>
      </nav>

      {/* Chapter 1 */}
      {c1 && <section id="chapter-01" className="mx-auto grid max-w-[1240px] gap-10 px-6 py-[clamp(56px,8vw,112px)] min-[900px]:grid-cols-[300px_minmax(0,680px)] min-[900px]:gap-20">
        <ChapterHead n={c1.n} title={c1.title} /><Prose blocks={c1.blocks} dropCap />
      </section>}

      {/* Photo spread */}
      <figure className="mx-auto max-w-[1240px] px-6">
        <div className="relative overflow-hidden rounded-[28px]">
          <Image src="/founder/poca-hosting.jpg" alt="Poca in conversation with a guest at an outdoor creator gathering" width={1200} height={1187} sizes="(min-width: 1240px) 1192px, 94vw" className="h-[clamp(340px,52vw,640px)] w-full object-cover object-[50%_35%]" />
        </div>
        <figcaption className="mt-3 flex justify-between gap-4 text-[14px] text-muted"><span>Off camera, still on the clock.</span><span className="font-mono text-[12px] uppercase tracking-[.14em]">Poca, founder</span></figcaption>
      </figure>

      {/* Chapter 2, with the second photo set into the text */}
      {c2 && <section id="chapter-02" className="mx-auto grid max-w-[1240px] gap-10 px-6 py-[clamp(56px,8vw,112px)] min-[900px]:grid-cols-[300px_minmax(0,680px)] min-[900px]:gap-20">
        <ChapterHead n={c2.n} title={c2.title} />
        <Prose blocks={c2.blocks} dropCap insertAfter={{ match: 'digging through emails', node: (
          <figure className="my-4 grid gap-5 min-[640px]:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)] min-[640px]:items-end">
            <Image src="/founder/poca-at-the-table.jpg" alt="Poca at a table outdoors, checking her phone" width={1000} height={1499} sizes="(min-width: 640px) 320px, 90vw" className="h-auto w-full rounded-[22px]" />
            <figcaption className="flex flex-col gap-3 border-t-2 border-plum pt-4">
              <span className={`${mono} text-muted`}>Between courses</span>
              <span className="text-[22px] font-extrabold leading-[1.2] tracking-[-.03em] text-ink">The business doesn’t pause because the content looks effortless.</span>
            </figcaption>
          </figure>) }} />
      </section>}

      {/* NET terms band */}
      <section aria-label="Payment terms" className="bg-plum text-bg">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-[clamp(56px,7vw,96px)]">
          <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 text-[clamp(44px,7vw,88px)] font-extrabold leading-[1.02] tracking-[-.06em]">
            {['NET15', 'NET30', 'NET45', 'NET60'].map(t => <span key={t} className={t === 'NET45' ? 'text-chartreuse' : 'text-transparent [-webkit-text-stroke:2px_rgba(250,247,243,.45)]'}>{t}</span>)}
          </div>
          {friday && <p className="max-w-[820px] text-[clamp(24px,3vw,36px)] font-extrabold leading-[1.2] tracking-[-.03em]">“{friday}”<span className="mt-3 block text-[16px] font-medium tracking-normal text-[#CDB9C9]">Every creator who has followed up on an invoice.</span></p>}
        </div>
      </section>

      {[c3, c4].filter(Boolean).map(c => (
        <section key={c!.n} id={`chapter-${c!.n}`} className="mx-auto grid max-w-[1240px] gap-10 px-6 py-[clamp(56px,8vw,112px)] min-[900px]:grid-cols-[300px_minmax(0,680px)] min-[900px]:gap-20">
          <ChapterHead n={c!.n} title={c!.title} /><Prose blocks={c!.blocks} dropCap />
        </section>
      ))}

      {/* Sign-off */}
      <section className="bg-chartreuse">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-6 py-[clamp(64px,9vw,128px)]">
          {s.signoff && <p className="text-[clamp(20px,2vw,24px)] font-semibold italic">{s.signoff}</p>}
          {s.finale && <p className="max-w-[980px] text-[clamp(44px,7vw,96px)] font-extrabold leading-[.98] tracking-[-.055em] text-balance">{s.finale}</p>}
          <div className="flex items-center gap-3"><span className="h-px w-12 bg-plum" /><span className="text-[18px] font-extrabold italic tracking-[-.02em]">Poca</span></div>
          <div className="flex flex-wrap gap-3">
            <Link href="/waitlist" className="flex h-14 items-center gap-2 rounded-[14px] bg-plum px-7 text-[17px] font-bold text-bg transition hover:-translate-y-0.5">Join the waitlist <span aria-hidden>→</span></Link>
            <Link href="/#product" className="flex h-14 items-center rounded-[14px] border-[1.5px] border-plum px-7 text-[17px] font-bold">See the platform</Link>
          </div>
        </div>
      </section>
    </article>
  );
}
