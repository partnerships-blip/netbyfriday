import type { RenderedAgreement } from '@/lib/agreements/template';

type Sig = { label: string; name: string; title?: string; signature: string; signedAt: string | null; email?: string };
type AuditEvent = { event: string; at: string; by?: string; email?: string; ip?: string; user_agent?: string; sha256?: string };

const when = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' });
const EVENT: Record<string, string> = {
  created: 'Draft created', consented: 'Agreed to sign electronically', creator_signed: 'Creator signed', link_created: 'Private signing link created',
  opened: 'Signing link first opened', signed: 'Brand signed', voided: 'Voided; link turned off'
};

/** The agreement as both sides see it: numbered sections, then the signature blocks. Used in the app, on the link and in print. */
export function AgreementDocument({ doc, creator, brand, sha256, audit, draft }: { doc: RenderedAgreement; creator: Sig; brand: Sig; sha256?: string | null; audit?: AuditEvent[]; draft?: boolean }) {
  return (
    <article className="relative flex flex-col gap-6 rounded-[22px] border border-line bg-white p-[clamp(22px,4vw,48px)] text-[15px] leading-relaxed shadow-[0_24px_60px_rgba(50,21,47,.06)] print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {draft && <span className="absolute right-6 top-6 rounded-full border border-line2 px-3 py-1 font-mono text-[11px] uppercase tracking-[.12em] text-muted print:hidden">Draft preview</span>}
      <header className="flex flex-col gap-3 border-b border-line pb-6">
        <h1 className="font-head text-[clamp(26px,4vw,36px)] leading-[1.08]">{doc.title}</h1>
        <p className="text-[#4A2A45]">{doc.intro}</p>
      </header>
      {doc.sections.map((s, i) => (
        <section key={i} className="flex flex-col gap-1.5 break-inside-avoid">
          <h2 className="text-[16px] font-bold">{i + 1}. {s.heading}</h2>
          {s.lines.map((l, j) => <p key={j} className={l.startsWith('• ') ? 'pl-4' : ''}>{l}</p>)}
        </section>
      ))}
      <section className="mt-2 grid gap-4 border-t border-line pt-6 sm:grid-cols-2 break-inside-avoid">
        {[creator, brand].map(p => (
          <div key={p.label} className="flex flex-col gap-1">
            <span className="font-mono text-[11px] uppercase tracking-[.1em] text-muted">{p.label}</span>
            <span className={p.signature ? 'border-b border-ink pb-1 font-head text-[30px] italic leading-tight' : 'h-[46px] border-b border-dashed border-line2'}>{p.signature || ''}</span>
            <span className="text-sm font-semibold">{p.name || '—'}{p.title ? `, ${p.title}` : ''}</span>
            <span className="text-xs text-muted">{p.signedAt ? `Signed electronically ${when(p.signedAt)}` : 'Not signed yet'}{p.email ? ` · ${p.email}` : ''}</span>
          </div>
        ))}
      </section>
      {audit && audit.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[14px] bg-bg p-4 text-[13px] break-inside-avoid print:border print:border-line">
          <span className="font-mono text-[11px] uppercase tracking-[.1em] text-muted">Audit trail</span>
          {audit.map((e, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-line pt-1.5 first-of-type:border-0">
              <span>{EVENT[e.event] ?? e.event}{e.by ? ` · ${e.by}` : ''}{e.email ? ` (${e.email})` : ''}{e.ip ? ` · IP ${e.ip}` : ''}</span>
              <span className="tnum text-muted">{when(e.at)}</span>
              {e.user_agent && <span className="col-span-2 truncate text-[11px] text-muted">{e.user_agent}</span>}
            </div>
          ))}
          {sha256 && <span className="break-all font-mono text-[11px] text-muted">Document fingerprint (SHA-256): {sha256}</span>}
        </section>
      )}
    </article>
  );
}
