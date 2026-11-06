import Image from 'next/image';
import { publishedStories } from '@/lib/marketing/stories';
// Real founding-creator stories, shown only once a creator has approved their text (see lib/marketing/stories.ts).
// Renders nothing while there are none: no placeholders, no sample testimonials.
export function CreatorStories({ wrap, sec, eyebrow, h2 }: { wrap: string; sec: string; eyebrow: string; h2: string }) {
  const stories = publishedStories();
  if (!stories.length) return null;
  return (
    <section id="stories" className={`${wrap} ${sec}`}>
      <div className={eyebrow}>Founding creators</div>
      <h2 className={`${h2} mt-3 max-w-[900px]`}>In their words.</h2>
      <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">{stories.map(s => (
        <figure key={s.name} className="flex flex-col gap-4 rounded-[24px] border border-line bg-white p-6">
          <div className="flex items-center gap-3">
            {s.image && <Image src={s.image} alt={s.name} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />}
            <figcaption><div className="text-[17px] font-extrabold">{s.name}</div><div className="text-[13px] text-muted">{s.niche}</div></figcaption>
          </div>
          <p className="text-[15px] leading-relaxed text-sub"><span className="font-semibold text-ink">The challenge: </span>{s.challenge}</p>
          <blockquote className="text-[17px] font-semibold leading-snug">“{s.experience}”</blockquote>
          {s.feedback && <p className="text-[14px] leading-relaxed text-sub"><span className="font-semibold text-ink">What they asked for: </span>{s.feedback}</p>}
        </figure>))}</div>
    </section>
  );
}
