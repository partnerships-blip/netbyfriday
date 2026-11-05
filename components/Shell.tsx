'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cx } from './ui';
import { flag } from '@/lib/flags';
import { AppIcon, Wordmark } from './Brand';
import { Toaster, useAction } from './Toaster';
import { FeedbackButton } from './FeedbackButton';
import { markNotificationsRead, setDemoMode } from '@/app/(app)/actions';

// V1 workspace navigation. Flagged screens (Insights, Opportunities, Audience) appear only when their flag is on.
const NAV: (readonly [string, string])[] = [
  ['/overview', 'Dashboard'], ['/partnerships', 'Partnerships'], ['/content', 'Content'], ['/money', 'Invoices & Revenue'],
  ...(flag('contracts') ? [['/contracts', 'Contracts'] as const] : []),
  ...(flag('taxes') ? [['/taxes', 'Taxes'] as const] : []),
  ['/contacts', 'Brands & Contacts'], ['/tasks', 'Tasks'], ['/advisor', 'AI Advisor'],
  ...(flag('insights') ? [['/intelligence', 'Insights'] as const] : []),
  ...(flag('opportunities') ? [['/opportunities', 'Opportunities'] as const] : []),
  ...(flag('audience') ? [['/audience', 'Audience'] as const] : []),
  ['/settings', 'Settings']
];
const MOBILE = [['/overview', 'Home'], ['/partnerships', 'Deals'], ['/money', 'Money'], ['/tasks', 'Tasks']] as const;
const MORE = ['/content', '/contracts', '/taxes', '/contacts', '/advisor', '/intelligence', '/opportunities', '/audience', '/settings'];

type Notif = { key: string; type: string; text: string; href: string; unread: boolean };

