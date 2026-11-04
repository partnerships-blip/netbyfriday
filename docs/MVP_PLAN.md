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
- **`invoices.terms_days`**: an integer derived from NET terms, so due dates are set automatically and can be edited.
- Privacy rules on each new table using `is_workspace_member()`, plus new cases in `supabase/tests/database/rls_isolation.test.sql`.

Billing tables (`subscriptions`, `billing_events`) are added in M5, only when the paid beta starts. The waitlist table is added in M4.

---

## 6. Milestones

Each milestone ends with every test passing, a Vercel preview deploy, and a short report: what changed, migrations, test results, and what is needed from the founder.

### M1 — Build green + first end-to-end workflow ✅
Deployed to staging (https://netbyfriday-x566.vercel.app, Supabase project `npyxfczyoykonpomnsqt`) on November 4, 2026. The milestone e2e suite passed there with the real AI provider (GitHub Actions, "Staging end-to-end").
See §2.

### M2 — Workspace databases (5–7 days)
- Workspace migration (contacts, tasks, `terms_days`), with privacy-rule tests.
- `<RecordView>` with Table / Board / Calendar. Apply it to Partnerships (add Table), Deliverables (Table + Calendar), Invoices (add Calendar), Tasks (all three) and Brands & Contacts (Table).
- Related-records panel on partnership, brand, contact and invoice pages.
- Dashboard: Tasks due, Expected cash for the next 8 weeks. Revenue: Payment terms panel.
- Nav: Dashboard, Partnerships, Content (deliverables), Invoices & Revenue, Brands & Contacts, Tasks, AI Advisor, Settings.
- Swap the demo fixture for the Poca sample data (`design-reference/nbf-data.js`). It is read-only and never seeded into production.
- E2E: add a contact and a task, link them to the partnership, check that both appear on the partnership page and the dashboard.

### M3 — Advisor as the daily operator (4–5 days)
- Add contacts, tasks and per-brand history to the Advisor's context, with references.
- Add "What's on my plate this week?" and "Who should I follow up with?" as built-in prompts with deterministic data behind them.
- Drafts in the Advisor (pitch, follow-up, payment reminder), using the existing `/api/drafts`. Editable, with Copy and Open in email buttons. Never sent by NETBYFRIDAY.
- Proposed actions with explicit **Confirm** (create a task, update a deliverable status). Financial records are excluded.
- An **evaluation set**: 20 questions against the Poca fixture with expected numbers. Run it with the real model (`E2E_REAL_AI=1`) and record the verified-fact rate. Ship only when no wrong number is ever marked Verified.

### M4 — Public site + waitlist (4–5 days)
- `/`, `/pricing`, `/waitlist`, `/privacy`, `/terms`, rebuilt from `NETBYFRIDAY Website.dc.html`.
- Prices come from `lib/billing/plans.ts` and are labeled "Illustrative".
- The website's Advisor demo is a static, pre-written sample (no public AI endpoint).
- Waitlist with consent, duplicate handling and a honeypot field. Admin: one-click invite code per waitlist entry, sent by the founder from their own email.

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
