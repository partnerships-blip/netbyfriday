// Founder alerts: one short email to the netbyfriday team when someone requests a beta invite.
// This is the only email netbyfriday sends, and it goes only to our own inbox (FOUNDER_ALERT_TO), never to users or brands.
// Sent through the team's Google Workspace mailbox over SMTP with an app password. Setup: docs/FOUNDER_ALERTS.md.
// If it isn't configured, or sending fails, the visitor's request still succeeds; the entry is always in Admin → Waitlist.
import nodemailer, { type Transporter } from 'nodemailer';

export type WaitlistAlert = { email: string; name: string; handle: string; creatorType: string; source: string };

export function alertConfig(env: NodeJS.ProcessEnv = process.env) {
  const user = env.SMTP_USER?.trim(), pass = env.SMTP_PASS?.trim();
  if (!user || !pass) return null;
  return {
    to: (env.FOUNDER_ALERT_TO || user).trim(), from: user,
    host: env.SMTP_HOST?.trim() || 'smtp.gmail.com', port: Number(env.SMTP_PORT || 465), user, pass,
    siteUrl: (env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '')
  };
}

/** Plain-text email; the visitor's own words are kept on single lines so they can't add headers or fake sections. */
export function waitlistEmail(a: WaitlistAlert, siteUrl: string) {
  const one = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 200) || '—';
  const who = one(a.name) !== '—' ? one(a.name) : one(a.email);
  return {
    subject: `New beta invite request: ${who}`.slice(0, 150),
    text: [
      'Someone asked for a netbyfriday beta invite.', '',
      `Email: ${one(a.email)}`, `Name: ${one(a.name)}`, `Handle: ${one(a.handle)}`, `Creates: ${one(a.creatorType)}`, `From: ${one(a.source)}`, '',
      `Review and invite: ${siteUrl ? `${siteUrl}/admin` : 'Admin → Waitlist in the app'}`
    ].join('\n')
  };
}

let cached: Transporter | null = null;
export async function sendWaitlistAlert(a: WaitlistAlert, transport?: Transporter): Promise<'sent' | 'off' | 'failed'> {
  const c = alertConfig();
  if (!c) return 'off';
  try {
    const t = transport ?? (cached ??= nodemailer.createTransport({ host: c.host, port: c.port, secure: c.port === 465, auth: { user: c.user, pass: c.pass }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000 }));
    const m = waitlistEmail(a, c.siteUrl);
    await t.sendMail({ from: `netbyfriday <${c.from}>`, to: c.to, subject: m.subject, text: m.text });
    return 'sent';
  } catch (e) {
    console.error('[founder-alert] send failed', (e as Error)?.name, (e as any)?.code ?? '');
    return 'failed';
  }
}
