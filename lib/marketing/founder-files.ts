// The Founder Files: short editorial notes on building NETBYFRIDAY. Plain data, no CMS.
// Entries written in the founder's own voice must come from her (like content/founder-story.ts). The build notes below are
// written as the NETBYFRIDAY team about features that exist, and say nothing biographical.
export type FounderFile = { slug: string; title: string; kicker: string; date: string; byline: string; summary: string; body: string[] };

export const FOUNDER_FILES: FounderFile[] = [
  { slug: 'marked-paid-means-recorded', kicker: 'Beta feedback', date: '2026-11-06', byline: 'The NETBYFRIDAY team',
    title: 'Marked Paid should mean the money is recorded',
    summary: 'A founding creator moved a partnership to Paid and the dashboard still said nothing had been received. Here is what changed.',
    body: [
      'In the first version, a partnership’s stage and its money were separate. You could drag a deal to Paid, but revenue only counted payments recorded against an invoice. The dashboard was technically right and practically confusing.',
      'Now, marking a partnership Paid records what was owed: open invoices on that deal are paid off, and an agreed fee that was never invoiced gets an invoice and a payment, dated the day you mark it.',
      'Two cases still ask you first. If the fee was your own estimate, or there is no fee, we ask how much you actually received, because guessing would put the wrong number in your revenue. And a gifted collaboration with no cash asks for nothing at all.',
      'Revenue stays cash basis: only money you have received counts. That rule did not change. What changed is that the obvious action now does the bookkeeping for you.'
    ] },
  { slug: 'why-the-contract-reader-shows-its-quotes', kicker: 'Why this feature works the way it does', date: '2026-11-05', byline: 'The NETBYFRIDAY team',
    title: 'Why the contract reader shows you the sentence it used',
    summary: 'Usage rights and exclusivity are where creators lose money quietly. A summary you can’t check isn’t good enough.',
    body: [
      'When you upload a contract, NETBYFRIDAY reads the fee, payment terms, usage rights, exclusivity and deliverables. Next to every term it shows the sentence from the contract it came from.',
      'That is deliberate. A summary that says “usage: 90 days” is only useful if you can see it really says 90 days, from when, and on which channels. If we can’t find the wording in your document, we tell you so instead of filling the gap.',
      'Nothing is saved until you have checked each term and pressed Confirm. Money is never taken from the model’s reading: the fee is parsed from the contract text by the same engine that does the rest of your numbers. When the usage or exclusivity window is about to end, you get a reminder, because renewals and extensions are where the next fee often comes from.',
      'It is not legal advice, and it doesn’t replace reading what you sign. It makes the important parts easy to find and hard to forget.'
    ] },
  { slug: 'taxes-on-cash-you-received', kicker: 'Building NETBYFRIDAY', date: '2026-11-04', byline: 'The NETBYFRIDAY team',
    title: 'Tax set-asides are based on money you’ve actually received',
    summary: 'Booked deals feel like income. Until the payment lands, they aren’t, and planning taxes on them gets expensive.',
    body: [
      'The Taxes page works on a simple rule: only money you have received counts. Signed partnerships, sent invoices and your pipeline are tracked everywhere else, but never in your tax numbers.',
      'You choose a set-aside percentage, and NETBYFRIDAY applies it to your profit for the year so far: money received minus the expenses you’ve recorded. It shows each estimated-tax period with its due date, and which brands have paid you enough to expect a 1099.',
      'It is a planning tool, not tax advice. Your accountant decides what you actually owe. What we can do is make sure the number you start that conversation with is grounded in what really came in.'
    ] }
];
export const founderFile = (slug: string) => FOUNDER_FILES.find(f => f.slug === slug);
