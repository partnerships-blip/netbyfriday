# How to open NETBYFRIDAY in Claude Code

The design tool where this code was written can't run it. Claude Code can: it works inside your project folder on your computer, installs packages, runs the app and the tests, and fixes errors.

## One-time setup (about 30 minutes)

1. **Install the tools**
   - Node.js 20 or newer: nodejs.org → "LTS".
   - Git: git-scm.com.
   - Docker Desktop: docker.com. Open it once and leave it running; the local database needs it.
   - Supabase CLI: on Mac, `brew install supabase/tap/supabase`; on Windows, follow supabase.com/docs/guides/cli.
   - Claude Code: follow the install instructions at docs.claude.com (Claude Code → Quickstart). It needs a Claude Pro or Max plan, or an Anthropic API account.
2. **Put the code in its own folder.** Unzip the downloaded `netbyfriday` package. The folder that contains `package.json` and `CLAUDE.md` is the project root.
3. **Create a private GitHub repo** named `netbyfriday`, with no README. In a terminal inside the project folder:
   ```
   git init
   git add .
   git commit -m "NETBYFRIDAY starting point"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/netbyfriday.git
   git push -u origin main
   ```
4. **Start Claude Code.** In the same terminal, type `claude`.

## The first message to send Claude Code

```
Read CLAUDE.md and docs/MVP_PLAN.md. Then start Milestone 1:
install dependencies, fix every typecheck, lint and build error,
start local Supabase, reset the database, and get npm test,
npm run db:test and npm run test:e2e passing. Report what you
changed and anything you need from me.
```

Claude Code will ask permission before running commands. Read each one and approve it.

## What Claude Code will ask you for

- **During Milestone 1:** an Anthropic or OpenAI key, but only if you want the AI drafting test to run. Put it in `.env.local`, never in chat.
- **Before deploying:** create a Supabase project at supabase.com, then a Vercel account linked to your GitHub. Claude Code will tell you which values to paste into Vercel's Environment Variables screen.

## Rules
- Never paste secret keys into the chat. Put them in `.env.local` (local) or Vercel → Settings → Environment Variables (deployed).
- Never commit `.env.local`. The `.gitignore` already blocks it.
- Don't run `supabase/seed.sql` on the production database. It creates test invite codes.
- When Claude Code finishes a milestone, ask it to commit and push. Each milestone then becomes a restore point.
