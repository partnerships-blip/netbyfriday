import Link from 'next/link';
import { siteSample } from '@/lib/marketing/sample';
import { PLANS, ILLUSTRATIVE_LABEL } from '@/lib/billing/plans';
import { HeroPreview } from '@/components/marketing/HeroPreview';
import { Net45 } from '@/components/marketing/Net45';
import { RevenueBars } from '@/components/marketing/RevenueBars';
import { AdvisorDemo } from '@/components/marketing/AdvisorDemo';
import { Reveal } from '@/components/marketing/Reveal';
import { PricingCards } from '@/components/marketing/PricingCards';
import { DELIVERABLE_LABEL } from '@/lib/brand';
import { founderStory } from '@/lib/marketing/story';
import { SITE } from '@/lib/site';

const sec = 'py-[clamp(72px,10vw,136px)]', wrap = 'mx-auto max-w-[1240px] px-6';
const h2 = 'text-[clamp(38px,5vw,68px)] font-extrabold leading-none tracking-[-.045em] text-balance';
const eyebrow = 'text-xs font-extrabold uppercase tracking-[.2em]';
const PV: Record<string, string> = { Verified: '#E3EEE5', Projection: '#FFFFFF', Estimate: '#F5ECD8', Suggestion: '#F3FFC4' };

const FAQ: [string, string][] = [
  ['Does netbyfriday connect to my email, bank or social accounts?', 'No. In this version you enter your own records: partnerships, contacts, invoices, payments and tasks. That keeps your data in one place you control, and nothing is read from your inbox or accounts.'],
  ['How does the AI Advisor know my numbers?', 'It reads the records saved in your workspace. Totals like revenue, outstanding and overdue are calculated by netbyfriday first; the Advisor restates them and cites the records it used. Facts it cannot match to your records are marked as not verified.'],
  ['Can the AI send emails or change my invoices?', 'No. It writes drafts you edit and send yourself, and it can suggest small changes such as adding a task, which happen only when you click Confirm. It never changes invoices, payments or other money records.'],
  ['Will netbyfriday get me paid faster?', 'netbyfriday doesn’t control when brands pay. It shows what is owed, when it is due under each payment term, and who to follow up with, so nothing slips.'],
  ['What counts as revenue?', 'Money you have actually received: payments recorded against invoices, and income you record directly. Deal fees, unpaid invoices and pipeline are shown separately and never added to revenue.'],
  ['How do I get access?', 'netbyfriday is in a private beta. Join the waitlist and we’ll send you an invite code when a spot opens.']
];

