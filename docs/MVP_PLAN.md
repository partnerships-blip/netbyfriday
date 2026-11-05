# NETBYFRIDAY 1.0: Build Plan (v3, the creator business workspace)

Supersedes the Lean MVP Plan (v2, November 4, 2026). Same codebase, same design, new center of gravity.

**What NETBYFRIDAY 1.0 is:** a structured business workspace for creators. Creators enter and maintain their own records: brand partnerships, brands and contacts, deliverables, invoices, payment terms, payments and tasks. NETBYFRIDAY keeps those records connected, calculates the money correctly, and shows it on dashboards. The **AI Advisor** reads those saved records to answer questions, flag what is overdue or coming up, draft pitches and follow-ups, and suggest next actions.

**What it is not:** a Notion clone. There are no free-form pages, no block editor, no custom databases, and no user-defined properties. Each record type has a fixed, well-designed schema. "Database" means a fixed record type the creator can see as a table, a board or a calendar, with links to related records.

---

## 1. What changed from v2

| Topic | v2 plan | v3 (this plan) |
|---|---|---|
| AI Advisor | Hidden behind a flag | **Central feature.** In the main navigation and the header ("Ask AI"); the first milestone ends by asking it a question |
| Product shape | Screens | Interconnected record types ("databases") with table, board and calendar views where useful |
| Reminders | Daily email digest via Resend and Vercel Cron | In-app only for V1 (notification bell, daily briefing, dashboard). No email service. |
| Third-party services | Next.js, Supabase, Vercel, Stripe, Resend, one AI provider | **Next.js, Supabase, Vercel, one AI provider.** Stripe is added only when the paid beta needs it. |
| Gmail, social APIs, bank connections | Not built | Not built, and removed from onboarding |
| White-label branding (per-workspace accent, logo, product name) | Present | Hidden behind a flag. NETBYFRIDAY has one brand. |

---

## 2. Status after this pass (Milestone 1)

**Done and verified in a running environment**

- **Build is green.** `npm run typecheck`, `npm run lint`, `npm run build` and `npm test` (30 unit tests) all pass. Fixes made:
  - Typed the finance engine's insight context.
  - Made the server-action result helper return non-null values.
  - Typed the Supabase cookie handlers.
  - Upgraded Next.js 14.2.15 → **14.2.35**, because 14.2.15 has a published security advisory.
  - Added an ESLint config.
  - Self-hosted the fonts so the build no longer downloads them from Google at build time.
- **NETBYFRIDAY look applied to the app.** Plum, ivory, chartreuse and lavender tokens; Plus Jakarta Sans; the `netbyfriday` wordmark and app icon built from type. The existing layouts, components and copy are unchanged.
- **Navigation is now Dashboard, Partnerships, Invoices & Revenue, AI Advisor, Settings.** Insights, Opportunities, Audience, attachments, prototype import and white-label settings are behind flags (`NEXT_PUBLIC_NBF_FLAGS`). Their code stays, their routes return 404, and dashboard insights no longer link to them. The Gmail card was removed from onboarding.
- **Database migrations apply cleanly** on Postgres with Supabase Auth. The anonymous role is refused access to business tables.
- **The milestone journey passes end to end** (Playwright, `npm run test:e2e`):
  1. Sign up with an invite code. An invalid code is rejected.
  2. Onboard.
  3. Add a brand partnership with a deliverable.
  4. Create a $5,000 invoice.
  5. Record a $2,000 partial payment.
  6. The dashboard shows **$2,000 received this month**, **$3,000 outstanding** and 1 active partnership, plus goal progress.
  7. Ask the AI Advisor "How much have I been paid, and what is still owed?" The answer cites the records. Each fact backed by those records shows **Verified**; a planted unsupported "$999,999" claim shows **Not verified**. The conversation is saved to the workspace.
  8. Sign out and back in; the data is still there.
  9. A second creator sees none of the first creator's records, through the UI or the export API. An unauthenticated Advisor request returns 401.
- **Local dev setup:** `supabase/config.toml` (email confirmation off locally, 10-character minimum password), `.env.example`, `.gitignore`.

