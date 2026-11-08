# Founder alerts: email when someone requests a beta invite

When a new person joins the waitlist (not a repeat sign-up), netbyfriday sends one plain-text email to `FOUNDER_ALERT_TO` with their email, name, handle, what they create and where they came from, plus a link to Admin → Waitlist to invite them.

This is the only email netbyfriday sends. It goes only to our own inbox, never to users or brands, through the team's Google Workspace mailbox (founder decision, 2026-11-08). If it isn't set up, or sending fails, the visitor's request still succeeds and the entry is in Admin as always.

## Setup (founder, about 5 minutes)

1. Sign in to Google as **hello@netbyfriday.com**.
2. Turn on 2-Step Verification: myaccount.google.com → Security → 2-Step Verification. (If your Workspace admin settings block it, turn it on in admin.google.com → Security → Authentication → 2-Step Verification → "Allow users to turn on 2-Step Verification".)
3. Create an app password: myaccount.google.com/apppasswords → name it "netbyfriday alerts" → copy the 16-character password.
4. In Vercel → netbyfriday → Settings → Environment Variables, add these for **Production** (and Preview if you want alerts from staging), then redeploy:

   | Name | Value |
   |---|---|
   | `SMTP_USER` | `hello@netbyfriday.com` |
   | `SMTP_PASS` | the app password (no spaces) |
   | `FOUNDER_ALERT_TO` | `hello@netbyfriday.com` |

   Optional: `SMTP_HOST` (default `smtp.gmail.com`), `SMTP_PORT` (default `465`).
5. Test: join the waitlist on the site with a new email. The alert should arrive within a minute (check Spam the first time and mark it "Not spam").

The app password is a secret: only in Vercel or `.env.local`, never in the code. To stop alerts, delete `SMTP_PASS` in Vercel and redeploy, or revoke the app password in Google.

## Code

`lib/notify/founder.ts` (config, the email text with the visitor's input kept to single lines, sending with short timeouts), called from `app/(marketing)/waitlist/actions.ts` after a new entry is stored. Tests: `lib/notify/founder.test.ts`.
