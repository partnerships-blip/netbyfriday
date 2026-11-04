// Public site settings. Contact address is configurable so it can move to a netbyfriday.com mailbox without a code change.
export const SITE = {
  name: 'netbyfriday',
  tagline: 'The business behind being booked.',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://netbyfriday.com',
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'partnerships@saypoca.com'
};
