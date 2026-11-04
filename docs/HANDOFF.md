# Handoff: Creator Intelligence private beta

Status: **code complete for the private-beta scope, not yet verified in a running environment.** It is not production-ready. The app was written without access to Node, Supabase or a browser, so it has not been installed, built, type-checked or run. The checklist at the end lists what has to pass before any creator is invited.

---

## 1. Assessment of the prototype

**Kept:** all 8 screens, onboarding, demo mode, the partnership board and deliverables, invoices with partial payments, goals, opportunities, the scored insight feed, the AI Advisor and drafts, brand settings, and the visual system (warm neutrals, serif headlines, mono labels, accent through CSS variables).

**Problems found, and how this build fixes them**

| Prototype issue | Fix in this build |
|---|---|
| Three separate sources of revenue (monthly totals, deal fees, invoice payments), so one transaction could be counted twice or not at all | A single cash-basis ledger (§2). Deal fees and invoice amounts are never revenue. |
| Revenue stored by position relative to "today", so figures shifted when the month changed | Every receipt has a real date; months are derived from it. A test covers this. |
| Brand earnings counted "Content Submitted" deals | Brand revenue comes only from recorded payments |
| $0 payments allowed, minus signs stripped, overpayments silently capped | zod validation plus database checks and triggers reject all three (`PAYMENT_EXCEEDS_BALANCE`) |
| Invoices not linked to deals | `invoices.deal_id`, with a composite foreign key so the link must be in the same workspace |
| No editing or deleting of deals, invoices or expenses | Edit and delete for deals, deliverables, payments, income and expenses. Invoices can be voided only when no payment is recorded. |
| CSV import broke on commas | Proper CSV parser (handles quotes), with tests |
| Everything stored in one browser's localStorage | Postgres per workspace |
| No real accounts | Supabase Auth with invite-gated sign-up enforced in the database |
| Browser sent the full dataset to the AI; user-typed text went into the prompt unchanged | Server endpoint; records loaded through RLS; text cleaned and fenced as data; every factual claim checked against the records (§4) |
| Invoice printout inserted user text unescaped (code-injection risk) | Server-rendered with HTML escaping and a strict CSP that blocks all scripts |
| Logos embedded in localStorage | Private storage bucket; PNG/JPG/WebP only (no SVG) |

---

## 2. Revenue model (cash basis)

```
earned revenue = Σ payments (on invoices)  +  Σ income_entries (money received without an invoice)
```

* **Deal fee** = what was agreed. Shown as contracted or pipeline. Never revenue.
* **Invoice amount** = what is owed. Shown as outstanding or overdue. Never revenue.
* **Payment** = cash received against an invoice. Revenue on `received_on`.
* **Income entry** = cash received with no invoice (affiliate payout, tickets, product sales). The table has **no invoice column**, so invoiced money can only be recorded as a payment.
* A deal moved to **Paid** on the board does not create revenue. If no matching payment exists, the engine raises a "marked Paid but no payment recorded" insight.
* The database prevents payments that exceed the balance, payments on void invoices, voiding an invoice that has payments, and lowering an invoice amount below what has been paid.
* Re-running an import can't duplicate rows: `import_ref` is unique per workspace.

Separate figures shown in Money: revenue received, outstanding (not yet due), overdue, expected in the next 30 days (labeled as not guaranteed), contracted but not invoiced, pipeline (never revenue), expenses, estimated profit.

All calculations are in `lib/finance/core.js`. It is pure and deterministic, works in integer cents, and uses UTC calendar-date arithmetic, so there is no time-zone drift. The workspace's time zone decides what "today" is.

---

## 3. Security model

