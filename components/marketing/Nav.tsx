'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Wordmark } from '../Brand';

const LINKS = [['Product', '/#product'], ['Contracts', '/#contracts'], ['Taxes', '/#taxes'], ['How it works', '/#how'], ['Pricing', '/pricing'], ['Our story', '/about']];
export function Nav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[rgba(250,247,243,.88)] backdrop-blur-[14px]">
      <div className="mx-auto flex h-[72px] max-w-[1240px] items-center gap-4 px-6">
        <Link href="/" aria-label="netbyfriday home"><Wordmark size={26} /></Link>
        <nav className="ml-6 hidden gap-1 min-[860px]:flex" aria-label="Main">
          {LINKS.map(([l, h]) => <Link key={l} href={h} className="flex h-[38px] items-center rounded-[10px] px-3 text-[15px] font-semibold hover:bg-lavender">{l}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 min-[860px]:flex">
          {signedIn ? <Link href="/overview" className="flex h-11 items-center rounded-xl bg-chartreuse px-5 text-[15px] font-bold transition hover:-translate-y-px">Open your workspace</Link> : <>
            <Link href="/login" className="px-3 text-[15px] font-semibold">Log In</Link>
            <Link href="/waitlist" className="flex h-11 items-center rounded-xl bg-chartreuse px-5 text-[15px] font-bold transition hover:-translate-y-px">Get Early Access</Link></>}
        </div>
        <button className="ml-auto h-10 rounded-[10px] border border-line2 px-4 text-[15px] font-bold min-[860px]:hidden" aria-expanded={open} onClick={() => setOpen(o => !o)}>{open ? 'Close' : 'Menu'}</button>
      </div>
      {open && <div className="border-t border-line bg-bg px-6 pb-4 min-[860px]:hidden">
        {[...LINKS, ...(signedIn ? [['Open your workspace', '/overview']] : [['Log In', '/login'], ['Get Early Access', '/waitlist']])].map(([l, h]) =>
          <Link key={l} href={h} onClick={() => setOpen(false)} className="flex h-[52px] items-center border-b border-line text-lg font-bold last:border-0">{l}</Link>)}
      </div>}
    </header>
  );
}
