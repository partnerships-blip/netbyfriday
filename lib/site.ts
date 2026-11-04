// Public site settings. Contact address is configurable so it can move to a netbyfriday.com mailbox without a code change.
/** Accepts "https://x.com", "x.com" or "x.com/" (with stray spaces) and returns a clean origin; never throws. */
export function normalizeSiteUrl(raw: string | undefined, fallback = 'https://netbyfriday.com'): string {
  const v = (raw ?? '').trim().replace(/\/+$/, '');
  if (!v) return fallback;
  try { return new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`).origin; } catch { return fallback; }
}
export const SITE = {
  name: 'netbyfriday',
  tagline: 'The business behind being booked.',
  url: normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL),
  contactEmail: (process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'partnerships@saypoca.com').trim()
};
