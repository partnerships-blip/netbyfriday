import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AgreementDocument } from '@/components/AgreementDocument';
import { parseAgreementText } from '@/lib/agreements/template';
import { PrintButton } from '@/app/i/[token]/PrintButton';
import { SignForm } from './SignForm';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Agreement', robots: { index: false, follow: false } };

type Shared = { title: string; status: 'sent' | 'signed'; body: string; body_sha256: string; creator_name: string; creator_email: string; creator_signature: string; creator_signed_at: string;
  signer_name: string; signer_title: string; signer_email: string; signer_signature: string; signed_at: string | null; audit: any[] };

/** The agreement a brand opens from the creator's link. Read through one security-definer function, by unguessable token only. */
export default async function SignPage({ params }: { params: { token: string } }) {
  if (!/^[0-9a-f-]{36}$/i.test(params.token)) notFound();
  const sb = createClient();
  const { data } = await sb.rpc('shared_agreement', { p_token: params.token });
  const a = data as Shared | null;
  if (!a) notFound();
  if (a.status === 'sent') {
    const h = headers();
    await sb.rpc('agreement_opened', { p_token: params.token, p_ip: (h.get('x-forwarded-for') ?? '').split(',')[0].trim(), p_ua: h.get('user-agent') ?? '' });
  }
  const doc = parseAgreementText(a.body);
  const signed = a.status === 'signed';
  return (
    <main className="min-h-screen bg-bg px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-[820px] flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <span className="text-[13px] text-sub">{signed ? `Signed by both parties` : `${a.creator_name} has signed and sent you this agreement`}</span>
          {signed && <PrintButton />}
        </div>
        {signed && <p className="rounded-[14px] border border-[#BFDCC6] bg-[#EEF7F0] px-4 py-3 text-[14px] print:hidden">This agreement is signed. Use <b>Download PDF</b> to keep a copy; choose “Save as PDF” in the print window.</p>}
        <AgreementDocument doc={doc} sha256={a.body_sha256} audit={signed ? a.audit : undefined}
          creator={{ label: 'Creator', name: a.creator_name, signature: a.creator_signature, signedAt: a.creator_signed_at, email: a.creator_email }}
          brand={{ label: 'Brand', name: a.signer_name, title: a.signer_title, signature: a.signer_signature, signedAt: a.signed_at, email: a.signer_email }} />
        {!signed && <SignForm token={params.token} hash={a.body_sha256} />}
        <p className="text-center text-xs text-muted print:hidden">Prepared with netbyfriday from a plain-English template. netbyfriday is not a party to this agreement and does not provide legal advice.</p>
      </div>
    </main>
  );
}
