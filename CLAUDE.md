# CLAUDE.md: NETBYFRIDAY 1.0 (creator business workspace)

You're building NETBYFRIDAY 1.0: a structured business workspace where creators enter their own partnerships, brands, contacts, deliverables, invoices, payments and tasks, and NETBYFRIDAY connects the records, calculates the money, and shows dashboards. The AI Advisor is a central feature. The plan is in `docs/MVP_PLAN.md` (v3); follow its milestones in order. Visual specs are in `design-reference/` (the README there lists exact tokens).

## Scope
- **Build:** invite-only auth and onboarding; the dashboards; record types with table, board and calendar views where the plan lists them (partnerships, deliverables, invoices, payments, brands, contacts, tasks, income, expenses); related-records panels; the AI Advisor (questions, overdue, upcoming responsibilities, drafts, suggested next actions); settings; the marketing site and waitlist; Stripe only when the paid beta starts.
- **Behind flags (don't delete):** Insights, Opportunities, Audience, attachments, prototype import, white-label branding. Flags: `NEXT_PUBLIC_NBF_FLAGS` and `lib/flags.ts`.
- **Don't build:** a Notion clone (no free-form pages, block editor or custom properties), Gmail or inbox scanning, calendar sync, social APIs, bank connections, Google Sign-In, outbound email, Resend, Inngest, PostHog, Sentry, multi-currency.
- **Stack only:** Next.js, TypeScript, Tailwind, Supabase (Auth + Postgres), Vercel, and one AI provider. Stripe is added at M5. Ask before adding any other dependency or service.

## Rules
- Reuse the existing code and components. Don't start over, and don't redesign. Match `design-reference/` and the tokens in `tailwind.config.ts` and `lib/brand.ts`.
- Money is integer cents. Revenue is cash basis: only recorded payments and direct income count. Fees, unpaid invoices and pipeline are never revenue.
- Every table has RLS. Derive `workspace_id` from the session, never from the client. Extend `supabase/tests/database/rls_isolation.test.sql` for each new table.
- Secrets go only in `.env.local` or Vercel environment variables. Only `NEXT_PUBLIC_*` values may reach the browser.
- **AI Advisor:**
  - It reads records server-side under RLS.
  - Numbers come from `lib/finance/core.js`, never from the model.
  - Every fact must pass `verifyReply` in `lib/ai/advisor.ts`.
  - It never sends anything and never changes financial records.
  - It may propose non-financial changes, which run only after the creator clicks Confirm, through the normal server actions.
  - Keep the per-user hourly cap.
- Never claim NETBYFRIDAY speeds up or guarantees payment. No fake testimonials or customer numbers. Prices come from `lib/billing/plans.ts` and are labeled "Illustrative".
- Never seed demo data into production.
- A feature is done when it persists to Supabase, is authorized, handles errors and empty states, and has a passing test.

## Working style
- Keep changes small. Run `npm run typecheck && npm test` after each meaningful change, and `npm run test:e2e` before finishing a milestone. The e2e suite uses `tests/e2e/ai-stub.mjs` unless `E2E_REAL_AI=1`.
- At the end of each milestone, commit, push, and report: what changed, migrations added, test results, and what you need from the founder.
- If something needs a credential you don't have, finish the code, write the setup step in `docs/`, and move on to independent work.

## Where things stand
Milestone 1 is complete except the staging deploy and a `npm run db:test` run on a machine with Docker; see `docs/MVP_PLAN.md` §2. Next is M2: workspace databases (contacts, tasks, `<RecordView>`).