**How the Advisor was tested.** There is no AI key in the build environment, so the e2e suite points the Anthropic adapter at a local stub (`tests/e2e/ai-stub.mjs`, through the new optional `ANTHROPIC_BASE_URL`). The stub answers in the exact JSON format the real model must use. This tests NETBYFRIDAY's own pipeline:
- loading records through the database privacy rules (RLS)
- building the context
- checking each claim against the records
- rendering the answer
- saving the conversation

It does not test the quality of the real model's answers. Run `E2E_REAL_AI=1 npm run test:e2e` with a real key to check the live model; this is part of M3.

**Staging (done November 4):** GitHub Actions applies migrations to staging on every push that touches `supabase/` ("Staging database"). The live e2e suite runs from "Staging end-to-end" (manual, with the site URL). It passed 3/3 with the real AI provider.

**Still open for Milestone 1:** Run `npm run db:test` (pgTAP privacy-rule tests) with `supabase start` on a machine with Docker. The build environment here could not pull Supabase's Docker images, so these tests have not been run yet. Tenant isolation was verified through the app and the e2e test instead.

---

## 3. V1 scope

### The record types ("databases") and how they connect

```
Brand ──< Contact
  │
  └──< Partnership (deal) ──< Deliverable
            │      └──< Task
            └──< Invoice ──< Payment
Income entry (money received without an invoice)   Expense   Task (standalone or linked)
```

| Record type | Exists? | Views in V1 | Notes |
|---|---|---|---|
| Partnerships | Yes | **Board** (by stage, drag-and-drop, done) + **Table** | Stages: Lead → Pitching → Negotiating → Contracted → In Progress → Completed → Paid, plus Lost |
| Deliverables | Yes (inside a partnership) | **Table** + **Calendar** (by due date) | Status: not started → posted |
| Invoices | Yes | **Table** with Open / Overdue / Paid tabs (done) + **Calendar** (by due date) | NET terms set the due date automatically |
| Payments | Yes | Table (inside each invoice and on Revenue) | Cash basis: the only source of invoice revenue |
| Brands | Yes (table; no screen yet) | **Table** with history per brand | Totals come from the ledger |
| Contacts | **New** | **Table** | Linked to a brand and optionally to partnerships |
| Tasks | **New** | **Table** + **Board** (open/done) + **Calendar** | Can link to a partnership, contact or invoice |
| Income entries, expenses | Yes | Table (Revenue screen) | |

**Every record page shows its related records** (a partnership shows its brand, contact, deliverables, invoices, payments and tasks), so creators can move between them like linked databases.

**One shared component powers the views.** A `<RecordView>` takes a fixed column definition and offers Table / Board / Calendar. It supports sort, filter and search, and remembers the creator's last view per record type in the browser. It is built once and reused for every record type. No drag-to-resize columns, no formula columns, no custom properties.

### Dashboards (existing designs, kept)
- **Dashboard:** revenue this month, outstanding, active partnerships, pipeline; the 12-month chart; daily briefing; "Your business today" (ranked, rule-based insights); upcoming deliverables. Add **Tasks due** and **Expected cash, next 8 weeks**.
- **Invoices & Revenue:** stat tiles, goals, invoice table, payment history. Add a **Payment terms panel** (open balance and average days to pay, per NET term).

### AI Advisor (central)
- **Reads** the creator's records on the server through the database privacy rules, as the signed-in user. Nothing is taken from the browser as data. Record text is treated as data, never as instructions.
- **Calculations are deterministic.** Totals, overdue status, balances and goal progress come from `lib/finance/core.js` and reach the model as labeled metrics with record references. The model may only restate them or show arithmetic over cited amounts.
- **Verification.** Every factual statement must cite records. Any dollar amount not backed by the cited records is marked **Not verified**. Forecasts and suggestions are labeled separately from facts.
- **Jobs in V1:** answer business questions; list overdue invoices; summarize upcoming responsibilities (deliverables, tasks, invoices due); draft brand pitches, follow-ups and payment reminders; suggest next actions.
- **Approval rule.** The Advisor has no write access. Drafts are editable text the creator copies or opens in their own email app (`mailto:`); NETBYFRIDAY sends nothing. In M3 the Advisor can **propose** non-financial changes (create a task, update a deliverable status) as cards. The change happens only when the creator clicks **Confirm**, through the same server actions the UI uses. Financial records (invoices, payments, income, expenses) are never changed by the Advisor, even with approval; the creator edits those directly.
- **Limits.** 40 requests per user per hour, counted in the database. A spend cap is set in the AI provider's console.
- **Scale.** V1 sends the whole workspace's structured records (fine for beta-sized workspaces). Once a workspace passes about 500 records, switch to question-scoped retrieval: filter by brand, date range and record type before building the context. Same verification step; no vector database needed.

