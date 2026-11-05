// NETBYFRIDAY read-only demo workspace ("Jordan Lee", a fictional creator), built from design-reference/nbf-data.js.
// Every person, brand and figure is fictional. Never written to the database; never seeded into production.
// Cash basis holds here too: brand revenue comes only from payments on invoices; other streams are direct income entries.
import type { CoreInput, Deal, Invoice, Payment, IncomeEntry, Profile, Contact, Task, DeliverableStatus, Stage, Contract } from '../types';
import { lastMonths } from '../finance/core.js';

export const DEMO_TODAY = '2026-11-02';
const c = (dollars: number) => Math.round(dollars * 100);
const STAGE: Record<string, Stage> = { Lead: 'lead', Pitching: 'pitching', Negotiating: 'negotiating', Contracted: 'contracted', 'In Progress': 'in_progress', Completed: 'completed', Paid: 'paid' };
const DSTATUS: Record<string, DeliverableStatus> = { 'Not started': 'not_started', 'In progress': 'in_progress', 'In review': 'in_review', Approved: 'approved', Posted: 'posted', Scheduled: 'scheduled' };

type RawDeal = [id: string, brand: string, agency: string, contact: string, email: string, campaign: string, fee: number, stage: string, terms: string,
  started: string, lastContact: string, extra?: Partial<Deal> & { completed?: string; dels?: [string, string, string, string, string?][] }];
