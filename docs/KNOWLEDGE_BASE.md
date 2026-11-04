# NETBYFRIDAY Knowledge Base

What exists, how it works, where it lives, and what's left. Last updated November 3, 2026.

---

## 1. The product in one paragraph

netbyfriday is a business platform for independent creators. It keeps brand deals, deliverables, invoices, payments and revenue goals in one place, then calculates what needs attention: overdue invoices, deadlines this week, past brands worth pitching again, progress toward a goal. An AI Advisor answers questions using the creator's own records and shows the figures it used. The target user earns roughly $10k–$150k a year from brand deals, affiliate income, digital products and appearances, usually without a manager or accountant.

**Tagline:** The business behind being booked.
**Supporting line:** The intelligence behind your influence.
**Core message:** Run your creator business like a business.

**The name:** brand deals typically pay NET30, NET45 or NET60, so creators post content and then wait weeks to be paid. The name also plays on net income and a creator's network.

**Rule that applies everywhere:** netbyfriday tracks payments. It does not speed them up or control when brands pay, and no copy may suggest otherwise.

---

## 2. What has been built

There are three separate pieces. Only the third is a real application.

| Piece | File(s) | What it is | Status |
|---|---|---|---|
| Marketing website | `NETBYFRIDAY Website.dc.html` | Full marketing site with interactive product previews | Finished design prototype. Runs only in this design environment. |
| Dashboard demo | `NETBYFRIDAY Dashboard.dc.html` + `nbf-data.js`, `nbf-compute.js`, `nbf-actions.js` | Clickable product with fictional sample data | Finished prototype. Saves to the browser only. No accounts. |
| Real app codebase | `beta/` folder | Next.js + Supabase app with accounts, database, privacy rules, server-side AI | Code written, **never installed or run**. Rebrand to NETBYFRIDAY is partly done (see §7). |

Older files from the earlier "Creator Intelligence" working title (`Creator Intelligence.dc.html`, `ci-data.js`, `ci-compute.js`, `ci-actions.js`) are kept for reference. The NETBYFRIDAY files were built from them.

---

## 3. Brand system

### Colors
| Name | Hex | Use |
|---|---|---|
| Deep Plum | `#32152F` | Text, buttons, navigation, dark sections |
| Warm Ivory | `#FAF7F3` | Main background |
| Electric Chartreuse | `#DFFF43` | Signature accent: highlights, active states, key details. Use sparingly. |
| Soft Lavender | `#EAE5F7` | Secondary sections, dashboard surfaces |
| Muted Plum | `#6C4B67` | Secondary text and supporting UI |
| White | `#FFFFFF` | Cards and panels |

Supporting tints used in the build: pale chartreuse `#F3FFC4` (NET-term pills), soft line `#ECE4EA`, error red `#A8402B`, success green `#E3EEE5`.

**Color rules**
- Text on chartreuse is always plum.
- Never put chartreuse text on white or ivory; it fails contrast. Chartreuse text only appears on plum.
- Chartreuse is for one or two focal points per view, not large areas of body content.

### Typography
- **Plus Jakarta Sans** (Google Fonts), weights 400–800.
- Headlines: 800 weight, tight letter-spacing (about −0.045em), very large on the website (up to 92px).
- Highlight phrases ("like a business.", "The invoice is still pending.") are set in italic with a chartreuse treatment.
- The dashboard uses Geist Mono for small uppercase labels.

### Wordmark and icon
- **Wordmark:** lowercase `netbyfriday`, 800 weight, tight spacing, with a chartreuse underline bar under the right portion of the word (roughly "friday").
- **App icon:** plum rounded square, ivory lowercase "n", short chartreuse underline beneath it. An inverted version (ivory square, plum "n") is used on dark backgrounds.
- Both are built from type and simple shapes, not image files, so they stay sharp at any size and work in one color.

### Voice
Confident, witty, culturally aware, plain-spoken. Uses creator-native details (NET terms, "Can we see a draft by EOD?", rates in a notes app) instead of influencer clichés. No emoji, no fake testimonials, no stock photos, no real brand logos.

---

## 4. Marketing website (`NETBYFRIDAY Website.dc.html`)

