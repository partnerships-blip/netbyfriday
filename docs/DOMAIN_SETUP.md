# Connecting netbyfriday.com (GoDaddy) to Vercel

DNS stays at GoDaddy. Vercel serves the site and issues the HTTPS certificate automatically.

1. **Vercel → project `netbyfriday-x566` → Settings → Domains → Add.** Add `netbyfriday.com`. Vercel offers to add `www.netbyfriday.com` and redirect it; accept (www → apex).
2. Vercel shows a **domain card** with the records to create. Copy the exact values from it; they can be project-specific.
   - Apex `netbyfriday.com`: an **A** record, name `@` (Vercel's general value is `76.76.21.21`; use the card's value if it differs).
   - `www`: a **CNAME** record, name `www`, pointing to the target on the card (for example `cname.vercel-dns.com` or a project-specific `…vercel-dns-….com`).
3. **GoDaddy → My Products → netbyfriday.com → DNS (Manage DNS).**
   - Delete any existing **A** record named `@` (often GoDaddy's "Parked" record) and any **CNAME** named `www`. Leave MX/TXT email records alone.
   - Add the A record (`@` → value from Vercel, TTL default).
   - Add the CNAME record (`www` → value from Vercel).
   - If GoDaddy "Forwarding" is turned on for the domain, turn it off.
4. Wait for Vercel's domain card to show **Valid Configuration** (minutes; occasionally up to a few hours). HTTPS is issued automatically.
5. Point the app at the domain:
   - **Vercel → Settings → Environment Variables:** set `NEXT_PUBLIC_SITE_URL` = `https://netbyfriday.com`, then redeploy.
   - **Supabase → Authentication → URL Configuration:** Site URL `https://netbyfriday.com`; Redirect URLs add `https://netbyfriday.com/auth/callback` (keep the vercel.app one while testing).
6. Optional: `NEXT_PUBLIC_CONTACT_EMAIL` sets the address shown on the site and legal pages (default `partnerships@saypoca.com`).

Later (M6), auth emails (password reset, confirmations) should come from a custom SMTP sender on this domain; that needs SPF/DKIM TXT records added at GoDaddy.
