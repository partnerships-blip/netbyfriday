'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Btn, Card, Eyebrow, Field, Input, Pill, Select, Textarea, cx } from '@/components/ui';
import { AgreementDocument } from '@/components/AgreementDocument';
import { useAction, toast } from '@/components/Toaster';
import { saveAgreement, sendAgreement, voidAgreement, deleteAgreement, linkAgreement } from '@/app/(app)/actions';
import { EMPTY_TERMS, renderAgreement, parseAgreementText, missingRequired, suggestions, type AgreementTerms } from '@/lib/agreements/template';
import type { Agreement } from '@/lib/types';

const STATUS: Record<Agreement['status'], { label: string; tone: 'neutral' | 'warn' | 'ok' | 'accent' }> = {
  draft: { label: 'Draft', tone: 'neutral' }, sent: { label: 'Waiting for the brand to sign', tone: 'warn' }, signed: { label: 'Signed by both', tone: 'ok' }, void: { label: 'Void', tone: 'neutral' }
};
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

export function AgreementEditor({ agreement: a, deals, readOnly }: { agreement: Agreement; deals: { id: string; label: string }[]; readOnly: boolean }) {
  const router = useRouter();
  const [pending, run] = useAction();
  const [t, setT] = useState<AgreementTerms>({ ...EMPTY_TERMS, ...(a.terms as Partial<AgreementTerms>), deliverables: ((a.terms as any)?.deliverables ?? []).map((d: any) => ({ name: d.name ?? '', dueOn: d.dueOn ?? '' })) });
  const [dealId, setDealId] = useState(a.dealId ?? '');
  const [sig, setSig] = useState('');
  const [consent, setConsent] = useState(false);
  const set = <K extends keyof AgreementTerms>(k: K, v: AgreementTerms[K]) => setT(p => ({ ...p, [k]: v }));
  const refresh = () => router.refresh();
  const draft = a.status === 'draft';
  const preview = useMemo(() => (draft ? renderAgreement(t) : parseAgreementText(a.body)), [draft, t, a.body]);
  const missing = missingRequired(t), hints = suggestions(t);
  const ex = a.extracted;
  const quote = (k: string) => { const f = (ex?.fields as any)?.[k]; return f?.quote ? <span className={cx('text-[11px] leading-snug', f.found === false ? 'text-[#8A6418]' : 'text-muted')}>{f.found === false ? 'Not found word for word in the message: ' : 'From the message: '}“{f.quote}”</span> : null; };
  const link = typeof window !== 'undefined' && a.shareToken ? `${window.location.origin}/sign/${a.shareToken}` : '';
  const mailto = `mailto:${encodeURIComponent(t.brandSignerEmail || '')}?subject=${encodeURIComponent(`Agreement for signature: ${a.title}`)}&body=${encodeURIComponent(`Hi${t.brandSignerName ? ' ' + t.brandSignerName.split(' ')[0] : ''},\n\nHere’s our agreement for ${t.campaign || 'the campaign'}. I’ve signed it; you can review and sign here:\n${link}\n\nThank you!\n${t.creatorName}`)}`;

  const save = (then?: () => void) => run(() => saveAgreement({ id: a.id, dealId, terms: t }), () => { then ? then() : refresh(); });
  const signAndSend = () => run(() => saveAgreement({ id: a.id, dealId, terms: t }), () => run(() => sendAgreement({ id: a.id, signature: sig, consent }), refresh));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto font-head text-[clamp(30px,4vw,44px)] leading-[1.05]">{draft ? renderAgreement(t).title : a.title}</h1>
        <Pill tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Pill>
      </div>

      {a.status === 'sent' && (
        <Card className="flex flex-col gap-3 border-[#E8D9A8] bg-[#FBF6E6] p-5">
          <Eyebrow>Send this link to the brand</Eyebrow>
          <div className="flex flex-wrap gap-2">
            <Input readOnly value={link} aria-label="Signing link" className="min-w-[240px] flex-1 font-mono text-xs" onFocus={e => e.currentTarget.select()} />
            <Btn onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied'); }}>Copy link</Btn>
            <a href={mailto} className="inline-flex h-10 items-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white">Open in my email</a>
          </div>
          <p className="text-[13px] text-[#5C4410]">You signed {day(a.creatorSignedAt)}. {a.firstViewedAt ? `The brand opened the link ${day(a.firstViewedAt)}.` : 'The brand hasn’t opened the link yet.'} netbyfriday doesn’t send email: the link goes out from your own email app.</p>
          {!readOnly && <Btn size="sm" variant="danger" className="w-fit" disabled={pending} onClick={() => confirm('Void this agreement? The link will stop working.') && run(() => voidAgreement(a.id), refresh)}>Void agreement</Btn>}
        </Card>)}
      {a.status === 'signed' && (
        <Card className="flex flex-wrap items-center gap-3 border-[#BFDCC6] bg-[#EEF7F0] p-5">
          <span className="min-w-0 flex-1 text-[15px]"><b>Signed by {a.signerName}</b>{a.signerTitle ? `, ${a.signerTitle}` : ''} on {day(a.signedAt)}. Both signatures and the audit trail are below.</span>
          {a.shareToken && <a href={`/sign/${a.shareToken}`} target="_blank" rel="noopener" className="inline-flex h-10 items-center rounded-[10px] bg-ink px-4 text-[13px] font-semibold text-white">Open signed copy (PDF)</a>}
        </Card>)}
      {a.status === 'void' && (
        <Card className="flex flex-wrap items-center gap-3 p-5">
          <span className="min-w-0 flex-1 text-sm text-sub">This agreement was voided {day(a.voidedAt)}. Its link no longer works.</span>
          {!readOnly && <Btn size="sm" variant="danger" disabled={pending} onClick={() => confirm('Delete this voided agreement?') && run(() => deleteAgreement(a.id), () => router.push('/contracts'))}>Delete</Btn>}
          <Link href="/agreements/new" className="text-[13px] font-semibold underline underline-offset-2">Generate a new one</Link>
        </Card>)}

      <div className={cx('grid gap-5', draft && 'lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]')}>
        {draft && (
          <div className="flex flex-col gap-4">
            {ex?.warnings?.length ? <div className="flex flex-col gap-1 rounded-[12px] border border-[#E8D9A8] bg-[#FBF6E6] p-3.5 text-[13px] text-[#5C4410]">{ex.warnings.map((w, i) => <span key={i}>• {w}</span>)}</div> : null}
            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Parties</Eyebrow>
              <Field label="Your name (as you’ll sign)"><Input value={t.creatorName} onChange={e => set('creatorName', e.target.value)} disabled={readOnly} /></Field>
              <Field label="Your email"><Input type="email" value={t.creatorEmail} onChange={e => set('creatorEmail', e.target.value)} disabled={readOnly} /></Field>
              <Field label="Brand"><Input value={t.brandName} onChange={e => set('brandName', e.target.value)} disabled={readOnly} /></Field>{quote('brandName')}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Brand signer"><Input value={t.brandSignerName} onChange={e => set('brandSignerName', e.target.value)} disabled={readOnly} /></Field>
                <Field label="Brand signer email"><Input type="email" value={t.brandSignerEmail} onChange={e => set('brandSignerEmail', e.target.value)} disabled={readOnly} /></Field>
              </div>
              <Field label="Campaign"><Input value={t.campaign} onChange={e => set('campaign', e.target.value)} disabled={readOnly} /></Field>
              <Field label="Partnership"><Select value={dealId} onChange={e => setDealId(e.target.value)} disabled={readOnly}><option value="">Not linked</option>{deals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</Select></Field>
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Deliverables</Eyebrow>
              {t.deliverables.map((d, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <Input aria-label={`Deliverable ${i + 1}`} value={d.name} onChange={e => set('deliverables', t.deliverables.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="min-w-[160px] flex-1" disabled={readOnly} />
                  <Input aria-label={`Publish by ${i + 1}`} type="date" value={d.dueOn} onChange={e => set('deliverables', t.deliverables.map((x, j) => (j === i ? { ...x, dueOn: e.target.value } : x)))} className="w-auto" disabled={readOnly} />
                  {!readOnly && <button className="text-xs text-muted hover:text-danger" onClick={() => set('deliverables', t.deliverables.filter((_, j) => j !== i))}>Remove</button>}
                </div>))}
              {!readOnly && t.deliverables.length < 20 && <Btn size="sm" className="w-fit" onClick={() => set('deliverables', [...t.deliverables, { name: '', dueOn: '' }])}>Add deliverable</Btn>}
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Money</Eyebrow>
              <Field label="Total fee ($)"><Input inputMode="decimal" value={t.fee} onChange={e => set('fee', e.target.value)} disabled={readOnly} /></Field>{quote('fee')}
              <Field label="Payment terms"><Input value={t.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} placeholder="e.g. Net 30 after the posts go live" disabled={readOnly} /></Field>{quote('paymentTerms')}
              <Field label="Kill fee (if the brand cancels)"><Input value={t.killFee} onChange={e => set('killFee', e.target.value)} placeholder="e.g. 50% of the fee" disabled={readOnly} /></Field>{quote('killFee')}
            </Card>
            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Rights and review</Eyebrow>
              <Field label="Usage rights"><Textarea rows={2} value={t.usageRights} onChange={e => set('usageRights', e.target.value)} placeholder="e.g. Organic reposting on the brand’s channels" disabled={readOnly} /></Field>{quote('usageRights')}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Usage length (days)"><Input inputMode="numeric" value={t.usageDays} onChange={e => set('usageDays', e.target.value.replace(/\D/g, ''))} disabled={readOnly} /></Field>
                <Field label="Exclusivity length (days)"><Input inputMode="numeric" value={t.exclusivityDays} onChange={e => set('exclusivityDays', e.target.value.replace(/\D/g, ''))} disabled={readOnly} /></Field>
              </div>
              <Field label="Exclusivity"><Textarea rows={2} value={t.exclusivity} onChange={e => set('exclusivity', e.target.value)} placeholder="Leave empty for none" disabled={readOnly} /></Field>{quote('exclusivity')}
              <Field label="Paid amplification / whitelisting"><Input value={t.whitelisting} onChange={e => set('whitelisting', e.target.value)} disabled={readOnly} /></Field>
              <Field label="Revisions"><Input value={t.revisions} onChange={e => set('revisions', e.target.value)} placeholder="e.g. Up to 2 rounds per deliverable" disabled={readOnly} /></Field>
              <Field label="Review timing"><Input value={t.approval} onChange={e => set('approval', e.target.value)} placeholder="e.g. Brand reviews drafts within 3 business days" disabled={readOnly} /></Field>
              <Field label="Other terms"><Textarea rows={3} value={t.otherTerms} onChange={e => set('otherTerms', e.target.value)} disabled={readOnly} /></Field>
              <Field label="Governing law (state, optional)"><Input value={t.governingLaw} onChange={e => set('governingLaw', e.target.value)} placeholder="e.g. the State of Georgia" disabled={readOnly} /></Field>
            </Card>
            {!readOnly && <div className="flex flex-wrap gap-2"><Btn disabled={pending} onClick={() => save()}>Save draft</Btn><Btn variant="danger" disabled={pending} onClick={() => confirm('Delete this draft?') && run(() => deleteAgreement(a.id), () => router.push('/contracts'))}>Delete draft</Btn></div>}
          </div>)}

        <div className="flex flex-col gap-4">
          {draft && (missing.length > 0 || hints.length > 0) && (
            <div className="flex flex-col gap-1.5 rounded-[14px] border border-line bg-white p-4 text-[13px]">
              {missing.length > 0 && <><span className="font-semibold">Needed before you can sign and send</span>{missing.map(m => <span key={m} className="text-danger">• {m}</span>)}</>}
              {hints.length > 0 && <><span className="mt-1 font-semibold">Worth adding</span>{hints.map(m => <span key={m} className="text-sub">• {m}</span>)}</>}
            </div>)}
          <AgreementDocument doc={preview} draft={draft} sha256={draft ? null : a.bodySha256} audit={draft ? undefined : a.audit}
            creator={{ label: 'Creator', name: draft ? t.creatorName : a.creatorName, signature: a.creatorSignature, signedAt: a.creatorSignedAt, email: draft ? t.creatorEmail : a.creatorEmail }}
            brand={{ label: 'Brand', name: a.signerName || (draft ? t.brandSignerName : (a.terms as any)?.brandSignerName) || (draft ? t.brandName : (a.terms as any)?.brandName) || '', title: a.signerTitle, signature: a.signerSignature, signedAt: a.signedAt, email: a.signerEmail }} />
          {draft && !readOnly && (
            <Card className="flex flex-col gap-3 p-5">
              <Eyebrow>Sign and create the link</Eyebrow>
              <p className="text-[13px] leading-relaxed text-sub">Signing freezes this text: neither side can change it after this. You’ll get a private link to send the brand from your own email.</p>
              <Field label="Type your full name to sign"><Input value={sig} onChange={e => setSig(e.target.value)} placeholder={t.creatorName} className="font-head text-xl italic" /></Field>
              <label className="flex items-start gap-2 text-[13px]"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5" />I agree to sign this agreement electronically, and that my typed name is my signature.</label>
              <Btn variant="primary" size="lg" className="w-fit" disabled={pending || missing.length > 0 || !consent || sig.trim().length < 2} onClick={signAndSend}>Sign and create link</Btn>
            </Card>)}
          {!draft && !readOnly && (
            <Field label="Partnership" className="max-w-[420px]"><Select value={dealId} disabled={pending} onChange={e => { setDealId(e.target.value); run(() => linkAgreement({ contractId: a.id, dealId: e.target.value || null }), refresh); }}><option value="">Not linked</option>{deals.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</Select></Field>)}
          <p className="text-xs leading-relaxed text-muted">A plain-English template filled in with your terms, not legal advice. The AI only suggested terms from your message; the contract wording is fixed. For a large or unusual deal, have a lawyer review it before you sign.</p>
        </div>
      </div>
    </div>
  );
}
