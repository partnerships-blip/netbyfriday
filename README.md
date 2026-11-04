# netbyfriday · Private beta (lean MVP)

**Start with [docs/OPEN_IN_CLAUDE_CODE.md](docs/OPEN_IN_CLAUDE_CODE.md), [CLAUDE.md](CLAUDE.md) and [docs/MVP_PLAN.md](docs/MVP_PLAN.md).** Visual references are in `design-reference/`.

Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (Auth, Postgres with row-level security, Storage) · server-side AI (Anthropic by default, configurable).

For the technical assessment, the revenue model, test status, known limitations and the beta-readiness checklist, see **[docs/HANDOFF.md](docs/HANDOFF.md)**.

## Project structure

```
app/
  (auth)/            login, signup (invite code), password reset, auth server actions
  auth/              OAuth/email callback, sign-out
  onboarding/        steps 2–4 (profile, goals, import)
  (app)/             signed-in app: layout (shell) + 8 screens + admin
    actions.ts       every mutation (zod-validated, RLS-scoped)
    import-actions.ts  one-time import from the browser prototype
  api/               advisor, drafts, invoice print, attachments, logo, export
components/          UI primitives, modals, shell, insight list, chart
lib/
  finance/core.js    deterministic calculations (cash-basis ledger, insights, notifications) + tests
  ai/                provider abstraction, advisor context + claim verification + tests
  data/load.ts       loads a workspace through RLS and computes metrics once per request
  demo/fixture.ts    read-only fictional demo workspace
  validation.ts      zod schemas for every input
supabase/
  migrations/        schema, beta access, RLS, storage, column grants
  tests/database/    pgTAP tests: invite gating, tenant isolation, payment guards
  seed.sql           local-only invite codes
tests/e2e/           Playwright: 11-step journey + two-account isolation
```

## Local setup

Prerequisites: Node 20+, Docker, [Supabase CLI](https://supabase.com/docs/guides/cli).

```bash
npm install
supabase init              # creates supabase/config.toml; keeps the existing migrations folder
supabase start             # prints the local API URL, anon key and service role key
cp .env.example .env.local # paste the URL and anon key; add your AI key
supabase db reset          # applies migrations + seed.sql (invite codes LOCAL-DEV-01, E2E-TEST-01)
npm run dev
```

Open http://localhost:3000/signup and use invite code `LOCAL-DEV-01`. Local email confirmations appear in Inbucket (http://localhost:54324) unless you disable them in `supabase/config.toml` (`[auth.email] enable_confirmations = false`).

Make yourself an admin (local SQL editor at http://localhost:54323):

```sql
insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
```

## Tests

```bash
npm test            # vitest: finance calculations, CSV parsing, advisor claim verification
npm run db:test     # pgTAP: invite gating, cross-tenant isolation, payment guards (needs `supabase start`)
npm run test:e2e    # Playwright: full journey + two-account isolation (needs dev server + local Supabase)
npm run typecheck
```

## Deployment

1. **Supabase project**: create one at supabase.com. Then `supabase link --project-ref <ref>` and `supabase db push` to apply migrations. **Do not run `seed.sql` in production.**
2. **Auth settings**: set Site URL and redirect URLs to your domain (`https://<domain>/auth/callback`). Keep email confirmation on. Set a minimum password length of 10. Turn on leaked-password protection if your plan includes it.
3. **Invites**: create the first admin with the SQL above, then create invite codes from `/admin`.
4. **Vercel** (or any Node host): import the repo and set the environment variables from `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` is not needed by the app today; don't add it unless a server-only script requires it.
5. **AI**: set `AI_PROVIDER`, `ANTHROPIC_API_KEY` (or the OpenAI-compatible pair), and `AI_MODEL`. Keys are read only on the server.
6. Run the beta-readiness checklist in `docs/HANDOFF.md` against the deployed URL before inviting anyone.

## Required credentials

| Credential | Where | Required |
|---|---|---|
| Supabase URL + anon key | Supabase → Project Settings → API | Yes |
| AI provider key + model name | Anthropic Console (or compatible provider) | Yes, for the Advisor and drafts |
| Supabase service role key | Supabase → API | No (reserved for admin scripts) |
| SMTP provider | Supabase → Auth → SMTP | Recommended for production email deliverability |
| Google, Meta, TikTok, Stripe | — | Not used yet |
