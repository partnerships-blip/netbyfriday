# Contracts, Taxes and sendable invoices

**Live since 2026-11-05.** All three are on by default (`DEFAULT_ON` in `lib/flags.ts`). To switch one off for a deployment, add it with a leading minus to `NEXT_PUBLIC_NBF_FLAGS`, e.g. `-taxes`, and redeploy.

| Feature | Flag | Where |
|---|---|---|
| Contract upload + AI-read terms | `contracts` | `/contracts`, `/contracts/[id]` |
| Taxes (cash-basis set-aside, estimated-tax periods, 1099 check, CSV for an accountant) | `taxes` | `/taxes` |
| Sendable invoices (private link + "Open in my email") | `invoiceLinks` | Send button on Invoices & Revenue, public page `/i/[token]` |

## How each one stays inside the rules

- **Contracts.** The PDF is stored privately (`attachments` bucket, `{workspace_id}/contracts/...`). The AI proposes terms in a contract marked **review**, each with the contract wording it came from. For pasted text, every quote is checked against the text and flagged if it isn't there. The fee is parsed from the quoted wording by `parseMoneyToCents`, and end dates are computed by the engine (`addDays`), never by the model. Nothing changes on a partnership until the creator clicks **Confirm**, which runs through the normal server action (`saveContract`). Confirming can create or update a partnership, add deliverables, and add reminder tasks a week before usage rights or exclusivity end. It never creates invoices or payments. Contract reading counts toward the per-user hourly AI cap. If the AI is unavailable, the contract is saved for manual entry.
- **Contracts on a partnership.** The partnership drawer has a Contracts section: linked contracts with their status and usage/exclusivity end dates, **Upload contract** (the upload starts linked to that partnership, so review defaults to it), **Link an existing contract**, **View file** and **Unlink**. The partnerships table has a Contract column and board cards show the contract status. Linking a confirmed contract (`linkContract`) fills in only the partnership's empty terms (contract status, usage, exclusivity, payment terms); it never overwrites them and never touches the fee, invoices, payments or revenue.
- **Taxes.** Every number comes from `taxYear()` in `lib/finance/core.js`. It is cash basis: payments + direct income received in the year, minus recorded expenses. The set-aside uses a percentage the creator picks (default 25%). Periods and due dates follow IRS Form 1040-ES; dates are listed only for verified years (2025, 2026), and other years say "Check IRS.gov". The 1099-NEC threshold is $600 through 2025 and $2,000 from 2026. Every screen is labelled as planning, not tax advice.
- **Invoices.** netbyfriday still sends no email. **Send** creates a private link (an unguessable token on the invoice) and opens the creator's own email app with the message filled in. The brand opens `/i/[token]` without signing in. That page reads exactly one invoice through the `shared_invoice()` security-definer function, and voided invoices never show. **Turn off link** clears the token, which kills the old link. Payment instructions are free text the creator writes.

## Database

Migration `20261107000001_contracts_taxes_invoice_links.sql`:
- `contracts` table with RLS.
- `workspaces.tax_set_aside_pct`, `invoice_payment_details` and `invoice_email`, with column grants.
- `invoices.share_token`, `sent_at` and `bill_to_email`.
- The `shared_invoice(uuid)` function, executable by `anon`.
- The `ai_usage.kind` constraint now also allows `'contract'`.

`rls_isolation.test.sql` covers contract isolation and token-only invoice reads (plan 29).

## How it went live

1. Merged to `main` with the flags off; the `staging-db` workflow applied migration `20261107000001` to the Supabase project.
2. A second commit turned the three flags on by default, so the new code never ran before its tables existed.
3. PDF reading uses the production `AI_PROVIDER`/`AI_MODEL`; with an OpenAI-compatible provider creators can still paste contract text.

## Not included (ask first)

- **App-sent email.** It needs an email service (for example Resend) and SPF/DKIM records on netbyfriday.com. Both are on the "don't build" list in `CLAUDE.md` today.
- **Word (.docx) contracts.** They need a document parser dependency. Today the app asks creators to save as PDF.

## Red flags and plain-English terms (2026-11-08)

Contract review and the contract generator show a **Red flags** card: the clauses creators most often get burned by, each with the contract's own wording, what it means, what can go wrong, and what to ask for. High-risk items open automatically.

- **Fixed rules first** (`lib/contracts/redflags.ts`): in perpetuity / no end date, irrevocable, giving up ownership (work for hire, assignment), AI training and digital replicas, likeness, worldwide, brand edits, pay-when-paid, pay tied to views or sales, Net 46+ days, payment on approval or campaign end, refunds and clawbacks, cancel for any reason, indemnity, broad exclusivity, paid ads and whitelisting, unlimited revisions, sole discretion, auto-renewal, morality clauses, posts that can never come down, arbitration. They run on the pasted text, on the AI's quotes for PDFs, and again on the terms as the creator edits them (so older contracts get flags too).
- **The AI adds reworded clauses** ("for as long as Brand determines"). Each AI flag must quote wording that's actually in the text; the explanation always comes from our fixed list, never from the model (except "other", labeled as an AI note).
- **"What's this?"** next to each term explains it in plain English (`TERM_HELP`).
- Not legal advice; the card says so. Tests: `lib/contracts/redflags.test.ts`, `tests/e2e/red-flags.spec.ts`, and two red-flag cases in the Contracts evaluation (`docs/AI_EVALS.md`).
