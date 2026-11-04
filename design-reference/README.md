# Handoff: NETBYFRIDAY creator business platform

## Overview
netbyfriday is a business workspace for independent creators: brand deals, deliverables, contracts, invoices, payments, revenue and tasks in one place, with deterministic insights and an approval-gated AI Advisor. This package has everything needed to build the real product in a working development environment with Claude Code:

1. **`code/`**: the starting Next.js 14 + TypeScript + Tailwind + Supabase codebase. It includes auth, RLS, the finance engine, the AI safeguards and an admin view. **It has never been installed or run.** It is the foundation to extend.
2. **`design/`**: high-fidelity HTML prototypes of the marketing website and the app dashboard, plus their sample data and calculation engine.
3. **`docs/`**: the build plan (architecture, schema decisions, milestones, external approvals), the knowledge base (brand, copy, rules), and the original mockup.
4. **`CLAUDE.md`**: standing instructions for Claude Code. Copy it to the repo root.

The full product spec is the "NETBYFRIDAY Master Full-Stack SaaS Development Prompt" (your original document). `docs/NETBYFRIDAY Build Plan.md` maps that spec onto this codebase.

## About the design files
The files in `design/` are **design references built in HTML**. They are prototypes showing the intended look, copy, data shapes and behavior, not production code to copy. The task is to **recreate them in the Next.js app** with React, Tailwind and shadcn/ui, using the patterns already in `code/`.

To view a prototype, open `design/NETBYFRIDAY Website.dc.html` or `design/NETBYFRIDAY Dashboard.dc.html` in a browser. Keep `support.js` and the `nbf-*.js` files beside them. Add `?demo=1` to the Dashboard URL to skip onboarding. The AI panels in the prototypes call a helper that only exists in the design tool; in the real app they must call the server endpoints described below.

## Fidelity
**High fidelity.** Colors, type, spacing, copy and interactions are final for v1. Recreate them precisely. Where the prototype and the master spec differ (stages, routes, extra screens), **the master spec wins on structure and the prototype wins on visual style.**

## Decisions already made
| Topic | Decision |
|---|---|
| Where to build | In a real dev environment with Claude Code, starting from `code/` |
| Sign-up | Invite-only plus waitlist until the beta passes the readiness checklist, then open sign-up with Stripe trials |
| AI provider | Configurable. Default `AI_PROVIDER=openai` (per the master spec). Keep the Anthropic adapter in `code/lib/ai/provider.ts`. |
| Deal stages | Spec defaults, stored in a per-workspace `deal_stages` table (not an enum): Lead, Pitch Sent, Negotiation, Contract, In Production, Submitted, Approved, Invoiced, Paid, Lost / Canceled. Each stage has a category (`open`, `won`, `paid`, `lost`). Revenue logic reads the category, never the name. |
| Background jobs | Inngest |
| Money | `bigint` minor units plus an ISO 4217 `currency` column; no conversion; totals per currency |
| Payment due dates | `terms_days` + `due_trigger` (issue, submission, receipt, approval, publish, custom) + `trigger_date`. With no trigger date the status is "Due date pending". |
| Revenue states | Contracted, Invoiced, Received (recorded payments), Outstanding, Overdue, Projected. Only Received counts as cash. Projected is always labeled not guaranteed. |
| Pricing | Draft values (Starter Free / Pro $29 / Studio $59) behind a config file and labeled "Illustrative". Waitlist CTA until approved. |
| Founder story, legal, address | Placeholders until the founder approves text |

## Screens / views

### Public website (`design/NETBYFRIDAY Website.dc.html`) → `app/(marketing)/`
The container is max-width 1240px with 24px side padding. Sections use `clamp(72px,10vw,136px)` vertical padding.

1. **Nav.** Sticky, 72px tall, background `rgba(250,247,243,.88)` with 14px backdrop blur, 1px bottom border `#ECE4EA`. Contents:
   - Wordmark (§Brand).
   - Links (spec): Product, Solutions, How It Works, Pricing, Resources. 15px/600, 38px tall, 10px radius, `#EAE5F7` on hover.
   - "Log In" (text) and "Get Started Free" (44px tall, 12px radius, `#DFFF43` background, plum 15px/700, lifts −1px on hover).
   - Below 860px the links collapse to a "Menu" button opening a full-width panel (52px rows, 18px/700).
