import { Card, Pill, cx } from '@/components/ui';
import { FLAG_INFO, type RedFlag } from '@/lib/contracts/redflags';

/** The clauses that commonly burn creators, each with the actual wording, what it means, and what to ask for instead. */
export function RedFlags({ flags, context = 'contract' }: { flags: RedFlag[]; context?: 'contract' | 'message' }) {
  const high = flags.filter(f => f.severity === 'high').length;
  return (
    <section aria-label="Red flags"><Card className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-head text-[24px]">Red flags</h2>
        {flags.length > 0 && <Pill tone={high ? 'danger' : 'warn'}>{high ? `${high} high risk` : 'Worth checking'}{flags.length > high && high ? ` · ${flags.length - high} to check` : ''}</Pill>}
      </div>
      {flags.length === 0 ? (
        <p className="text-sm leading-relaxed text-muted">None of the common traps we look for were found in this {context}: no-end-date usage, giving up ownership, pay-when-paid, long payment terms, clawbacks and others. That doesn’t make it risk-free: still read the usage, exclusivity and payment terms below.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {flags.map((f, i) => {
            const info = f.id === 'other' ? null : FLAG_INFO[f.id];
            return (
              <li key={`${f.id}-${i}`} className={cx('rounded-[14px] border p-3.5', f.severity === 'high' ? 'border-[#E8C9C0] bg-[#FBF3F0]' : 'border-[#E8D9A8] bg-[#FBF6E6]')}>
                <details open={f.severity === 'high'} className="group">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2">
                    <Pill tone={f.severity === 'high' ? 'danger' : 'warn'}>{f.severity === 'high' ? 'High risk' : 'Check this'}</Pill>
                    <span className="text-[15px] font-semibold">{f.title}</span>
                    <span className="ml-auto text-[12px] text-sub group-open:hidden">Explain</span>
                  </summary>
                  <div className="mt-2.5 flex flex-col gap-2 text-[13px] leading-relaxed">
                    <span className="block border-l-[3px] border-line2 pl-2.5 italic text-sub">“{f.quote}”{f.found === undefined ? ' (from the PDF)' : ''}</span>
                    {info ? (<>
                      <p><b>What it means:</b> {info.means}</p>
                      <p><b>What can go wrong:</b> {info.burn}</p>
                      <p><b>What to ask for:</b> {info.ask}</p>
                    </>) : <p><b>Why it’s flagged (AI note):</b> {f.aiNote}</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[12px] leading-relaxed text-muted">Plain-English explanations to help you negotiate, not legal advice. For a large or unusual deal, have a lawyer review the contract.</p>
    </Card></section>
  );
}

/** A small “What’s this?” toggle with a plain-English explanation of a contract term. */
export function TermHelp({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <details className="text-[12px] leading-relaxed text-sub">
      <summary className="w-fit cursor-pointer list-none underline underline-offset-2">What’s this?</summary>
      <p className="mt-1">{text}</p>
    </details>
  );
}