const RAW: RawDeal[] = [
  ['d1', 'Lumière Skin', '', 'Imani Brooks', 'imani@lumiereskin.example', 'Glow Season Launch', 9500, 'In Progress', '50% deposit, balance Net 45 after posting', '2026-09-30', '2026-10-30', {
    description: 'Launch content for the winter serum line: one Reel, a Stories set and a TikTok.', platforms: ['Instagram', 'TikTok'], contractStatus: 'Signed Oct 9', usageRights: '60 days paid usage', exclusivity: 'No competing skincare for 45 days',
    notes: 'Imani prefers drafts in the shared folder by Thursday.', dels: [['x1', '1 Instagram Reel', '2026-11-05', 'In review', 'Draft sent Oct 30'], ['x2', '3 Instagram Stories', '2026-11-07', 'Not started'], ['x3', '1 TikTok video', '2026-11-12', 'In progress', 'Same shoot as the Reel'], ['x4', '60 days paid usage', '2027-01-04', 'Scheduled', 'Starts on Reel post date']] }],
  ['d2', 'Ostra Swim', 'Tidepool Talent', 'Marco Vale', 'marco@tidepool.example', "Resort '27 Lookbook", 12000, 'Negotiating', 'Net 60', '2026-10-14', '2026-10-28', {
    description: 'Lookbook shoot plus two Reels for the resort collection.', contractStatus: 'Not sent', usageRights: 'Requested 90 days paid usage', exclusivity: 'Requested swimwear exclusivity, 60 days',
    notes: 'They opened at $9,000. Countered at $12,000 with usage included.', dels: [['x5', 'Lookbook shoot (12 images)', '2026-12-10', 'Not started'], ['x6', '2 Instagram Reels', '2026-12-18', 'Not started']] }],
  ['d3', 'Halcyon Hotels', '', 'Renee Park', 'renee@halcyon.example', 'Weekend in Savannah', 7500, 'Contracted', '50% deposit, balance Net 30', '2026-10-12', '2026-10-28', {
    description: 'Hosted two-night stay with a travel Reel and carousel.', platforms: ['Instagram', 'TikTok'], contractStatus: 'Signed Oct 27', notes: 'Stay dates Nov 14–16.',
    dels: [['x7', '1 travel Reel', '2026-11-20', 'Not started'], ['x8', '1 Instagram carousel', '2026-11-22', 'Not started']] }],
  ['d4', 'Juniper Coffee Co.', '', 'Sam Ortiz', 'sam@junipercoffee.example', 'Morning Ritual', 2800, 'Lead', '', '2026-10-27', '2026-10-27', {
    description: 'Inbound DM about a winter blend. Budget not shared yet.', platforms: ['TikTok'], feeIsEstimate: true, contractStatus: '', usageRights: 'Not discussed', exclusivity: 'Not discussed', notes: 'Fee is my estimate, not their offer.' }],
  ['d5', 'Arden Athletics', '', 'Jules Hart', 'jules@arden.example', 'Holiday Gift Edit', 4500, 'Pitching', 'Net 30 proposed', '2026-10-20', '2026-10-20', {
    description: 'Pitched a gift-guide feature with a try-on TikTok.', platforms: ['Instagram', 'TikTok'], contractStatus: '', notes: 'Pitch deck sent Oct 20. No reply yet.' }],
  ['d6', 'Sola Haircare', '', 'Tasha Green', 'tasha@sola.example', 'Silk Press Series', 6000, 'Completed', 'Net 45', '2026-09-05', '2026-10-30', {
    description: 'Three-part tutorial series.', platforms: ['YouTube', 'Instagram'], notes: 'Second campaign together.', completed: '2026-10-08', dels: [['x9', '3 YouTube tutorials', '2026-10-06', 'Posted']] }],
  ['d7', 'Brightline Audio', '', 'Devin Shaw', 'devin@brightline.example', 'Studio Setup', 3800, 'Completed', 'Net 30', '2026-08-01', '2026-10-08', {
    description: 'Desk setup video with headphones.', platforms: ['YouTube'], notes: 'Invoice sent Sep 1. Reminder sent Oct 8.', completed: '2026-08-30' }],
  ['d8', 'Marlow & Vine', '', 'Ellis Ward', 'ellis@marlowvine.example', 'Fall Tablescape', 5200, 'Paid', 'Net 45', '2026-08-01', '2026-09-28', { description: 'Hosting Reel and carousel.', notes: 'Paid 11 days early.', completed: '2026-08-25' }],
  ['d9', 'Lumière Skin', '', 'Imani Brooks', 'imani@lumiereskin.example', 'Summer SPF', 8000, 'Paid', 'Net 45', '2026-05-20', '2026-07-15', { description: 'Two Reels.', completed: '2026-06-10' }],
  ['d10', 'Pell Home', '', 'Nora Pell', 'nora@pellhome.example', 'Spring Refresh', 4200, 'Paid', 'Net 30', '2026-03-01', '2026-05-10', { description: 'Bedroom refresh Reel.', notes: 'Nora mentioned a holiday collection.', completed: '2026-03-20' }],
  ['d11', 'Fennel Market', '', 'Ari Cohen', 'ari@fennel.example', 'Holiday Hosting', 3600, 'Paid', 'Net 30', '2025-11-20', '2026-01-15', { description: 'Holiday hosting TikTok.', platforms: ['TikTok'], completed: '2025-12-12' }],
  ['d12', 'Ostra Swim', 'Tidepool Talent', 'Marco Vale', 'marco@tidepool.example', 'Summer Capsule', 10500, 'Paid', 'Net 60', '2026-04-01', '2026-06-10', { description: 'Capsule launch shoot.', usageRights: '60 days paid', exclusivity: 'Swimwear, 30 days', completed: '2026-04-25' }],
  ['d13', 'Sola Haircare', '', 'Tasha Green', 'tasha@sola.example', 'Wash Day', 5500, 'Paid', 'Net 45', '2026-03-15', '2026-05-30', { description: 'Wash day Reel.', completed: '2026-04-10' }]
];