export function Shell({ children, brandName, logoUrl, initials, name, business, demo, isAdmin, notifications, badges, dateLabel, optedIn }: {
  children: ReactNode; brandName: string; logoUrl: string | null; initials: string; name: string; business: string; demo: boolean; isAdmin: boolean;
  notifications: Notif[]; badges: Record<string, number>; dateLabel: string; optedIn: boolean;
}) {
  const path = usePathname();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [feedbackRequest, setFeedbackRequest] = useState(0);
  const [, run] = useAction();
  const unread = notifications.filter(n => n.unread);
  const current = NAV.find(([h]) => path.startsWith(h));
  const switchMode = () => run(() => setDemoMode(!demo), () => router.refresh());
  const whiteLabel = flag('whiteLabel');
  const Mark = ({ size = 22 }: { size?: number }) => whiteLabel && logoUrl
    ? <div className="flex-none rounded-md bg-cover bg-center" style={{ width: size, height: size, backgroundImage: `url("${logoUrl}")` }} />
    : <AppIcon size={size} />;

  return (
    <div className="flex h-dvh overflow-hidden bg-bg">
      <aside className="hidden w-[236px] flex-none flex-col gap-6 border-r border-line px-3 py-5 md:flex">
        <div className="flex items-center gap-2.5 px-2.5 py-1">{whiteLabel ? <><Mark /><div className="truncate text-[15px] font-semibold tracking-tight">{brandName}</div></> : <Wordmark size={23} />}</div>
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {NAV.map(([href, label], i) => {
            const on = path.startsWith(href);
            const b = badges[href];
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={cx('flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition hover:bg-[#EAE5F7]', on ? 'bg-[#DFFF43] font-bold text-ink' : 'font-medium text-sub')}>
                <span className="w-4 font-mono text-[10px] text-faint">{String(i + 1).padStart(2, '0')}</span>
                <span className="flex-1">{label}</span>
                {!!b && <span className={cx('grid h-5 min-w-5 place-items-center rounded-full px-1.5 font-mono text-[11px]', (href === '/money' || href === '/tasks') ? 'bg-[#F3DDD6] text-danger' : 'bg-line text-sub')}>{b}</span>}
              </Link>
            );
          })}
          {isAdmin && <Link href="/admin" className="mt-2 flex h-9 items-center gap-3 rounded-lg px-2.5 text-sm font-medium text-sub hover:bg-[#EAE5F7]"><span className="w-4" />Beta admin</Link>}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
            <div className="font-mono text-[10px] uppercase tracking-[.08em] text-muted">{demo ? 'Demo mode' : 'My workspace'}</div>
            <div className="text-[13px] leading-snug">{demo ? 'Fictional data for a sample creator. Read-only.' : 'Only the records you have added.'}</div>
            <button onClick={switchMode} className="h-[30px] rounded-lg border border-line2 bg-bg text-[13px]">{demo ? 'Switch to my workspace' : 'View the demo'}</button>
          </div>
          <div className="flex items-center gap-2.5 px-1.5 py-1">
            <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ink text-xs font-semibold text-bg">{initials}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-semibold">{name}</div><div className="truncate text-xs text-muted">{business}</div></div>
            <form action="/auth/signout" method="post"><button className="text-xs text-muted underline underline-offset-2 hover:text-ink">Sign out</button></form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[60px] flex-none items-center gap-2.5 border-b border-line px-4 md:px-10">
          <div className="md:hidden"><Mark size={20} /></div>
          <div className="min-w-0 flex-1 truncate font-mono text-[11px] uppercase tracking-[.08em] text-muted">{path.startsWith('/overview') ? dateLabel : current?.[1] ?? ''}</div>
          {demo && <button onClick={switchMode} className="h-7 whitespace-nowrap rounded-full border border-dashed border-faint px-2.5 font-mono text-[10px] uppercase tracking-wider text-sub" aria-label="Demo, fictional data. Switch to my workspace">Demo<span className="hidden sm:inline"> · fictional data</span></button>}
          <button onClick={() => setNotifOpen(o => !o)} aria-label={`Notifications, ${unread.length} unread`} className="flex h-9 items-center gap-1.5 rounded-[10px] border border-line bg-white px-2.5">
            <span className={cx('h-2 w-2 rounded-full', unread.length ? 'bg-danger' : 'bg-[#CDB9C9]')} /><span className="font-mono text-xs">{unread.length}</span>
          </button>
          <Link href="/advisor" className="flex h-9 items-center whitespace-nowrap rounded-[10px] bg-ac px-3.5 text-sm font-medium text-ac-ink">Ask AI</Link>
          <div className="hidden h-8 w-8 flex-none place-items-center rounded-full bg-ink text-xs font-semibold text-bg md:grid">{initials}</div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto"><div className="mx-auto flex max-w-[1240px] flex-col gap-7 px-4 pb-24 pt-6 md:px-10 md:pb-16 md:pt-9">{children}</div></main>
        <nav className="grid h-16 flex-none grid-cols-5 border-t border-line bg-white md:hidden" aria-label="Main">
          {MOBILE.map(([href, label]) => { const on = path.startsWith(href); return (
            <Link key={href} href={href} className={cx('flex flex-col items-center justify-center gap-1.5 text-[11px]', on ? 'font-semibold text-ink' : 'text-muted')}><span className={cx('h-[3px] w-[18px] rounded', on ? 'bg-ac' : 'bg-transparent')} />{label}</Link>); })}
          <button onClick={() => setMoreOpen(o => !o)} className={cx('flex flex-col items-center justify-center gap-1.5 text-[11px]', MORE.some(m => path.startsWith(m)) ? 'font-semibold text-ink' : 'text-muted')}><span className={cx('h-[3px] w-[18px] rounded', MORE.some(m => path.startsWith(m)) ? 'bg-ac' : 'bg-transparent')} />More</button>
        </nav>
      </div>

      {moreOpen && <>
        <div className="fixed inset-0 z-30 bg-ink/20 md:hidden" onClick={() => setMoreOpen(false)} />
        <div className="animate-in fixed inset-x-0 bottom-16 z-40 flex flex-col rounded-t-2xl border-t border-line bg-white px-3 pb-3.5 pt-2.5 md:hidden">
          {[...NAV.filter(([h]) => MORE.includes(h)), ...(isAdmin ? [['/admin', 'Beta admin'] as const] : [])].map(([href, label]) => <Link key={href} href={href} onClick={() => setMoreOpen(false)} className="flex h-12 items-center border-b border-soft2 px-2.5 text-[15px]">{label}</Link>)}
          <button onClick={() => { setMoreOpen(false); setFeedbackRequest(n => n + 1); }} className="flex h-12 items-center border-b border-soft2 px-2.5 text-left text-[15px]">Send feedback</button>
          <form action="/auth/signout" method="post"><button className="h-12 w-full px-2.5 text-left text-[15px] text-sub">Sign out</button></form>
        </div>
      </>}

      {notifOpen && <>
        <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
        <div className="animate-in fixed right-3 top-14 z-50 max-h-[70vh] w-[380px] max-w-[calc(100%-24px)] overflow-auto rounded-card border border-line bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-soft px-4 py-3.5"><span className="text-sm font-semibold">Notifications</span>
            {!demo && unread.length > 0 && <button onClick={() => run(() => markNotificationsRead(unread.map(n => n.key)), () => router.refresh())} className="text-xs text-sub underline">Mark all read</button>}</div>
          {notifications.length === 0 && <div className="px-4 py-5 text-sm text-muted">You're all caught up.</div>}
          {notifications.map(n => (
            <Link key={n.key} href={n.href} onClick={() => { setNotifOpen(false); if (n.unread && !demo) markNotificationsRead([n.key]); }} className={cx('flex gap-2.5 border-b border-soft2 px-4 py-3', n.unread ? 'bg-white' : 'bg-paper')}>
              <span className={cx('mt-1.5 h-[7px] w-[7px] flex-none rounded-full', n.unread ? 'bg-ac' : 'bg-transparent')} />
              <span className="flex flex-col gap-0.5"><span className="font-mono text-[10px] uppercase tracking-wider text-muted">{n.type}</span><span className="text-sm leading-snug">{n.text}</span></span>
            </Link>
          ))}
          <div className="px-4 py-2.5 text-xs text-muted">{optedIn ? 'In-app plus your opted-in channels.' : 'In-app only. Email and push stay off until you opt in under Settings.'}</div>
        </div>
      </>}
      <FeedbackButton openRequest={feedbackRequest} />
      <Toaster />
    </div>
  );
}
