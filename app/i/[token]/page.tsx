import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { flag } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import { formatCentsExact, shortDate } from '@/lib/finance/core.js';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Invoice', robots: { index: false, follow: false } };

type Shared = { number: string; client_name: string; description: string; amount_cents: number; paid_cents: number; issued_on: string; due_on: string; terms: string;
  from_name: string; from_location: string; from_email: string; payment_details: string };

/** The invoice a brand opens from the creator's link. Read through one security-definer function, by unguessable token only. */
export default async function SharedInvoice({ params }: { params: { token: string } }) {
  if (!flag('invoiceLinks') || !/^[0-9a-f-]{36}$/i.test(params.token)) notFound();
  const { data } = await createClient().rpc('shared_invoice', { p_token: params.token });
  const v = data as Shared | null;
  if (!v) notFound();
  const amount = Number(v.amount_cents), paid = Number(v.paid_cents), balance = Math.max(0, amount - paid);
  const year = new Date().getUTCFullYear();

  return (
    <main className="min-h-screen bg-bg px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-[760px] flex-col gap-4">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <span className="text-[13px] text-sub">Invoice from {v.from_name}</span>
          <PrintButton />
        </div>
        <article className="relative overflow-hidden rounded-[22px] border border-line bg-white p-[clamp(24px,5vw,56px)] shadow-[0_24px_60px_rgba(50,21,47,.08)] print:rounded-none print:border-0 print:shadow-none">
          {balance === 0 && <span className="absolute right-8 top-10 rotate-[-10deg] rounded-[10px] border-4 border-ok px-4 py-1 font-mono text-xl font-semibold tracking-[.14em] text-ok">PAID</span>}
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
            <div className="flex flex-col gap-1">
              <span className="text-[22px] font-extrabold tracking-[-.03em]">{v.from_name}</span>
              {v.from_location && <span className="text-sm text-sub">{v.from_location}</span>}
              {v.from_email && <a href={`mailto:${v.from_email}`} className="text-sm text-sub underline underline-offset-2">{v.from_email}</a>}
            </div>
            <div className="flex flex-col items-end gap-1 text-right">
              <h1 className="font-head text-[44px] leading-none">Invoice</h1>
              <span className="font-mono text-sm">{v.number}</span>
            </div>
          </header>

          <section className="grid gap-6 border-b border-line py-8 sm:grid-cols-3">
            <div className="flex flex-col gap-1"><span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">Bill to</span><span className="font-semibold">{v.client_name}</span></div>
            <div className="flex flex-col gap-1"><span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">Issued</span><span>{shortDate(v.issued_on)}, {v.issued_on.slice(0, 4)}</span></div>
            <div className="flex flex-col gap-1"><span className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">Due</span><span className="font-semibold">{shortDate(v.due_on)}, {v.due_on.slice(0, 4)}</span><span className="text-xs text-muted">{v.terms}</span></div>
          </section>

          <section className="flex flex-col py-6">
            <div className="flex justify-between border-b border-soft2 pb-2 font-mono text-[11px] uppercase tracking-[.08em] text-muted"><span>Description</span><span>Amount</span></div>
            <div className="flex justify-between gap-6 border-b border-soft2 py-4"><span className="whitespace-pre-line">{v.description || 'Creative services'}</span><span className="tnum flex-none">{formatCentsExact(amount)}</span></div>
            {paid > 0 && <div className="flex justify-between py-3 text-sub"><span>Payments received</span><span className="tnum">−{formatCentsExact(paid)}</span></div>}
            <div className="mt-2 flex items-baseline justify-between rounded-[14px] bg-plum px-5 py-4 text-white">
              <span className="font-semibold">Balance due</span><span className="tnum text-[28px] font-extrabold tracking-[-.02em]">{formatCentsExact(balance)}</span>
            </div>
          </section>

          {v.payment_details && (
            <section className="flex flex-col gap-1.5 rounded-[14px] bg-[#F3FFC4] p-5">
              <span className="font-mono text-[11px] uppercase tracking-[.08em]">How to pay</span>
              <p className="whitespace-pre-line text-[15px] leading-relaxed">{v.payment_details}</p>
              <p className="text-xs text-sub">Please include {v.number} with your payment.</p>
            </section>
          )}
        </article>
        <p className="text-center text-xs text-muted print:hidden">Sent with netbyfriday · © {year}. Questions about this invoice? Reply to the email it came with.</p>
      </div>
    </main>
  );
}
