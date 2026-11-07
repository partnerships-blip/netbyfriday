import { describe, it, expect } from 'vitest';
import { waitlistCsv } from './waitlist-csv';

const r = (o: any) => ({ email: 'a@x.co', name: '', handle: '', creator_type: '', source: '', consent_at: '2026-11-01T10:00:00Z', created_at: '2026-11-01T10:00:00Z', invited_at: null, invite_code: null, ...o });
describe('waitlist CSV', () => {
  const csv = waitlistCsv([
    r({ email: 'late@x.co', created_at: '2026-11-03T09:00:00Z', invite_code: 'NBF-OLD', invited_at: '2026-11-03T12:00:00Z' }),
    r({ email: 'first@x.co', name: 'Ava, Jr.', handle: '=HYPERLINK("http://evil")', invite_code: 'NBF-USED', invited_at: '2026-11-02T12:00:00Z' }),
    r({ email: 'wait@x.co', created_at: '2026-11-04T09:00:00Z' })
  ], [{ code: 'NBF-USED', uses: 1, expires_at: '2026-12-02T00:00:00Z' }, { code: 'NBF-OLD', uses: 0, expires_at: '2026-11-05T00:00:00Z' }], new Date('2026-11-07T12:00:00Z'));
  const lines = csv.replace(/^﻿/, '').trim().split('\r\n');
  it('lists everyone oldest first with their status', () => {
    expect(lines[0]).toBe('Requested on,Email,Name,Handle,Creator type,How they heard,Status,Invited on,Invite code,Invite expires,Consented on');
    expect(lines.slice(1).map(l => l.match(/Waiting|Signed up|Invite expired|Invited/)?.[0])).toEqual(['Signed up', 'Invite expired', 'Waiting']);
  });
  it('quotes commas and neutralises spreadsheet formulas', () => {
    expect(lines[1]).toContain('"Ava, Jr."');
    expect(lines[1]).toContain(`"'=HYPERLINK(""http://evil"")"`);
  });
  it('opens in Excel with accents intact', () => { expect(csv.startsWith('﻿')).toBe(true); });
});