### Not in V1
Gmail or inbox scanning, Google Calendar, Instagram, TikTok and YouTube APIs, bank connections, Google Sign-In, outbound email (reminders, digests, sending drafts), Resend, Inngest, PostHog, Sentry (Vercel logs are enough), multi-currency, team seats, custom fields, free-form pages, white-labeling.

### Kept for later, without a rewrite
- `workspace_id` on every table, with privacy rules, plus `workspace_members` for future team seats.
- The AI provider adapter.
- The flagged screens.
- A `connected_accounts` table and adapter are added only when the first integration is approved.

---

## 4. Stack and monthly cost

| Service | Use | Est. monthly |
|---|---|---|
| Vercel | Hosting. The free Hobby tier is for non-commercial use; move to Pro before paying creators arrive. | $0 → $20 |
| Supabase | Auth + Postgres. Free for development; Pro before real creator data, for daily backups and no pausing. | $0 → $25 |
| AI provider (one) | Advisor + drafts, with a provider spend cap | $5–$40 |
| Stripe | Only when the paid beta starts. No monthly fee; per-transaction and Billing fees. | % of revenue |
| Domain | | ~$1 |
| **Total** | | **~$5 during development, ~$50–$85 at beta** |

**Auth email:** Supabase's built-in email sender is rate-limited and meant for testing. Before inviting creators, connect a custom SMTP sender in Supabase's Auth settings. This is a setting, not a code integration; any SMTP provider works. Check current prices on each provider's pricing page before upgrading.

---

## 5. Schema changes

Keep the five existing migrations. Add **one** migration in M2, `20261105000001_workspace.sql`:
- **`contacts`**: `id`, `workspace_id`, `brand_id` (nullable), `name`, `email`, `role`, `phone`, `notes`, `last_contacted_on`, `follow_up_on`, `created_at`. Partnerships get an optional `contact_id`; the existing `contact_name` and `contact_email` stay as a fallback and are moved into `contacts` by the migration.
- **`tasks`**: `id`, `workspace_id`, `title`, `notes`, `due_on`, `status` (open/done), `priority` (low/normal/high), `deal_id`, `contact_id`, `invoice_id` (all nullable), `completed_at`, `created_at`.
- ~~`invoices.terms_days`~~ Not needed: the invoice form reads the existing `terms` text (`termsDays()` in `lib/finance/core.js`) and fills the due date, which stays editable.
- `analytics_events`: allow the `contact_created` and `task_created` event names.
- Privacy rules on each new table using `is_workspace_member()`, plus new cases in `supabase/tests/database/rls_isolation.test.sql`.

Billing tables (`subscriptions`, `billing_events`) are added in M5, only when the paid beta starts. The waitlist table is added in M4.

---

## 6. Milestones

Each milestone ends with every test passing, a Vercel preview deploy, and a short report: what changed, migrations, test results, and what is needed from the founder.