### Sections, top to bottom
1. **Sticky navigation:** wordmark; Product, Solutions, Pricing, Resources (anchor links); Log In; Get Started (chartreuse). Below 860px it collapses into a Menu button that opens a full-width panel.
2. **Hero:** eyebrow "The creator business platform", the headline with "like a business." highlighted, supporting copy, **Get Started Free** and **Explore the Platform** buttons, and three proof points (manage brand deals, track every invoice, grow with clarity). On the right is a live dashboard preview with four working tabs:
   - **Home:** total earnings, pending NET amount, active deals, October total, deal pipeline chips, upcoming payments, cash-flow bars.
   - **Deals:** open partnerships with fee and stage.
   - **Money:** outstanding total and NET30/45/60 breakdown.
   - **Insights:** the top three calculated insights with evidence labels.
   The preview is tilted in 3D on desktop and labeled "Sample data".
3. **Payment-terms ticker:** a scrolling plum band (NET30, Deposit on signing, NET45…). It stops when the visitor has reduced motion turned on.
4. **The problem:** "You're the talent. The accountant. The negotiator. The entire team." Four role cards (talent, negotiator, accountant, project manager), each with realistic pain points.
5. **Features:** "Everything behind the content. Finally together." Six cards, each with its own mini interface instead of an icon: Partnerships (pipeline value bars), Money (outstanding by NET term), Campaigns (deliverable checklist), Opportunities (a suggested reconnect), Intelligence (repeat-client rate and client mix), AI Advisor (sample exchange).
6. **NET45 section:** "The content went live. The invoice is still pending." An interactive timeline: Pitch → Contract → Create → Post → Invoice → NET45, with the long wait after Invoice shown as a dashed span. Clicking a step shows what happens at that stage and what netbyfriday tracks there. It advances on its own until the visitor clicks a step. It ends with the line that netbyfriday doesn't decide when brands pay.
7. **Business intelligence:** "Your influence generates data. We help you use it." A 12-month revenue chart (hover shows each month's value), four metric tiles (repeat clients, payment status, average deal value, expected cash in 8 weeks labeled "Projection"), and the top insights with Verified, Estimate or Suggestion labels.
8. **AI Advisor:** "Business advice that actually knows your business." Four suggested questions plus a free-text box. Answers come from a **live AI model** reading the fictional sample data, formatted as a direct answer, "From the records" with figures, and "Suggested next step". Labeled "Live AI · reading fictional sample data" and "Demo".
9. **Pricing:** Starter (Free), Pro ($29/month, recommended), Studio ($59/month), marked "Illustrative plans · pricing is not final".
10. **Final call to action:** "Your influence is the business. Start treating it like one."
11. **Footer:** product, company, resources, legal and social links, plus the disclaimers that previews use fictional data and netbyfriday is not a payment service.

### Where the buttons go (current prototype)
- **Get Started / Get Started Free / pricing buttons** → Dashboard demo (starts onboarding).
- **Log In / Explore the Platform / Explore the demo** → Dashboard demo opened directly in demo mode (`?demo=1`).

### Behavior details
- Every figure on the site is calculated by the same engine the dashboard uses (`nbf-compute.js`) from the sample data, so the site and dashboard always agree.
- Sections fade up as they scroll into view. All motion is off when the visitor prefers reduced motion.
- Responsive: the hero stacks below 1120px wide; most two-column sections stack below 860px; the NET45 timeline becomes a vertical list on phones.
- Tweakable settings: **Hero style** (Tilted or Flat preview) and **Autoplay timeline** (on/off).

---

## 5. Dashboard demo (`NETBYFRIDAY Dashboard.dc.html`)

A rebranded version of the original Creator Intelligence prototype, with NETBYFRIDAY colors, typeface, wordmark and icon. Chartreuse is the default accent.

### Screens (sidebar order)
1. **Overview:** greeting, five cards (Total revenue, Outstanding payments, Active partnerships, This month, Revenue goal), 12-month revenue chart filterable by income type, daily briefing with a checklist, "Your business today" insights, upcoming deliverables and recent activity.
2. **Partnerships:** drag-and-drop board with stages **Lead → Pitching → Negotiating → Contracted → In Progress → Completed → Paid**, plus Lost/Declined. Each deal opens a detail panel with every field (agency, contact, fee, usage rights, exclusivity, payment terms, notes, attachments), deliverables, relationship history with that brand, and AI follow-up drafts.
3. **Campaigns** (new): every deliverable grouped by campaign, with progress bars, tap-to-advance status, filters (All, Due this week, In review, Late) and totals.
4. **Money:** totals, goals, invoices (create, record partial or full payments, print, reminder drafts), revenue by source and by brand, expenses and estimated profit. New panels: **Expected cash, next 8 weeks** (open invoices by due date, overdue excluded) and **Payment terms** (open count, balance, overdue and average days to pay for each NET term).
5. **Opportunities:** past-brand renewals and manually added leads, with pitch drafts.
6. **Intelligence:** every calculated insight, ranked by a visible score (impact, urgency, confidence, goal relevance) with evidence labels.
7. **AI Advisor:** chat with suggested questions (follow-ups, outstanding revenue, annual goal, most profitable campaigns, overdue invoices, priorities, slowest NET terms, pricing). Uses a live AI model on the sample data.
8. **Settings:** product name, logo, accent color, headline font, profile, goals, notification opt-ins, demo/workspace switch, reset.

There is also onboarding (account, profile, goals, import) and a "← Website" link in the header. The Audience screen still exists in the code but is no longer in the main navigation.

### Sample business ("Poca")
All fictional. Poca Monroe, Poca Studio LLC, lifestyle and beauty creator in Atlanta, about 142k Instagram, 98k TikTok and 24k YouTube followers. The demo date is November 2, 2026.
- 13 partnerships across all stages with fictional brands (Lumière Skin, Ostra Swim, Halcyon Hotels, Juniper Coffee Co., Arden Athletics, Sola Haircare, Brightline Audio, Marlow & Vine, Pell Home, Fennel Market).
- 10 invoices on NET30/45/60 terms, including one overdue (Brightline Audio, INV-2041), one partially paid (Sola Haircare), and several due in November.
- 12 months of revenue by type, expenses, a $10,000 monthly / $125,000 annual goal, four opportunities and audience numbers.

### How it stores data
Everything saves in the visitor's browser (key `nbf_state_v1`). There are no accounts, no server and no sharing between devices. Clearing the browser clears the data.

### How revenue is counted in the demo
The demo uses the prototype's model: revenue is entered by month, separately from deals and invoices. This is fine for a showcase. The real app (§6) uses a stricter model where only recorded payments count, so numbers won't match exactly once real data is used.

---

## 6. The real app (`beta/` folder)

A full Next.js 14 + TypeScript + Tailwind + Supabase codebase written for a 10–20 creator private beta. Detailed technical notes are in `beta/README.md` and `beta/docs/HANDOFF.md`.

### What it does
- **Accounts:** email and password sign-up, sign-in, password reset. **Sign-up only works with a valid invite code**, enforced inside the database.
- **Privacy:** every creator's records are walled off by database rules (row-level security). Records can't be linked across accounts even by guessing IDs. Uploaded files sit in private storage.
- **All screens and features from the prototype,** backed by a real database: onboarding, Overview, Partnerships with deliverables, Money, Intelligence, Opportunities, Audience, AI Advisor and Settings. A read-only demo mode is included.
- **Cash-basis revenue:** revenue = payments recorded on invoices + income received without an invoice. Deal fees and unpaid invoices never count. The database blocks overpayments, payments on voided invoices, and voiding invoices that have payments.
- **Secure AI:** AI runs only on the server. The key never reaches the browser. The AI only sees the signed-in creator's records, treats record text as data rather than instructions, and every factual claim must cite records. Unmatched dollar amounts are flagged as not verified. Usage is capped per user per hour. Anthropic (Claude) is the default provider, and it can be switched.
- **Beta tools:** in-app feedback and bug reports; opt-in usage analytics (off by default, event names only); an admin page with aggregate counts, onboarding drop-off, invite-code management and feedback triage. The admin page never shows earnings, contracts or records.
- **Other:** CSV import, a one-time import from the browser prototype (only when the creator confirms), JSON data export, printable invoices, and security headers.

### Tests
- **Money calculations:** 30 checks were run here and all passed.
- **Written but not yet run:** AI fact-checking, CSV parsing, database isolation between two accounts, and an end-to-end test of the 11-step journey (sign up, onboard, add a deal and deliverable, invoice, partial payment, totals, goal, insight, advisor, sign out and back in).

### Not built yet
Account deletion screen, actual delivery of email and push notifications, virus scanning of uploads, and the Gmail, Instagram, TikTok, YouTube and Stripe connections. The architecture leaves room for all of them.

---

## 7. NETBYFRIDAY changes to the real app: what's done and what isn't

**Done**
- New pipeline stages (Lead, Pitching, Negotiating, Contracted, In Progress, Completed, Paid) in the calculations, types, labels, CSV import and tests.
- Database migrations `20261102000006` and `20261102000007` rename the stages and move any existing deals to the new ones. The default product name becomes "netbyfriday".

**Not done (the app will not build cleanly until these are finished)**
- A few files still use old stage names, mainly the input-validation defaults, the prototype import, the "new partnership" form defaults and the demo data.
- The app still has the Creator Intelligence look: palette, font, wordmark and icon.
- The Campaigns screen, payment-terms panel, expected-cash chart and recent activity exist only in the prototype so far.
- The demo data is still the old food-creator sample, not Poca.
- The marketing site is not inside the app yet.
- No waitlist yet.
- The website's AI demo relies on a helper that only works in this design environment. It needs its own public server endpoint that only reads sample data and limits each visitor's requests.

### Recommended defaults for the open decisions
You asked me to decide; these are my recommendations, not yet built:
- **Domain:** everything on netbyfriday.com. The marketing site is the public homepage; the app lives behind sign-in on the same domain.
- **Get Started:** opens a waitlist form, with a small "Have an invite code?" link to the real sign-up.
- **Log In:** goes to the real sign-in.
- **Explore the Platform:** scrolls to the product section, or opens the read-only demo.

---

## 8. Path to a live product

1. **Business basics:** check the trademark, buy netbyfriday.com, set up business email, and form the entity before charging money.
2. **Accounts:** GitHub, Supabase (separate staging and production projects), Vercel, Anthropic (with a spend limit), and an email sender such as Resend or Postmark. Turn on two-factor sign-in everywhere.
3. **Finish the code** (§7), then run every test suite until it passes.
4. **Production database:** create the Supabase project, apply the migrations (never the test seed file), set the sign-in redirect addresses to netbyfriday.com, keep email confirmation on, connect the email sender, and turn on backups.
5. **Hosting:** deploy to Vercel, add the environment variables (secret keys only there), and point the domain's DNS at Vercel.
6. **Before inviting anyone:** complete the beta-readiness checklist in `beta/docs/HANDOFF.md`. That includes the two-account isolation check, confirming no secret keys appear in the public site code, real privacy and terms pages, and real prices before taking payment.

**Rules for keys:** never paste secret keys into chat, email, screenshots or code. Only values starting with `NEXT_PUBLIC_` may be visible in the browser. Never commit `.env.local`.

---

## 9. How to describe it

- **One line:** "I'm building netbyfriday, the business platform for independent creators."
- **Short version:** "Creators who do brand deals are running a real business out of spreadsheets, emails and DMs. netbyfriday puts deals, deliverables, invoices, payments and goals in one place, then tells you what needs attention: late invoices, past brands to pitch again, whether you're on track for the month."
- **What's different:** it shows money, not just followers; every insight comes from your own records and is labeled verified, estimate or suggestion; the AI Advisor answers from your data and shows its work.
- **Where it stands:** "There's a designed marketing site, a clickable demo with sample data, and the first version of the real app with secure accounts and a database. Next is getting it running and testing it with 10 to 20 invited creators."
- **Never say** it gets creators paid faster.

---

## 10. File map

| Path | Purpose |
|---|---|
| `NETBYFRIDAY Website.dc.html` | Marketing website prototype |
| `NETBYFRIDAY Dashboard.dc.html` | Dashboard demo prototype |
| `nbf-data.js` | Poca sample data (fictional) |
| `nbf-compute.js` | Calculation engine: totals, insights, NET-term stats, expected cash, recent activity |
| `nbf-actions.js` | Demo state, browser saving, AI calls |
| `uploads/` | Your original visual mockup |
| `beta/` | Real app codebase (Next.js + Supabase) |
| `beta/README.md` | Local setup, deployment, credentials |
| `beta/docs/HANDOFF.md` | Technical assessment, security model, tests, limitations, readiness checklist |
| `beta/supabase/migrations/` | Database setup and changes (7 files) |
| `Creator Intelligence.dc.html`, `ci-*.js` | Earlier prototype under the old working title |