* **Authentication:** Supabase Auth with email and password and email confirmation. Sessions are http-only cookies refreshed in `middleware.ts`. The server always uses `getUser()`, which validates the token with Supabase rather than trusting the cookie.
* **Invite-only:** the `handle_new_user` trigger runs inside the `auth.users` insert. An invalid, expired or used-up code aborts the sign-up at the database level, even if someone calls the Supabase API directly.
* **Tenant isolation:** RLS is on for every table. Business tables allow access only when `is_workspace_member(workspace_id)`. The anon role has no table access. Child records use composite `(workspace_id, id)` foreign keys, so a row can't point at another workspace's invoice or deal even by guessing IDs. Column-level grants block changing `owner_id` and editing payment amounts.
* **Server-side authorization:** every server action and route re-derives the workspace from the session and validates input with zod. Client-supplied workspace IDs are never used.
* **Storage:** private buckets. Object paths start with the workspace ID and storage RLS checks membership. Files are downloaded through 60-second signed URLs. File types and sizes are allow-listed.
* **Admin:** `/admin` uses security-definer SQL functions that check `is_admin()`. They return only counts and feedback text; a submitter's email is included only if they ticked "may contact me". No earnings, contracts or records are exposed.
* **Analytics:** off by default. When on, only event names from a fixed list are stored. The insert policy rejects events from users who haven't opted in.
* **Headers:** HSTS, `X-Frame-Options: DENY`, nosniff, referrer policy, permissions policy.

## 4. AI Advisor safeguards

* `/api/advisor` requires a session and caps usage per user per hour (`AI_HOURLY_LIMIT`, counted in the database).
* Context is built on the server from the signed-in user's RLS-scoped records. Every record and metric gets a reference ID.
* All user-supplied text (notes, opportunity descriptions, imported data) is stripped of control characters, length-capped, and placed only inside a `<records>` block. The system prompt says that block is data and that instructions inside it must be ignored.
* The model must return JSON with `facts` (each citing record references), `forecasts`, `recommendations` and `missing`. `verifyReply()` then marks a fact **verified** only if:
  * every reference it cites exists, and
  * every dollar amount in it matches a cited record, or follows from a shown calculation whose inputs are cited.
  Unverified facts are shown struck through, with the reason. Dollar amounts in the summary answer that no verified fact backs up are flagged.
* Forecasts and suggestions are labeled separately, and drafts are never sent. Uploaded attachments are **not** given to the AI in this beta.

---

## 5. Test status

| Suite | What it covers | Status |
|---|---|---|
| `lib/finance/core.test.ts` (vitest) | Money parsing, calendar months, counting each transaction once, partial payments, voided invoices, overdue boundaries, pipeline vs. contracted, goals, insight gating, score totals | The same 30 assertions were **run and passed** against `core.js` in a plain-JavaScript harness. The vitest file itself has not been run. |
| `lib/ai/advisor.test.ts` | Reference integrity, prompt-injection fencing, rejecting unsupported amounts, accepting calculations, malformed output | Written, **not run** |
| `lib/csv.test.ts` | Quoted fields, stage mapping | Written, **not run** |
| `supabase/tests/database/rls_isolation.test.sql` (pgTAP) | Invite rejection; two-account isolation on select, insert and update; cross-tenant foreign-key block; overpayment, void and zero-amount guards; admin function refusal | Written, **not run** |
| `tests/e2e/journey.spec.ts` (Playwright) | The 11-step journey plus a second account seeing none of the first account's data, and anonymous API access being refused | Written, **not run** |

## 6. Completed features

* Invite-code sign-up, sign-in, sign-out, password reset; onboarding progress saved per step
* Onboarding: profile, priority, revenue goal, and import options (partnership, invoice, income, CSV, prototype import). Gmail is shown as coming later.
* Overview: 4 cards, 12-month chart filterable by source, daily briefing with a checklist saved per day, ranked insights with AI drafts, upcoming deliverables
* Partnerships: 9-stage drag-and-drop board, detail drawer with every brief field, deliverables (add, advance status, remove), relationship history from the ledger, 5 follow-up draft types, notes, attachments, edit and delete
* Money: separated totals, monthly and annual goals, invoices (create, link to a partnership, partial or full payments, remove a payment, void, printable PDF, reminder draft), direct income, expenses, revenue by source and by client, financial insights
* Intelligence: full feed with category filter and visible scoring
* Opportunities: suggested renewals from the engine, manual entries, save, mark pitched, dismiss and restore, pitch drafts
* Audience: dated manual snapshots per platform with growth, content categories compared with ledger revenue, demographics shown as insufficient data
* AI Advisor: server-side, checked replies, saved history, clear
* Settings: brand name, logo, accent and headline font; profile; goals; notification opt-ins; analytics opt-in; JSON export; read-only demo mode; prototype import
* In-app feedback and bug reporting; admin view with aggregates, onboarding drop-off, invite management and feedback triage