export function demoData(): { input: CoreInput; profile: Profile; contracts: Contract[]; paymentDetails: string } {
  const contactId = (email: string) => 'demo-c-' + email.split('@')[0];
  const deals: Deal[] = RAW.map(([id, brand, agency, contact, email, campaign, fee, stage, terms, started, last, x = {}]) => {
    const { completed, dels = [], ...rest } = x;
    return {
      id: 'demo-' + id, brandId: 'demo-b-' + brand, brandName: brand, agency, contactName: contact, contactEmail: email, campaign, description: '', feeCents: c(fee), feeIsEstimate: false,
      stage: STAGE[stage], platforms: ['Instagram'], contentCategory: '', contractStatus: 'Signed', usageRights: '30 days organic', exclusivity: 'None', paymentTerms: terms, notes: '',
      startedOn: started, completedOn: completed ?? null, lastContactOn: last, contactId: contactId(email), attachments: [],
      deliverables: dels.map(([did, name, due, status, notes = '']) => ({ id: 'demo-' + did, dealId: 'demo-' + id, name, dueOn: due, status: DSTATUS[status], notes })),
      ...rest
    };
  });

  const iv = (number: string, deal: string | null, client: string, amount: number, issued: string, due: string, terms: string, stream: Invoice['stream'] = 'brand'): Invoice =>
    ({ id: 'demo-' + number, number, dealId: deal ? 'demo-' + deal : null, clientName: client, description: '', stream, amountCents: c(amount), issuedOn: issued, dueOn: due, terms, voidedAt: null });
  const invoices: Invoice[] = [
    iv('INV-2041', 'd7', 'Brightline Audio', 3800, '2026-09-01', '2026-10-01', 'Net 30'),
    iv('INV-2039', null, 'Studio Atlas Conference', 1500, '2026-09-20', '2026-11-19', 'Net 60', 'appearances'),
    iv('INV-2044', 'd1', 'Lumière Skin', 4750, '2026-10-10', '2026-11-24', 'Net 45'),
    iv('INV-2045', 'd6', 'Sola Haircare', 6000, '2026-10-08', '2026-11-22', 'Net 45'),
    iv('INV-2046', 'd3', 'Halcyon Hotels', 3750, '2026-10-28', '2026-11-27', 'Net 30'),
    iv('INV-2036', 'd8', 'Marlow & Vine', 5200, '2026-08-25', '2026-10-09', 'Net 45'),
    iv('INV-2030', 'd9', 'Lumière Skin', 8000, '2026-06-10', '2026-07-25', 'Net 45'),
    iv('INV-2028', 'd12', 'Ostra Swim', 10500, '2026-04-25', '2026-06-24', 'Net 60'),
    iv('INV-2025', 'd13', 'Sola Haircare', 5500, '2026-04-10', '2026-05-25', 'Net 45'),
    iv('INV-2020', 'd10', 'Pell Home', 4200, '2026-03-20', '2026-04-19', 'Net 30'),
    iv('INV-2012', 'd11', 'Fennel Market', 3600, '2025-12-12', '2026-01-11', 'Net 30')
  ];
  const pay = (n: number, inv: string, amount: number, on: string): Payment => ({ id: 'demo-p' + n, invoiceId: 'demo-' + inv, amountCents: c(amount), receivedOn: on, note: '' });
  const payments: Payment[] = [
    pay(1, 'INV-2045', 2000, '2026-10-30'), pay(2, 'INV-2036', 5200, '2026-09-28'), pay(3, 'INV-2030', 8000, '2026-07-15'),
    pay(4, 'INV-2028', 10500, '2026-06-10'), pay(5, 'INV-2025', 5500, '2026-05-30'), pay(6, 'INV-2020', 4200, '2026-04-20'), pay(7, 'INV-2012', 3600, '2026-01-10')
  ];

  // Non-invoiced income by month, Dec 2025 → Nov 2026 (November is month to date), from the design data.
  const months = lastMonths(DEMO_TODAY, 12);
  const monthly: Record<string, number[]> = {
    affiliate: [900, 1500, 700, 800, 900, 1000, 950, 1100, 1000, 1050, 1200, 300],
    digital: [600, 1800, 500, 450, 500, 600, 550, 700, 650, 600, 900, 150],
    appearances: [0, 0, 2500, 0, 0, 3000, 0, 0, 2000, 0, 1500, 0],
    events: [0, 1200, 0, 0, 1500, 0, 0, 1800, 0, 0, 2000, 0],
    other: [200, 250, 150, 200, 150, 250, 200, 250, 150, 200, 250, 50]
  };
  const FROM: Record<string, string> = { affiliate: 'Affiliate programs', digital: 'Preset & guide sales', appearances: 'Speaking & hosting', events: 'Creator meetups', other: 'Platform payouts' };
  const income: IncomeEntry[] = [];
  for (const [stream, arr] of Object.entries(monthly)) arr.forEach((amt, i) => {
    if (amt) income.push({ id: `demo-e-${stream}-${i}`, stream: stream as IncomeEntry['stream'], amountCents: c(amt), receivedOn: `${months[i]}-${months[i] === DEMO_TODAY.slice(0, 7) ? '01' : '18'}`, counterparty: FROM[stream], description: '' });
  });

  const people = Array.from(new Map(deals.map(d => [d.contactEmail, d])).values());
  const FOLLOW: Record<string, string> = { 'jules@arden.example': '2026-10-27', 'devin@brightline.example': '2026-11-03', 'nora@pellhome.example': '2026-11-10', 'sam@junipercoffee.example': '2026-11-02' };
  const ROLE: Record<string, string> = { 'imani@lumiereskin.example': 'Influencer marketing lead', 'marco@tidepool.example': 'Agent, Tidepool Talent', 'renee@halcyon.example': 'Brand partnerships', 'devin@brightline.example': 'Marketing manager', 'nora@pellhome.example': 'Founder' };
  const contacts: Contact[] = people.map(d => ({
    id: contactId(d.contactEmail), brandId: d.brandId, brandName: d.brandName, name: d.contactName, email: d.contactEmail, role: ROLE[d.contactEmail] ?? '', phone: '', notes: '',
    lastContactedOn: deals.filter(x => x.contactEmail === d.contactEmail).map(x => x.lastContactOn).sort().slice(-1)[0], followUpOn: FOLLOW[d.contactEmail] ?? null
  }));

  const t = (id: string, title: string, dueOn: string | null, o: Partial<Task> = {}): Task =>
    ({ id: 'demo-t' + id, title, notes: '', dueOn, status: 'open', priority: 'normal', dealId: null, contactId: null, invoiceId: null, completedAt: null, ...o });
  const tasks: Task[] = [
    t('1', 'Send second payment reminder to Brightline Audio', '2026-11-03', { priority: 'high', dealId: 'demo-d7', contactId: contactId('devin@brightline.example'), invoiceId: 'demo-INV-2041' }),
    t('2', 'Reply to Juniper Coffee with rate card', '2026-11-02', { dealId: 'demo-d4', contactId: contactId('sam@junipercoffee.example') }),
    t('3', 'Send Ostra counter with usage terms in writing', '2026-11-04', { dealId: 'demo-d2', contactId: contactId('marco@tidepool.example') }),
    t('4', 'Upload Glow Season Reel draft to the shared folder', '2026-11-05', { priority: 'high', dealId: 'demo-d1', contactId: contactId('imani@lumiereskin.example'), notes: 'Imani prefers drafts by Thursday.' }),
    t('5', 'Book Savannah travel for the Halcyon stay', '2026-11-07', { dealId: 'demo-d3' }),
    t('6', 'Pitch Pell Home on their holiday collection', '2026-11-10', { contactId: contactId('nora@pellhome.example') }),
    t('7', 'Set aside Q4 estimated tax payment', '2027-01-15', { priority: 'low' }),
    t('8', 'Send Sola Haircare invoice INV-2045', '2026-10-08', { status: 'done', completedAt: '2026-10-08T15:00:00Z', dealId: 'demo-d6', invoiceId: 'demo-INV-2045' })
  ];

  // Contracts (shown only when the contracts flag is on). Fictional terms for the fictional demo creator.
  const k = (o: Partial<Contract>): Contract => ({ id: '', dealId: null, status: 'confirmed', title: '', fileName: '', hasFile: false, brandName: '', feeCents: null, paymentTerms: '', signedOn: null,
    usageRights: '', usageStartsOn: null, usageEndsOn: null, exclusivity: '', exclusivityStartsOn: null, exclusivityEndsOn: null, whitelisting: '', revisions: '', killFee: '', otherTerms: '',
    extracted: null, confirmedAt: '2026-10-01T12:00:00Z', createdAt: '2026-10-01T12:00:00Z', ...o });
  const contracts: Contract[] = [
    k({ id: 'demo-k1', dealId: 'demo-d1', title: 'Glow Season Launch agreement', fileName: 'Lumiere_GlowSeason_Agreement.pdf', brandName: 'Lumière Skin', feeCents: 950000,
      paymentTerms: '50% deposit on signing, balance Net 45 after posting', signedOn: '2026-09-30',
      usageRights: 'Paid social on Instagram and TikTok, brand handles only', usageStartsOn: '2026-10-05', usageEndsOn: '2026-12-03',
      exclusivity: 'No competing skincare partnerships', exclusivityStartsOn: '2026-09-30', exclusivityEndsOn: '2026-11-14',
      whitelisting: 'Allowed for 60 days with prior approval of ad copy', revisions: 'Up to 2 rounds per deliverable', killFee: '50% of the fee if cancelled after signing' }),
    k({ id: 'demo-k2', dealId: 'demo-d3', title: 'Weekend in Savannah creator agreement', fileName: 'Halcyon_Savannah_SOW.pdf', brandName: 'Halcyon Hotels', feeCents: 750000,
      paymentTerms: '50% deposit, balance Net 30', signedOn: '2026-10-14',
      usageRights: 'Organic reposting on brand channels', usageStartsOn: '2026-11-20', usageEndsOn: '2027-05-20',
      exclusivity: 'No competing hotel brands in Savannah', exclusivityStartsOn: '2026-11-14', exclusivityEndsOn: '2026-12-31', revisions: '1 round' }),
    k({ id: 'demo-k3', dealId: 'demo-d9', title: 'Summer SPF agreement', fileName: 'Lumiere_SummerSPF.pdf', brandName: 'Lumière Skin', feeCents: 800000, paymentTerms: 'Net 45', signedOn: '2026-05-20',
      usageRights: 'Paid social, 90 days', usageStartsOn: '2026-06-10', usageEndsOn: '2026-09-08', exclusivity: 'Sunscreen category', exclusivityStartsOn: '2026-05-20', exclusivityEndsOn: '2026-07-20' })
  ];

  return {
    contracts, paymentDetails: 'Bank transfer (ACH) or PayPal. Details sent on request. Please include the invoice number.',
    profile: { displayName: 'Jordan Lee', businessName: 'Jordan Lee Studio LLC', niche: 'Lifestyle & beauty', location: 'Austin, TX', platforms: ['Instagram', 'TikTok', 'YouTube'], followerRange: '100k–250k',
      revenueStreams: ['Brand partnerships', 'Affiliate', 'Digital products', 'Appearances'], hasManager: false, businessStructure: 'LLC', priority: 'Build more predictable income', onboardingStep: 4, onboardingCompletedAt: DEMO_TODAY },
    input: {
      today: DEMO_TODAY, deals, invoices, payments, income, contacts, tasks,
      expenses: [['Editing & retouching', 6800, '2026-09-15'], ['Travel', 4200, '2026-06-20'], ['Props & wardrobe', 3900, '2026-10-05'], ['Equipment', 2600, '2026-02-11'], ['Software & subscriptions', 1100, '2026-01-03']]
        .map(([category, amt, on], i) => ({ id: 'demo-x' + i, category: category as string, amountCents: c(amt as number), spentOn: on as string, note: '' })),
      goals: { monthlyCents: c(10000), annualCents: c(125000) },
      opportunities: [
        { id: 'demo-o1', name: 'Pell Home', category: 'Past brand renewal', location: '', fit: 'Paid $4,200 in April, on time. Nora mentioned a holiday collection.', source: 'Your records · Spring Refresh', angle: 'Pitch a holiday guest-room refresh before mid-November.', status: 'new' },
        { id: 'demo-o2', name: 'Fennel Market', category: 'Past brand renewal', location: 'Austin, TX', fit: 'Holiday Hosting TikTok last December, paid within Net 30.', source: 'Your records · Holiday Hosting', angle: 'Offer a repeat holiday hosting series with a Stories add-on.', status: 'saved' },
        { id: 'demo-o3', name: 'Studio Atlas Conference', category: 'Speaking opportunity', location: 'Austin, TX', fit: 'You spoke at their September panel ($1,500).', source: 'Your records · INV-2039', angle: 'Ask about the spring lineup once the current invoice is paid.', status: 'new' },
        { id: 'demo-o4', name: 'Lumière Skin affiliate program', category: 'Affiliate opportunity', location: '', fit: 'Two campaigns with Lumière. Affiliate is your second-largest stream.', source: 'Added by you · program terms not verified', angle: 'Ask to add an affiliate code to the Glow Season content.', status: 'new' }
      ],
      audience: ([['Instagram', 118000, 142000, 4.6, 52000], ['TikTok', 71000, 98000, 6.1, 64000], ['YouTube', 18100, 24000, 3.4, 17500]] as [string, number, number, number, number][]).flatMap(([platform, a, b, eng, views]) => [
        { id: `demo-a-${platform}-0`, platform, followers: a, engagementRate: eng, avgViews: views, capturedOn: '2025-12-01' },
        { id: `demo-a-${platform}-1`, platform, followers: b, engagementRate: eng, avgViews: views, capturedOn: '2026-10-30' }]),
      categories: []
    }
  };
}
