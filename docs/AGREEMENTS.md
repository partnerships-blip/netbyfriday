# Contract generator and e-signing (flag: `agreements`)

**Status:** built 2026-11-08. Off for creators by default; on for beta admins so the founder can use and review it.

A creator pastes a brand email, DM or notes (or uploads a screenshot). netbyfriday proposes the terms that were discussed, fills them into a fixed plain-English agreement template, and the creator edits every term. The creator signs, then sends a private link from their own email app. The brand opens the link without an account, agrees to sign electronically, and signs. Both sides can download the signed copy with its audit trail.

## Before turning it on for everyone (founder)

1. **Have a lawyer review the template** in `lib/agreements/template.ts`: every section's wording, the fallbacks used when a term is missing (usage rights, kill fee, exclusivity), and the consent wording on the signing page (`app/sign/[token]/SignForm.tsx`) and in the creator's sign step. Change the template's text there; tests in `lib/agreements/template.test.ts` show what each section produces.
2. **Update the Terms of Service** to cover the generator and e-signing, including that netbyfriday is not a party to the agreements and doesn't give legal advice.
3. **Turn it on:** add `agreements` to `NEXT_PUBLIC_NBF_FLAGS` in Vercel (e.g. `agreements` alongside any existing values) and redeploy.

Until then, only users in the `admins` table see **Generate a contract** (Contracts page and the partnership drawer).

## How it stays inside the rules

- **The AI proposes terms only.** It reads the message (`lib/ai/agreements.ts`) and returns terms with the wording each came from, in the same shape as contract reading. Quotes are checked against the pasted text. It never writes contract language: the agreement text comes from the fixed template.
- **Money is the engine's.** The fee is parsed with `parseMoneyToCents` and printed with `formatCentsExact`. Generating or signing an agreement never creates invoices, payments or revenue.
- **Counts toward the hourly AI cap** (as `contract`). If the AI is unavailable or over the cap, the draft is still created for manual entry.
- **Screenshots are read once and not stored.** Pasted text is kept on the draft (`source_text`) for reference.
- **Nothing is sent by netbyfriday.** The creator copies the link or uses **Open in my email** (a `mailto:` link), like sendable invoices.

## Signing and the record

- **Creator signs first.** Sending requires every required term (name, brand, fee, payment terms, a deliverable), the creator's name typed exactly as in the agreement, and consent to sign electronically. Sending freezes the text (`body`), stores its SHA-256 fingerprint, creates an unguessable link token, and records the creator's signature, time and IP.
- **Frozen means frozen.** A database trigger (`agreements_guard`) blocks any change to a sent, signed or void agreement's text, terms or creator signature. It also blocks creating an agreement that isn't a draft, and blocks the app from marking one signed. Signer columns aren't granted to the app at all.
- **The brand signs only through `sign_agreement()`** (security definer). It checks that the link is open, that the fingerprint of the text the brand was shown matches the text on file, consent, name, a valid email and a typed signature. It then records name, title, email, time, IP and browser, and appends to the audit trail. An agreement can be signed once.
- **Audit trail:** draft created → creator agreed to e-sign and signed → link created → link first opened (IP, browser) → brand agreed and signed (IP, browser, fingerprint). It's shown on the signed copy, which prints to PDF from the browser (no PDF library).
- **Void:** the creator can void a sent (unsigned) agreement; the link stops working. Signed agreements can't be voided or deleted; they're kept as the record.

## Limits to know

- **Identity is the link plus the email the brand types.** netbyfriday doesn't verify the signer's identity or email (the link goes out from the creator's email, not ours). For high-value deals, a signing service with identity checks (Dropbox Sign, DocuSign) is stronger. Adding one is a new service, so it needs the founder's approval.
- **IP and browser** come from the request headers our server sees.
- US e-signature law (ESIGN Act, UETA) generally gives effect to electronic signatures when there is intent, consent to do business electronically, a signature tied to the record, and a kept record. This flow is built around those four points; it isn't legal advice.

## Database

Migration `20261110000001_agreements.sql`: the `agreements` table with RLS and column grants, the `agreements_guard` trigger, and `shared_agreement()`, `agreement_opened()` and `sign_agreement()` (executable by `anon`). `rls_isolation.test.sql` covers isolation, the draft-only insert, frozen text, no self-signing, no signer writes, the fingerprint check, consent, and single signing (plan 51).

## Tests

`lib/agreements/template.test.ts` (template, fallbacks, required terms, round trip, term mapping, validation) and `tests/e2e/agreements.spec.ts` (DM → draft → edit → sign and send → brand signs from the link without an account → can't sign twice → screenshot path). The AI stub reads `tests/e2e/fixtures/sample-deal-dm.txt`.