export default function Home() {
  const s = siteSample();
  const story = founderStory();
  const quote = story.blocks.find(b => b.kind === 'quote')?.text ?? '';
  const why = story.blocks.find(b => b.text.startsWith('The name itself'))?.text ?? '';
  const friday = story.blocks.find(b => b.text.includes('processed by Friday'))?.text ?? '';
  const roles = [
    { role: 'The talent', line: 'Shoots, edits, posts. Repeat.', chips: ['Reel due Thursday', '3 deliverables this week'], cls: 'bg-white', chip: 'bg-[#F3EEF4]' },
    { role: 'The negotiator', line: 'Rates live in a notes app.', chips: ['Counter at $12,000?', 'Is 90 days of usage extra?'], cls: 'bg-lavender', chip: 'bg-white' },
    { role: 'The accountant', line: 'Invoices live in a spreadsheet.', chips: [`${s.roles.lateNumber} · ${s.roles.lateDays} days late`, 'Which tab was NET45?'], cls: 'bg-plum text-bg', chip: 'bg-[rgba(250,247,243,.12)]' },
    { role: 'The project manager', line: 'Deadlines live in the DMs.', chips: ['“Can we see a draft by EOD?”', 'Approval still pending'], cls: 'bg-chartreuse', chip: 'bg-[rgba(255,255,255,.65)]' }
  ];
  const words = ['NET30', 'Deposit on signing', 'NET45', '50% on delivery', 'NET60', 'Usage rights: 60 days', 'Invoice sent', 'Due on receipt', 'Following up…', 'Paid'];
  // Tells Google the site's name and which image is the logo (shown next to the site in search results).
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', '@id': `${SITE.url}/#org`, name: 'netbyfriday', url: SITE.url, logo: `${SITE.url}/logo.png`, email: SITE.contactEmail },
      { '@type': 'WebSite', '@id': `${SITE.url}/#site`, name: 'netbyfriday', url: SITE.url, publisher: { '@id': `${SITE.url}/#org` } }
    ]
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className={`${wrap} grid items-center gap-16 py-[clamp(48px,7vw,96px)] min-[1120px]:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)]`}>
        <div className="flex flex-col gap-7">
          <span className={`flex h-9 w-fit items-center gap-2.5 rounded-full border border-[#E4F28A] bg-[#F3FFC4] px-4 ${eyebrow}`}><span className="h-2 w-2 rotate-45 bg-plum" />The creator business platform</span>
          <h1 className="text-[clamp(46px,6.6vw,92px)] font-extrabold leading-[.98] tracking-[-.045em] min-[1120px]:text-[clamp(46px,5.2vw,78px)]">Run your creator business <span className="nbf-hl">like a business.</span></h1>
          <p className="max-w-[560px] text-[clamp(17px,1.6vw,20px)] leading-[1.55] text-[#4A2A45]">Brand deals, contacts, deliverables, invoices and payment terms, connected in one workspace. Plus an AI Advisor that answers from your own records. Because creating content is only part of the job.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/waitlist" className="flex h-14 items-center gap-2 rounded-[14px] bg-plum px-7 text-[17px] font-bold text-bg transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(50,21,47,.25)]">Get Started Free <span aria-hidden>→</span></Link>
            <Link href="#product" className="flex h-14 items-center rounded-[14px] border-[1.5px] border-plum px-7 text-[17px] font-bold">Explore the Platform</Link>
          </div>
          <div className="grid grid-cols-3 border-t border-line2 pt-5">{[['Manage brand deals', 'Pitch to paid'], ['Track every invoice', 'NET30, 45, 60'], ['Grow with clarity', 'Insights from your data']].map(([a, b], i) =>
            <div key={a} className={`px-3 first:pl-0 ${i ? 'border-l border-line2' : ''}`}><div className="text-[15px] font-extrabold leading-tight">{a}</div><div className="text-[13px] text-muted">{b}</div></div>)}</div>
        </div>
        <HeroPreview s={s} />
      </section>

      <div className="overflow-hidden bg-plum py-[26px]" aria-hidden><div className="nbf-marquee flex w-max">{[...words, ...words].map((w, i) =>
        <span key={i} className={`inline-flex items-center gap-7 whitespace-nowrap pr-7 text-[clamp(22px,3vw,34px)] font-extrabold tracking-[-.03em] ${w.startsWith('NET') ? 'text-chartreuse' : 'text-bg'}`}>{w}<span className="inline-block h-2.5 w-2.5 rotate-45 bg-[#6C4B67]" /></span>)}</div></div>

      <section className={`${wrap} ${sec}`}><Reveal>
        <h2 className={`${h2} max-w-[900px]`}>You&apos;re the talent. The accountant. The negotiator. The entire team.</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-[#4A2A45]">Independent creators run several brand relationships at once, each with its own deliverables, deadlines, invoice and payment terms. Most of it lives across spreadsheets, email threads, DMs and calendar invites, with nothing connecting them.</p>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">{roles.map(r => (
          <div key={r.role} className={`flex min-h-[300px] flex-col justify-between rounded-[24px] p-[26px] transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(50,21,47,.1)] ${r.cls} ${r.cls === 'bg-white' ? 'border border-line' : ''}`}>
            <div><div className="text-2xl font-extrabold tracking-tight">{r.role}</div><p className="mt-1 opacity-80">{r.line}</p></div>
            <div className="flex flex-col gap-2">{r.chips.map(c => <span key={c} className={`w-fit rounded-full px-3 py-1.5 text-[13px] font-semibold ${r.chip}`}>{c}</span>)}</div>
          </div>))}</div>
      </Reveal></section>

      <section id="product" className={`bg-lavender ${sec}`}><div className={wrap}><Reveal>
        <div className={eyebrow}>The platform</div>
        <h2 className={`${h2} mt-3 max-w-[900px]`}>Everything behind the content. Finally together.</h2>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {[
            ['Brand deal management', 'Every partnership from first pitch to final payment, on a board or in a table.', <div key="a" className="flex flex-col gap-1.5">{s.pipeline.slice(1, 6).map(p => <div key={p.label} className="flex items-center gap-2 text-xs"><span className="w-24 font-semibold">{p.label}</span><div className="h-2 flex-1 rounded bg-[#F0EBF2]"><div className="h-full rounded bg-plum" style={{ width: Math.max(8, p.n * 25) + '%' }} /></div><span className="w-4 text-right">{p.n}</span></div>)}</div>],
            ['Invoice & payment tracking', 'Partial payments, NET terms, due dates and what is overdue, calculated for you.', <div key="b"><div className="text-3xl font-extrabold tracking-tight">{s.outstanding}</div><div className="text-xs text-muted">outstanding</div>{s.terms.map(t => <div key={t.terms} className="mt-1.5 flex justify-between text-xs"><span className="rounded-full bg-[#F3FFC4] px-2 font-bold">{t.terms}</span><span>{t.open}</span></div>)}</div>],
            ['Content & deliverables', 'Deadlines, drafts in review and approvals for every campaign, with a calendar.', <div key="c"><div className="text-sm font-extrabold">{s.campaign}</div>{s.deliverables.map(x => <div key={x.name} className="mt-1.5 flex items-center justify-between rounded-lg border border-line px-2 py-1.5 text-xs"><span>{x.name}</span><span className="rounded-full bg-[#F3EEF4] px-1.5 font-semibold">{DELIVERABLE_LABEL[x.status]}</span></div>)}</div>],
            ['Contacts & relationships', 'The people at each brand, linked to their partnerships, invoices and tasks.', <div key="d"><div className="text-4xl font-extrabold tracking-tight">{s.repeatPct}</div><div className="text-xs text-muted">of brands booked again</div><div className="mt-3 flex h-3 overflow-hidden rounded-full">{['#32152F', '#6C4B67', '#9A8396', '#C4B0C0', '#DFFF43'].map(c => <div key={c} className="flex-1" style={{ background: c }} />)}</div></div>],
            ['Revenue intelligence', 'Revenue received, expected cash, payment-term patterns and client concentration.', <div key="e" className="flex h-full items-end gap-1">{s.months.map(m => <div key={m.label} className="flex-1 rounded-t bg-plum" style={{ height: Math.max(6, m.cents / Math.max(...s.months.map(x => x.cents)) * 120) }} />)}</div>],
            ['AI business assistant', 'Answers from your own records, drafts follow-ups, and suggests next steps you confirm.', <div key="f" className="flex flex-col gap-2"><div className="ml-auto rounded-[12px_12px_4px_12px] bg-plum px-3 py-2 text-xs text-bg">How much is still outstanding?</div><div className="rounded-xl bg-[#F3EEF4] px-3 py-2 text-xs">{s.advisor[1].answer} <span className="font-bold">Sample answer.</span></div></div>]
          ].map(([t, d, ui]) => (
            <div key={t as string} className="flex flex-col rounded-[24px] bg-white p-3 transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(50,21,47,.1)]">
              <div className="h-[200px] overflow-hidden rounded-[16px] bg-bg p-4">{ui}</div>
              <div className="px-3 pb-3 pt-5"><div className="text-[22px] font-extrabold tracking-[-.03em]">{t}</div><p className="mt-1.5 text-[15px] leading-relaxed text-sub">{d}</p></div>
            </div>))}
        </div>
      </Reveal></div></section>

      <section id="how" className={`${wrap} ${sec}`}><Reveal>
        <div className={eyebrow}>How it works</div>
        <h2 className={`${h2} mt-3 max-w-[900px]`}>Your records in. Clarity out.</h2>
        <div className="mt-10 grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">{[
          ['1', 'Add your business', 'Enter your partnerships, the people you work with, your invoices and your tasks. Import past deals from a spreadsheet.', 'bg-white border border-line'],
          ['2', 'See it connected', 'Every deal links to its contact, deliverables, invoices and payments. Dashboards calculate revenue, what is owed and what is due.', 'bg-lavender'],
          ['3', 'Ask and act', 'Ask the AI Advisor what needs attention. It answers from your records, drafts the follow-up, and waits for you to confirm anything.', 'bg-chartreuse']
        ].map(([n, t, d, cls]) => <div key={n} className={`flex min-h-[260px] flex-col gap-4 rounded-[24px] p-[26px] ${cls}`}><span className="grid h-11 w-11 place-items-center rounded-full bg-plum text-lg font-extrabold text-bg">{n}</span><div className="text-2xl font-extrabold tracking-tight">{t}</div><p className="text-[15px] leading-relaxed opacity-80">{d}</p></div>)}</div>
      </Reveal></section>

      <section id="net45" className={`bg-plum text-bg ${sec}`}><div className={wrap}>
        <div className={`${eyebrow} text-[#CDB9C9]`}>The NET45 era</div>
        <h2 className={`${h2} mt-3 max-w-[900px]`}>The content went live. <em className="text-chartreuse">The invoice is still pending.</em></h2>
        <div className="mt-12"><Net45 /></div>
        <p className="mt-10 max-w-[720px] text-[18px] leading-relaxed text-[#CDB9C9]">netbyfriday doesn&apos;t decide when brands pay. It makes sure you always know what&apos;s owed, when it&apos;s due, and who to follow up with.</p>
      </div></section>

      <section className={`${wrap} ${sec}`}><Reveal>
        <div className={eyebrow}>Business intelligence</div>
        <h2 className={`${h2} mt-3 max-w-[900px]`}>Your influence generates data. We help you use it.</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-[#4A2A45]">netbyfriday doesn&apos;t just store your deals and invoices. It calculates what they mean and labels every insight: verified from your records, an estimate, or a suggestion.</p>
        <div className="mt-10 grid gap-4 min-[860px]:grid-cols-3">
          <div className="rounded-[24px] border border-line bg-white p-6 min-[860px]:col-span-2"><div className="text-sm font-bold text-muted">Revenue received · last 12 months</div><div className="mt-1 flex flex-wrap items-baseline gap-3"><span className="text-[44px] font-extrabold tracking-[-.04em]">{s.total12}</span><span className="text-sm font-semibold text-ok">{s.growth}</span></div><div className="mt-6"><RevenueBars months={s.months} /></div></div>
          <div className="grid gap-4">{s.tiles.slice(0, 2).map((t, k) => <div key={t.label} className={`rounded-[24px] p-5 ${k ? 'bg-plum text-bg' : 'border border-line bg-white'}`}><div className="flex justify-between text-sm font-bold"><span>{t.label}</span><span className="rounded-full px-2 text-[11px] text-ink" style={{ background: PV[t.pill] }}>{t.pill}</span></div><div className="mt-2 text-[34px] font-extrabold tracking-[-.04em]">{t.value}</div><div className="text-[13px] opacity-75">{t.sub}</div></div>)}</div>
          {s.tiles.slice(2).map((t, k) => <div key={t.label} className={`rounded-[24px] p-5 ${k ? 'bg-chartreuse' : 'bg-lavender'}`}><div className="flex justify-between text-sm font-bold"><span>{t.label}</span><span className="rounded-full px-2 text-[11px]" style={{ background: PV[t.pill] }}>{t.pill}</span></div><div className="mt-2 text-[34px] font-extrabold tracking-[-.04em]">{t.value}</div><div className="text-[13px] opacity-75">{t.sub}</div></div>)}
          <div className="rounded-[24px] border border-line bg-white p-5">{s.insights.map((x, k) => <div key={x.title} className={`py-2.5 ${k ? 'border-t border-soft2' : ''}`}><span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: PV[x.evidence] ?? '#EFE9F1' }}>{x.evidence}</span><div className="mt-1 text-[15px] font-bold leading-snug">{x.title}</div></div>)}</div>
        </div>
        <p className="mt-4 text-[13px] text-muted">All figures on this page are calculated from a fictional sample creator&apos;s records.</p>
      </Reveal></section>

      <section id="advisor" className={`bg-lavender ${sec}`}><div className={wrap}><Reveal>
        <div className={eyebrow}>AI Advisor</div>
        <h2 className={`${h2} mt-3 max-w-[900px]`}>Business advice that actually knows your business.</h2>
        <p className="mt-5 max-w-[720px] text-[18px] leading-relaxed text-[#4A2A45]">Answers come from your own records, with the numbers shown and suggestions labeled as suggestions. Nothing is ever sent or changed without your approval.</p>
        <div className="mt-10"><AdvisorDemo samples={s.advisor} /></div>
      </Reveal></div></section>

      <section id="story" className={`${wrap} ${sec}`}><Reveal>
        <div className="grid items-start gap-10 min-[860px]:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <div className={eyebrow}>{story.byline || 'Our story'}</div>
            <h2 className={`${h2} mt-3`}>Built by a creator who still sends the invoices.</h2>
          </div>
          <div className="flex flex-col gap-5 text-[18px] leading-[1.7] text-[#4A2A45]">
            <blockquote className="rounded-[24px] bg-plum px-7 py-6 text-[clamp(22px,2.4vw,28px)] font-extrabold leading-snug tracking-[-.03em] text-bg">{quote}</blockquote>
            <p>{why}</p><p>{friday}</p>
            <Link href="/about" className="w-fit text-[16px] font-bold underline underline-offset-4">Read the full story →</Link>
          </div>
        </div>
      </Reveal></section>

      <section id="pricing" className={`${wrap} ${sec}`}><Reveal>
        <div className={eyebrow}>Pricing</div>
        <h2 className={`${h2} mt-3`}>Start free. Grow into it.</h2>
        <p className="mt-3 text-sm font-semibold text-muted">{ILLUSTRATIVE_LABEL}</p>
        <div className="mt-10"><PricingCards plans={PLANS} /></div>
      </Reveal></section>

      <section id="faq" className={`${wrap} pb-[clamp(72px,10vw,136px)]`}><Reveal>
        <h2 className={h2}>Questions, answered.</h2>
        <div className="mt-8 flex flex-col">{FAQ.map(([q, a]) => <details key={q} className="group border-b border-line py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[19px] font-extrabold tracking-tight">{q}<span className="text-2xl transition group-open:rotate-45">+</span></summary><p className="mt-3 max-w-[760px] text-[16px] leading-relaxed text-[#4A2A45]">{a}</p></details>)}</div>
      </Reveal></section>

      <section className={`${wrap} pb-[clamp(72px,10vw,136px)]`}>
        <div className="rounded-[36px] bg-plum px-8 py-16 text-center text-bg">
          <h2 className={`${h2} mx-auto max-w-[900px]`}>Your influence is the business. <em className="text-chartreuse">Start treating it like one.</em></h2>
          <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/waitlist" className="flex h-14 items-center gap-2 rounded-[14px] bg-chartreuse px-7 text-[17px] font-bold text-plum transition hover:-translate-y-0.5">Get Started Free <span aria-hidden>→</span></Link>
            <Link href="#product" className="flex h-14 items-center rounded-[14px] border-[1.5px] border-bg px-7 text-[17px] font-bold">Explore the platform</Link></div>
        </div>
      </section>
    </>
  );
}
