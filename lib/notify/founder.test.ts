import { describe, it, expect, afterEach } from 'vitest';
import nodemailer from 'nodemailer';
import { alertConfig, waitlistEmail, sendWaitlistAlert } from './founder';

const A = { email: 'new@creator.test', name: 'Nia Creator', handle: '@nia', creatorType: 'Beauty', source: 'website' };
const saved = { ...process.env };
afterEach(() => { process.env = { ...saved }; });

describe('founder alerts for beta invite requests', () => {
  it('is off until the mailbox is configured, and goes to FOUNDER_ALERT_TO', () => {
    expect(alertConfig({} as any)).toBeNull();
    const c = alertConfig({ SMTP_USER: 'hello@netbyfriday.com', SMTP_PASS: 'app-pass', FOUNDER_ALERT_TO: 'hello@netbyfriday.com' } as any)!;
    expect(c).toMatchObject({ to: 'hello@netbyfriday.com', host: 'smtp.gmail.com', port: 465 });
  });
  it('writes a plain email the visitor cannot add headers or lines to', () => {
    const m = waitlistEmail({ ...A, name: 'Nia\r\nBcc: x@evil.test' }, 'https://netbyfriday.com');
    expect(m.subject).toBe('New beta invite request: Nia Bcc: x@evil.test');
    expect(m.subject).not.toMatch(/[\r\n]/);
    expect(m.text).toContain('Email: new@creator.test');
    expect(m.text).toContain('Review and invite: https://netbyfriday.com/admin');
  });
  it('sends one message, and reports off or failed without throwing', async () => {
    expect(await sendWaitlistAlert(A)).toBe('off');
    Object.assign(process.env, { SMTP_USER: 'hello@netbyfriday.com', SMTP_PASS: 'app-pass', FOUNDER_ALERT_TO: 'hello@netbyfriday.com' });
    const t = nodemailer.createTransport({ jsonTransport: true });
    const sent: any[] = []; const orig = t.sendMail.bind(t);
    (t as any).sendMail = async (o: any) => { sent.push(o); return orig(o); };
    expect(await sendWaitlistAlert(A, t)).toBe('sent');
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'hello@netbyfriday.com', from: 'netbyfriday <hello@netbyfriday.com>' });
    const broken: any = { sendMail: async () => { throw Object.assign(new Error('auth'), { code: 'EAUTH' }); } };
    expect(await sendWaitlistAlert(A, broken)).toBe('failed');
  });
});
