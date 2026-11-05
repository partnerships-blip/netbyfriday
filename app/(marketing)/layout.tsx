import Link from 'next/link';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { Nav } from '@/components/marketing/Nav';
import { Wordmark } from '@/components/Brand';
import { SITE } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: 'netbyfriday · The business behind being booked', template: '%s · netbyfriday' },
  description: 'The business workspace for creators: brand deals, contacts, deliverables, invoices, payment terms and an AI Advisor that answers from your own records.',
  robots: { index: true, follow: true }, metadataBase: new URL(SITE.url)
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  let signedIn = false;
  try { signedIn = !!(await createClient().auth.getUser()).data.user; } catch { /* public page; treat as signed out */ }
  const cols: [string, [string, string][]][] = [
    ['Product', [['Features', '/#product'], ['How it works', '/#how'], ['Pricing', '/pricing'], ['AI Advisor', '/#advisor']]],
    ['Company', [['Our story', '/about'], ['FAQ', '/#faq'], ['Join the waitlist', '/waitlist'], ['Contact', `mailto:${SITE.contactEmail}`], ['Log in', '/login']]],
    ['Legal', [['Privacy', '/privacy'], ['Terms', '/terms']]]
  ];
  return (
    <div className="min-h-dvh overflow-x-hidden bg-bg text-ink">
      <Nav signedIn={signedIn} />
      <main>{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-16 min-[860px]:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div><Wordmark size={28} /><p className="mt-3 text-[15px] text-muted">{SITE.tagline}</p></div>
          {cols.map(([t, ls]) => <div key={t}><div className="text-xs font-extrabold uppercase tracking-[.2em] text-muted">{t}</div>
            <ul className="mt-3 flex flex-col gap-2">{ls.map(([l, h]) => <li key={l}><Link href={h} className="text-[15px] font-semibold hover:underline">{l}</Link></li>)}</ul></div>)}
        </div>
        <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-2 border-t border-line px-6 py-6 text-[13px] text-muted">
          <span>© {new Date().getFullYear()} netbyfriday. Product previews use fictional sample data.</span>
          <span>netbyfriday is not a payment service and does not control when brands pay.</span>
        </div>
      </footer>
    </div>
  );
}