2. **Hero.** Two columns `1.02fr / 1fr` with a 64px gap; stacks below 1120px.
   - Eyebrow pill: 36px tall, `#F3FFC4` background, 1px `#E4F28A` border, 8px plum diamond, 12px/800 uppercase with .2em tracking, "The creator business platform".
   - H1: `clamp(46px,6.6vw,92px)`, weight 800, line-height .98, tracking −.045em. "Run your creator business **like a business.**" The highlighted words are italic on a `#DFFF43` background (radius .22em, padding 0 .14em, no wrap).
   - Body copy: 17–20px/1.55 in `#4A2A45`, max-width 560px. Use the spec's copy.
   - CTAs: 56px tall, 14px radius, 17px/700. The primary is plum with ivory text (lifts −2px on hover, shadow `0 10px 30px rgba(50,21,47,.25)`); the secondary has a 1.5px plum border.
   - Three proof points in a 3-column row with a 1px `#E0D5DE` top border and dividers.
   - Product preview: a white card (22px radius, 1px `#ECE4EA` border, shadow `0 30px 80px rgba(50,21,47,.22)`). On desktop it is tilted with `perspective(1800px) rotateY(-9deg) rotateX(3deg)` and flattens on hover. Behind it sits a plum slab rotated −4deg with 40px radius. Inside: a 148px sidebar and four working tabs.
     - **Home:** four stat tiles, pipeline chips, upcoming payments, cash bars.
     - **Deals.**
     - **Money:** outstanding by NET term.
     - **Insights:** top three with evidence pills.
     - A "Sample data" pill is always visible. In production, build this from real app components fed with the Poca fixture.
3. **Terms ticker.** Plum band with 26px padding. A seamlessly looping marquee (38s linear) of terms phrases at `clamp(22px,3vw,34px)`/800: NET terms in chartreuse, others in ivory, separated by `#6C4B67` diamonds. Static when reduced motion is on.
4. **Problem.** H2 "You're the talent. The accountant. The negotiator. The entire team." Four role cards (auto-fit, min 250px, 24px radius, 26px padding, min-height 300px, lift −4px on hover) in this order of fills: white, lavender, plum, chartreuse. Each has chip examples. Exact copy is in the prototype.
5. **Features.** Lavender section. Six cards (white, 24px radius, 12px inner padding). Each has a 200px mini interface on top (not an icon) and a 22px/800 title with 15px body. Map to the spec's six: Brand Deal Management, Invoice & Payment Tracking, Revenue Intelligence, Contacts & Relationships, Content & Deliverables, AI Business Assistant. The prototype's "Opportunities" card becomes Contacts & Relationships.
6. **How It Works** (new, from the spec). Three steps, styled like the problem cards.
7. **NET45 section.** Plum section, H2 "The content went live. *The invoice is still pending.*" (the second sentence italic chartreuse).
   - Interactive six-step timeline: Pitch, Contract, Create, Post, Invoice, NET45. The first five are spaced at 0/12/24/36/48% of the track; NET45 sits at 100%. A dashed bracket labeled "45 days between invoice and due date" spans the gap. The track is 4px tall: `rgba(250,247,243,.14)` behind a chartreuse fill.
   - Step dots are 44px: chartreuse when active, ivory once passed, plum when ahead.
   - It autoplays every 3.4s until the visitor clicks a step.
   - Below: a detail card (big "Day N", title, body) and a "What netbyfriday tracks here" list.
   - Vertical list on mobile.
   - Ends with: "netbyfriday doesn't decide when brands pay…"
8. **Business intelligence.** 12-month revenue bar chart (200px tall, plum bars, the hovered bar turns chartreuse and shows its value) spanning two columns. Four metric tiles, each with Verified or Projection pills. A list of insights with evidence labels.
9. **AI Advisor.** Lavender section. Four prompt buttons on the left; on the right a chat card (28px radius) with a plum header labeled "Live AI · reading fictional sample data" and "Demo". Answers render as answer → "From the records" bullets → "Suggested next step", followed by two action cards. In production this calls the public `/api/demo-advisor`, which reads the sample fixture only and is rate limited.
10. **Product preview, Founder story, FAQ** (new, from the spec). Founder content uses placeholders. The FAQ uses an accordion.
11. **Pricing.** Three cards (28px radius, 30px padding). The middle "Pro" card is plum with a chartreuse "Recommended" pill. Prices come from `lib/billing/plans.ts`, with the label "Illustrative plans · pricing is not final".
12. **Final CTA.** Plum panel (36px radius), H2 "Your influence is the business. *Start treating it like one.*"
13. **Footer.** Product, Company, Resources, Legal & social columns, plus the disclaimer line "netbyfriday is not a payment service and does not control when brands pay."