### M1 — Build green + first end-to-end workflow ✅
Deployed to staging (https://netbyfriday-x566.vercel.app, Supabase project `npyxfczyoykonpomnsqt`) on November 4, 2026. The milestone e2e suite passed there with the real AI provider (GitHub Actions, "Staging end-to-end").
See §2.

### M2 — Workspace databases ✅ (November 4, 2026)
- Migration `20261105000001_workspace.sql`: `contacts`, `tasks`, `deals.contact_id`, backfill of existing free-text contacts into contact records (case-insensitive by email, else name), RLS, and 5 new pgTAP cases (23 total). CI now runs `supabase test db` on GitHub's runners.
- `components/RecordView.tsx`: Table / Board / Calendar, filter chips with counts, search, sortable columns. Remembers the last view, filter and sort per record type in the browser.
- Applied to Partnerships (existing drag-and-drop board + new Table), Content (deliverables: Table + Calendar), Invoices (new Calendar tab), Tasks (Table + Board + Calendar) and Brands & Contacts (Tables).
- Related records:
  - The partnership drawer gains a linked Contact and Tasks.
  - A contact shows its partnerships and tasks.
  - A brand shows its contacts, partnerships, invoices, received and unpaid.
  - Tasks link to partnerships, contacts and invoices.
- Dashboard: Tasks card and Expected cash, next 8 weeks. Invoices & Revenue: the 8-week chart and the Payment terms panel (open, overdue, average days to pay). Invoice due dates are filled from NET terms.
- Engine: `termsDays`, task counts, 8-week buckets and terms statistics, with 4 new unit tests (34 total). The export includes contacts and tasks.
- Fixed: "Received" on a brand and in the partnership drawer now counts payments on invoices billed to that brand by name, not only invoices linked to a partnership. It matches the payment history shown beside it.
- E2E: add a contact; link it from the Table view; add a task from the partnership; check the task appears in the Tasks table, calendar and board, on the contact, and on the dashboard; check the deliverable appears on Content; check the invoice calendar and terms panel; check another creator's export has no contacts or tasks.
- **Moved to M3:** the demo fixture, so it is built together with the Advisor evaluation set that uses it.

### M3 — Advisor as the daily operator ✅ (November 4, 2026)
- **Demo workspace:** "Jordan Lee" (fictional; the founder's name appears only on /about), built from `design-reference/nbf-data.js` (`lib/demo/fixture.ts`), with contacts and tasks. Read-only and never written to the database. A unit test checks it is internally consistent.
- **Engine:**
  - `agenda` (this week): tasks, deliverables and invoices due in the next 7 days, plus anything overdue.
  - `followUps`: overdue invoices, unanswered inquiries, unanswered pitches, quiet negotiations, and contacts with follow-up dates.
  - Both are deterministic and each item cites a record.
- **Advisor context:** contacts, open tasks, per-brand history (received and unpaid, on the same basis as the Brands screen), `thisWeek` and `followUps`, all with record references.
- **Built-in prompts:** "What's on my plate this week?" and "Who should I follow up with?".
- **Drafts:** at most 2 per answer, for a payment follow-up, contract request, pitch follow-up, reconnect note or new campaign.
  - Each must point at a real partnership, invoice or contact.
  - They open in the existing draft editor (edit, Copy, open in your own email app).
  - The recipient address comes from the creator's records, never from the model. Nothing is sent.
- **Proposed changes:** only `create_task` and `set_deliverable_status`, at most 3 per answer.
  - They must use real record references and valid values. They run through the normal server actions only after **Confirm**.
  - Answers reloaded from history show "Suggested earlier" with no Confirm button, so nothing can be applied twice.
  - Invoices, payments, income, expenses, fees and stages can never be changed this way; the verifier drops any such proposal.
- **Reliability:** the provider reports why an answer stopped. The output cap was raised to 3,000 tokens. An answer cut off at the cap is reported as "ran too long" instead of a generic error.
- **Evaluation:** 20 questions on the demo workspace (`tests/eval`, "Advisor evaluation" workflow), with expected numbers calculated by the engine.
  - Hard rules: no wrong number marked Verified, no unreadable answers, no disallowed actions.
  - Staging, real model:
    - first run: 17/20 (3 answers cut off by the length cap)
    - after the fix: **20/20**, 0 wrong-verified, 97% of facts verified
  - Model output varies, so rerun the evaluation after any prompt or model change.
- **Tests:** 40 unit tests; the end-to-end suite now covers Confirm and the draft editor.

### M4 — Public site + waitlist ✅ (November 4, 2026; domain pending)
- **Public pages:**
  - `/` is rebuilt from `NETBYFRIDAY Website.dc.html`: hero with a working product preview, terms ticker, problem cards, six feature cards with live mini-interfaces, How it works, interactive NET45 timeline, business intelligence, Advisor sample, pricing, FAQ, final call to action and footer.
  - Also `/pricing`, `/waitlist`, `/privacy` and `/terms`.
  - Signed-in visitors see "Open your workspace" in the nav.
- **No hand-typed figures.** Every number on the site comes from `lib/marketing/sample.ts`, which runs the real engine on the fictional demo data. The Advisor section shows pre-written sample answers built the same way; there is no public AI endpoint.
- **Plans** come from `lib/billing/plans.ts` and are always shown with "Illustrative plans · pricing is not final". Every call to action goes to the waitlist.
- **Privacy and terms** are plain-language drafts that describe what the beta actually does. They are clearly marked for legal review, with bracketed items to confirm.
- **Migration `20261106000001_waitlist.sql`:**
  - The `waitlist` table, with no direct access for anyone.
  - `join_waitlist()` (consent required, duplicates matched case-insensitively), and the admin-only `admin_waitlist()` and `admin_invite_waitlist()` (single-use code, 30 days).
  - 9 pgTAP cases in `supabase/tests/database/waitlist.test.sql`.
- **Waitlist form:** server validation, honeypot field and a minimum fill time.
- **Admin → Waitlist:**
  - "Invite" creates the code and opens a ready-to-send invite email in the founder's own email app; netbyfriday sends nothing.
  - The sign-up page links to the waitlist.
- **E2E (`tests/e2e/site.spec.ts`):**
  - The home page's figures match the engine; hero tabs, the NET45 timeline and the Advisor sample work; the pricing label is present.
  - Waitlist join and duplicate handling.
  - Locally: the admin invite flow, checking the code works exactly once.
- **Founder story:** `/about` ("Our story") in Poca's own words, kept verbatim in `content/founder-story.ts`. The home page shows an excerpt and pull quote.
- **Contact address:** hello@netbyfriday.com (`NEXT_PUBLIC_CONTACT_EMAIL` overrides it).
- **Domain:** netbyfriday.com connected by the founder (GoDaddy DNS → Vercel, `docs/DOMAIN_SETUP.md`).

### M5 — Paid beta billing (3–4 days, only when the paid beta starts)
- Stripe Checkout, Customer Portal, and one webhook (signature-verified, idempotent).
- A `subscriptions` table controls plan limits. Early beta creators are comped.

### M6 — Beta launch (2–3 days)
- Supabase Pro on production, backups confirmed, custom SMTP for auth email, domain.
- Readiness checklist (`docs/HANDOFF.md` §9). Invite the first 10 creators.

**Total:** about 4–5 weeks after M1, or about 3.5 weeks if billing waits until after launch.

---

## 7. Credentials needed, in order

1. **M1 (done):** GitHub repo, Supabase staging project, Vercel project, AI key with spend cap.
2. **M4:** DNS access for the domain.
3. **M5:** Stripe account (test keys first; live keys after business verification).
4. **M6:** Supabase production project; an SMTP sender for auth email.

---

## 8. Decisions recorded
- **Revenue is cash basis.** Only recorded payments and direct income entries count. Fees, unpaid invoices and pipeline are shown separately and never added to revenue.
- **The AI never changes financial records and never sends anything.** It can propose non-financial changes, which happen only on explicit confirmation.
- **One AI provider**, behind the adapter (`AI_PROVIDER`, default Anthropic).
- **Sign-up is invite-only** until the beta passes the readiness checklist.
- **Fixed schemas, no custom properties.** New fields are added deliberately in migrations.
- **Flags, not deletions,** for features outside V1.

## 9. Open questions for the founder
1. Keep **expenses** in V1? They power "profit, last 12 months". The recommendation is to keep them; they cost nothing extra.
2. Partnership stages: keep the current 7 + Lost, or adopt the longer list in `design-reference/README.md` (Pitch Sent, Contract, Submitted, Approved, Invoiced…)? The recommendation is to keep 7 for V1.
3. When does the paid beta start? That decides whether M5 comes before or after M6.

## 10. Running it locally
```bash
npm install
cp .env.example .env.local    # fill in values from `supabase start`, plus the AI key
supabase start && supabase db reset
npm run dev                   # http://localhost:3000/signup, invite code LOCAL-DEV-01
npm run typecheck && npm run lint && npm test && npm run build
npm run test:e2e              # starts the AI stub and the dev server itself
npm run db:test               # pgTAP privacy-rule tests
```