## 7. Known limitations

* **Not yet run anywhere** (see §5). Expect normal first-run fixes: type errors, a missing import, Next/Supabase version differences.
* No account deletion screen yet; deleting a user in the Supabase dashboard cascades to all their data.
* Email digest and push toggles save the preference only; nothing is delivered.
* The rate limiter is per user, not per IP. Supabase Auth's own limits cover sign-up and sign-in.
* Prototype import can only read the browser's saved data if the prototype ran at the same web address as the beta. Otherwise the user needs a JSON export file, and the prototype has no export button.
* Brand revenue is cash basis only; there is no accrual view.
* Invoice PDF is the browser's print-to-PDF, not a generated file.
* The Advisor's checks catch unsupported dollar amounts and invented record references. They don't catch every wrong non-numeric claim, such as a wrong date or name.
* No virus scanning on uploaded files.
* Partnership drag-and-drop is desktop only; mobile uses the stage dropdown.
* The demo is a fixed fictional dataset dated Oct 22, 2026, and can't be edited.
* The Supabase client is used untyped. Run `npm run db:types` and add the generated types for stricter checks.

## 8. Prepared for later (not implemented)

* **Gmail:** Google OAuth (read-only scope) via a server route that stores encrypted refresh tokens in a separate `integrations` table. Message content must pass through `clean()` and stay inside the records block, as it is untrusted.
* **Instagram, TikTok, YouTube:** write `audience_snapshots` rows from official APIs. The screen already reads snapshots.
* **Stripe:** subscriptions for this product, and payment links on invoices. A webhook should insert into `payments` (the overpayment guard still applies).
* **Opportunity sources:** add rows to `opportunities` with a verifiable `source`.

---

## 9. Beta-readiness checklist

Every item must pass on the **deployed** URL against the **production** Supabase project.

**Build and tests**
- [ ] `npm ci && npm run typecheck && npm run lint && npm run build` pass
- [ ] `npm test` passes
- [ ] `supabase test db` passes (run against a local copy of the production migrations)
- [ ] `npm run test:e2e` passes against a staging deployment

**Security**
- [ ] RLS is on for every public table: `select tablename from pg_tables where schemaname='public' and not rowsecurity;` returns nothing
- [ ] Manual isolation check: with account A's session token, use the REST API to read account B's `deals`, `invoices` and `payments` by ID → 0 rows
- [ ] Manual check: sign up through the Supabase Auth API directly with no or a wrong `invite_code` → rejected
- [ ] No secret in the client bundle: search `.next/static` for `sk-ant`, `service_role` and the AI key
- [ ] `seed.sql` invite codes are not in production
- [ ] Auth redirect URLs limited to the production domain; email confirmation on
- [ ] Storage buckets `attachments` and `logos` are private
- [ ] `/admin` returns 404 for a non-admin account

**Correctness**
- [ ] On a test account: add a deal ($5,000), invoice it, record $2,000 → revenue $2,000, outstanding $3,000, contracted not invoiced $0
- [ ] Record a second payment of $3,001 → rejected with the balance message
- [ ] Move the deal to Paid with nothing more paid → revenue unchanged, "marked Paid" insight appears
- [ ] Change the workspace time zone and confirm "today" and overdue status follow it

**Operations**
- [ ] Supabase backups (and point-in-time recovery if available) enabled
- [ ] Custom SMTP configured so confirmation emails arrive
- [ ] AI spend limit set at the provider
- [ ] A named person is watching `/admin` feedback during the beta
- [ ] Short privacy note for beta creators covering what's stored, who can see it, and how to export or delete it
