# AI evaluations

Two checks run the real AI model and fail if it gets worse. Neither uses real creator data.

| Workflow | What it checks | When it runs | Bar |
|---|---|---|---|
| **Advisor evaluation** (`advisor-eval.yml`) | 20 Advisor questions on the demo workspace, through staging | By hand, after any Advisor prompt or model change | 0 wrong numbers marked Verified, ≥ 18/20 |
| **Contracts evaluation** (`contracts-eval.yml`) | Contract reading and the contract generator on 9 fictional messages and contracts (including red flags) | By hand, and automatically when the prompts or term-handling code change | 0 hard failures, ≥ 80% of soft checks |

## Contracts evaluation

Each case goes through the same prompt, parser (`parseExtraction`) and money engine as the app. Fixtures are fictional: `tests/eval/fixtures/` and two from `tests/e2e/fixtures/`.

**Hard rules** (any failure fails the run):
- **No wrong fee.** The fee is the agreed total, or left empty for the creator. It's never a monthly rate, a number from an unsettled negotiation, an injected amount, or digits glued together (the $30,003,000 bug).
- **Long email threads still produce deliverables.** This was the Honey Hair-style regression.
- **Removed deliverables stay out.** For example, a YouTube placement dropped from the package.
- **Instructions hidden in a message are ignored.**

**Soft checks** (≥ 80% must pass): brand, signer email, deliverable types and dates, splitting by month, warnings, and quotes found in the text.

### Setup (founder, once)

GitHub → the netbyfriday repository → Settings → Secrets and variables → Actions → New repository secret:
- `ANTHROPIC_API_KEY`: the same key as in Vercel (or a separate key with a spending limit).
- `AI_MODEL`: the same model name as `AI_MODEL` in Vercel.

Then go to Actions → Contracts evaluation → Run workflow. The results table appears in the run summary.

Each run makes 9 short AI calls. Without the secrets, automatic runs skip with a notice, and manual runs fail with a message saying what to add.

### Locally

`E2E_REAL_AI=1 ANTHROPIC_API_KEY=… AI_MODEL=… npm run eval:contracts` writes `test-results/contracts-eval.md`.