Also build the pages listed in the spec: `/features`, `/how-it-works`, `/pricing`, `/about`, `/contact`, `/waitlist`, `/privacy`, `/terms`.

### App (`design/NETBYFRIDAY Dashboard.dc.html`) → `app/app/`
The sidebar is 236px wide on desktop. The active nav item has a `#DFFF43` background; a mobile bottom bar appears below 860px. Header: a 60px bar with the date, a notifications button, and an "Ask AI" button in the accent color.
- **Dashboard:** the spec's cards (contracted, received, outstanding, overdue, active deals) + the 12-month chart with stream filters + the daily briefing (plum card) + "Your business today" insights + upcoming deliverables + recent activity + priority tasks.
- **Deals:** drag-and-drop pipeline (264px columns, lavender background, accent outline on drag-over) plus a list view. The detail page holds every deal field, deliverables, relationship history and AI follow-up drafts.
- **Content** (the prototype's "Campaigns" screen): deliverables grouped by campaign, progress bar, tap-to-advance status, filters (All / Due this week / In review / Late), plus a calendar view.
- **Invoices / Revenue** (the prototype's "Money"): stat tiles, goals, invoice table with tabs (Open / Overdue / Paid / All), **Expected cash, next 8 weeks** bar chart (this week's bar in chartreuse; overdue excluded and labeled), and a **Payment terms** panel (NET pill, open count and balance, overdue, average days to pay).
- **Insights:** ranked feed with visible scores (Impact 0–40 + Urgency 0–30 + Confidence 0–20 + Goal 0–10) and evidence pills (Verified from your records / Estimate / Suggested opportunity / Insufficient data).
- **AI:** chat with suggested prompts. Each answer is split into facts with record citations, forecasts and suggestions.
- **Settings:** brand, profile, goals, notifications, integrations, billing.
- **New from the spec**, built in the same visual language: Contracts, Brands, Contacts, Tasks, Settings → Integrations, Settings → Billing, and `/admin`.

## Interactions & behavior
- Scroll reveal: elements below the fold start at opacity 0 and translateY(18px), then transition over .7s ease when 12% visible. Skip entirely with `prefers-reduced-motion`.
- Hover lifts: cards −4px with shadow `0 18px 40px rgba(50,21,47,.1)`; buttons −1 or −2px; transitions .15–.2s.
- Charts animate height and width over .3–.4s ease.
- Every button performs a real action. Forms validate on the server with zod and show inline errors (`#A8402B`, 13px).
- Loading: a pulsing 8px dot with "Reading your records" (AI) or skeletons. Every list has an empty state that explains how to add the first record.
- Demo mode is read-only and clearly labeled "Demo · fictional data".

## State management and data
- Server components load workspace data through Supabase under RLS. Mutations are server actions: authenticate, validate, write, revalidate. The client never sends a `workspace_id`.
- All money math lives in `lib/money` and `lib/finance`. The finance engine in `code/lib/finance/core.js` already does the ledger, overdue logic, pipeline, insights and notifications. Extend it with currency, line items, terms triggers, NET-term stats, 8-week projection buckets and recent activity. The prototype's `design/nbf-compute.js` shows the expected outputs for those last three.
- The Poca sample data (`design/nbf-data.js`) becomes the staging seed, the read-only demo fixture, and the source for the website preview and `/api/demo-advisor`. **Never seed it into production accounts.**

## Design tokens

**Colors**
| Token | Hex | Use |
|---|---|---|
| plum | `#32152F` | Primary text, buttons, dark sections |
| ivory | `#FAF7F3` | Page background |
| chartreuse | `#DFFF43` | Signature accent (sparingly). Text on it is always plum. |
| chartreuse-soft | `#F3FFC4` | Accent background (border `#DDEB9A` / `#E4F28A`) |
| lavender | `#EAE5F7` | Secondary surfaces |
| plum-muted | `#6C4B67` | Secondary text |
| plum-body | `#4A2A45` | Long-form body on ivory |
| plum-sub | `#5E4459` | Supporting text in cards |
| plum-faint | `#9A8396` | Tertiary text |
| on-dark-muted | `#CDB9C9` | Secondary text on plum |
| white | `#FFFFFF` | Cards |
| line | `#ECE4EA` | Borders |
| line-strong | `#E0D5DE` | Input borders |
| line-soft | `#F0EBF2` | Row dividers |
| success-bg | `#E3EEE5` | (text `#2C6542`) |
| warn-bg | `#F5ECD8` | (text `#7A4E0E`) |
| danger-bg | `#F3DDD6` | (text `#A8402B`) |

**Typography:** Plus Jakarta Sans 400/500/600/700/800 (Google Fonts, via `next/font`). Geist Mono for small uppercase labels in the app.
| Role | Size | Weight / spacing |
|---|---|---|
| Display H1 | `clamp(46px,6.6vw,92px)` | 800, line-height .98, tracking −.045em |
| Section H2 | `clamp(38px,5vw,68px)` | 800, line-height 1, tracking −.045em |
| Card title | 22–26px | 800, tracking −.03em |
| Big number | 36–56px | 800, tracking −.04em |
| Body | 15–18px | 400–600, line-height 1.5–1.6 |
| Eyebrow | 12px | 800, uppercase, .2em tracking |
| Mono label | 10–11px | uppercase, .08em tracking |

**Radius:** 6, 9, 10, 12, 14, 16, 22, 24, 28, 36, and 999 (pills).

**Shadows:**
- Hero card: `0 30px 80px rgba(50,21,47,.22)`
- Panel: `0 30px 80px rgba(50,21,47,.14)`
- Hover: `0 18px 40px rgba(50,21,47,.1)`
- Small: `0 8px 20px rgba(50,21,47,.1)`

**Spacing:**
- Gaps: 4, 6, 8, 10, 12, 14, 16, 18, 22, 24, 28, 32, 48, 56
- Card padding: 18–30
- Section padding: `clamp(72px,10vw,136px)`

**Breakpoints:** 860px (mobile layouts and menu), 1120px (hero stacks).

## Brand

**Wordmark:** lowercase `netbyfriday` in Plus Jakarta Sans 800, tracking −.055em, line-height 1, 5px bottom padding. The underline is a `linear-gradient(#DFFF43,#DFFF43)` background image, no-repeat, sized `58% 6px`, positioned `100% 100%`. Sizes: nav 26px, footer 28px, app sidebar 23px.

**App icon:** a plum square with radius 28% of its size; an ivory lowercase "n" at 62% of the size, weight 800; a chartreuse bar 9% of the size tall, inset 27% from the left and right edges and 20% from the bottom. Inverted on dark: ivory square, plum "n".

Build both as React components (SVG or styled text), not raster images. No logo files exist yet.

## Assets
- No photos or illustrations. All visuals are UI built from data.
- No real brand logos and no testimonials.
- Fonts come from Google Fonts.
- The original reference mockup is in `docs/mockup.png`.

## Files
| Path | Contents |
|---|---|
| `CLAUDE.md` | Instructions for Claude Code (copy to repo root) |
| `code/` | Starting codebase. Read `code/README.md` and `code/docs/HANDOFF.md` first. |
| `design/NETBYFRIDAY Website.dc.html` | Marketing site prototype |
| `design/NETBYFRIDAY Dashboard.dc.html` | App prototype |
| `design/nbf-data.js` | Poca sample business (fictional) |
| `design/nbf-compute.js` | Prototype calc engine: NET-term stats, 8-week projection, recent activity |
| `design/nbf-actions.js` | Prototype state and AI prompt wording |
| `design/support.js` | Runtime needed to open the prototypes in a browser |
| `docs/NETBYFRIDAY Build Plan.md` | Audit, architecture, schema decisions, credentials, external approvals, milestones |
| `docs/NETBYFRIDAY Knowledge Base.md` | Product, brand, copy, rules, positioning |
| `docs/mockup.png` | Original visual direction |

## How to start
1. Create a private GitHub repo. Copy `code/` into it as the repo root, and add `CLAUDE.md` and `docs/`.
2. Install Node 20+, Docker and the Supabase CLI. Run `npm install`, `supabase init`, `supabase start`, `supabase db reset`.
3. Open the repo in Claude Code and say: "Read CLAUDE.md and docs/NETBYFRIDAY Build Plan.md, then start Milestone 1."
