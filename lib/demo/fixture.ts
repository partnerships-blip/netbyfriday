// Fictional demo workspace. Read-only, never written to the database. All names and figures are invented.
import type { CoreInput, Deal, Invoice, Payment, IncomeEntry, Profile } from '../types';
import { lastMonths } from '../finance/core.js';

const TODAY = '2026-10-22';
const c = (dollars: number) => Math.round(dollars * 100);

export function demoData(): { input: CoreInput; profile: Profile } {
  const del = (dealId: string, id: string, name: string, dueOn: string, status: any, notes = '') => ({ id, dealId, name, dueOn, status, notes });
  const d = (o: Partial<Deal> & { id: string; brandName: string }): Deal => ({
    brandId: 'b-' + o.brandName, agency: '', contactName: '', contactEmail: '', campaign: '', description: '', feeCents: 0, feeIsEstimate: false, stage: 'paid',
    platforms: ['Instagram'], contentCategory: '', contractStatus: 'Signed', usageRights: '30 days organic', exclusivity: 'None', paymentTerms: 'Net 30', notes: '',
    startedOn: TODAY, completedOn: null, lastContactOn: TODAY, deliverables: [], attachments: [], ...o
  });
  const deals: Deal[] = [
    d({ id: 'demo-d1', brandName: 'Hearth & Field', contactName: 'Priya Shah', contactEmail: 'priya@hearthfield.example', campaign: 'Fall Harvest Series', description: 'Three-part olive oil recipe series for the fall harvest pressing.', feeCents: c(6500), stage: 'in_progress', platforms: ['Instagram', 'TikTok'], contentCategory: 'Weeknight recipe tutorials', paymentTerms: '50% on signing, 50% Net 30 after posting', exclusivity: 'No competing olive oil brands for 30 days', notes: 'Prefers drafts via shared folder.', startedOn: '2026-09-12', lastContactOn: '2026-10-19',
      deliverables: [del('demo-d1', 'x1', '1 Instagram Reel', '2026-10-24', 'in_review', 'Draft sent Oct 19'), del('demo-d1', 'x2', '2 Instagram Stories', '2026-10-26', 'not_started'), del('demo-d1', 'x3', '1 TikTok Video', '2026-10-29', 'not_started'), del('demo-d1', 'x4', '30 days organic usage', '2026-11-28', 'scheduled')] }),
    d({ id: 'demo-d2', brandName: 'Copperline Cookware', agency: 'Oakline Agency', contactName: 'Marcus Bell', contactEmail: 'marcus@oakline.example', campaign: 'Holiday Gifting Guide', feeCents: c(8000), stage: 'negotiating', platforms: ['Instagram', 'YouTube'], contractStatus: 'Not sent', usageRights: 'Requested 90 days paid usage', exclusivity: 'Requested 60 days category exclusivity', paymentTerms: 'Net 45', notes: 'Opened at $6,000. Countered at $8,000 including 90 days usage.', startedOn: '2026-10-06', lastContactOn: '2026-10-15' }),
    d({ id: 'demo-d3', brandName: 'Brightmill Flour', contactName: 'Dana Ruiz', contactEmail: 'dana@brightmill.example', campaign: 'Bake Week', feeCents: c(3200), stage: 'in_progress', contentCategory: 'Baking', startedOn: '2026-09-20', lastContactOn: '2026-10-10',
      deliverables: [del('demo-d3', 'x7', '1 Instagram Reel', '2026-10-08', 'approved'), del('demo-d3', 'x8', '3 Instagram Stories', '2026-10-09', 'approved')] }),
    d({ id: 'demo-d4', brandName: 'Saltgrass Market', contactName: 'Elena Park', contactEmail: 'elena@saltgrass.example', campaign: 'Supper Club Presenting Sponsor', feeCents: c(4500), stage: 'contracted', contentCategory: 'Supper club & events', paymentTerms: 'Net 15 after event', startedOn: '2026-10-01', lastContactOn: '2026-10-14',
      deliverables: [del('demo-d4', 'x9', 'Supper club event (Nov 8)', '2026-11-08', 'scheduled', '48 seats'), del('demo-d4', 'x10', '1 Instagram Reel recap', '2026-11-12', 'not_started')] }),
    d({ id: 'demo-d5', brandName: 'Tidewater Coffee', contactName: 'Sam Ortiz', contactEmail: 'sam@tidewater.example', campaign: 'Winter blend launch', feeCents: c(2500), feeIsEstimate: true, stage: 'lead', contractStatus: '', startedOn: '2026-10-18', lastContactOn: '2026-10-18' }),
    d({ id: 'demo-d6', brandName: 'Verde Kitchen Co.', contactName: 'Jonah Lee', contactEmail: 'jonah@verde.example', campaign: 'Meal prep containers', feeCents: c(3800), stage: 'negotiating', contractStatus: 'Sent Oct 16, awaiting signature', startedOn: '2026-10-02', lastContactOn: '2026-10-16',
      deliverables: [del('demo-d6', 'x11', '2 TikTok Videos', '2026-11-15', 'not_started')] }),
    d({ id: 'demo-d7', brandName: 'Northfold Spices', contactName: 'Ari Cohen', contactEmail: 'ari@northfold.example', campaign: 'Summer grilling rubs', feeCents: c(4200), stage: 'completed', contentCategory: 'Weeknight recipe tutorials', notes: 'Invoice sent Aug 28. Reminder sent Oct 2.', startedOn: '2026-07-15', completedOn: '2026-08-26', lastContactOn: '2026-10-02' }),
    d({ id: 'demo-d8', brandName: 'Lumen Appliances', agency: 'Fieldhouse Talent', campaign: 'Countertop oven launch', feeCents: c(5500), contentCategory: 'Kitchen tools & gear', startedOn: '2026-06-10', completedOn: '2026-07-21', lastContactOn: '2026-08-20' }),
    d({ id: 'demo-d9', brandName: 'Hearth & Field', contactName: 'Priya Shah', campaign: 'Summer Salads', feeCents: c(5000), contentCategory: 'Weeknight recipe tutorials', startedOn: '2026-05-02', completedOn: '2026-06-04', lastContactOn: '2026-06-30' }),
    d({ id: 'demo-d10', brandName: 'Brightmill Flour', contactName: 'Dana Ruiz', campaign: 'Spring Baking', feeCents: c(2800), contentCategory: 'Baking', startedOn: '2026-03-10', completedOn: '2026-04-02', lastContactOn: '2026-05-01' }),
    d({ id: 'demo-d11', brandName: 'Brightmill Flour', contactName: 'Dana Ruiz', campaign: 'Holiday Cookies', feeCents: c(2400), contentCategory: 'Baking', startedOn: '2025-11-15', completedOn: '2025-12-05', lastContactOn: '2026-01-06' }),
    d({ id: 'demo-d12', brandName: 'Orchard Row Cider', contactName: 'Will Grant', campaign: 'Cider pairing dinner', feeCents: c(3600), contentCategory: 'Supper club & events', notes: 'Mentioned a spring release.', startedOn: '2025-12-20', completedOn: '2026-01-24', lastContactOn: '2026-02-05' }),
    d({ id: 'demo-d13', brandName: 'Ferment Lab', campaign: 'Kombucha kit', feeCents: c(1500), stage: 'lost', notes: 'Offered $800 for 3 videos.', startedOn: '2026-09-02', lastContactOn: '2026-09-05' })
  ];
  const iv = (id: string, number: string, dealId: string | null, clientName: string, amount: number, issuedOn: string, dueOn: string, stream: any = 'brand'): Invoice =>
    ({ id, number, dealId, clientName, description: '', stream, amountCents: c(amount), issuedOn, dueOn, terms: 'Net 30', voidedAt: null });
  const invoices: Invoice[] = [
    iv('demo-i1', 'INV-1041', 'demo-d7', 'Northfold Spices', 4200, '2026-08-28', '2026-09-27'),
    iv('demo-i2', 'INV-1042', null, 'Chicago Culinary Center', 1500, '2026-09-15', '2026-10-15', 'appearances'),
    iv('demo-i3', 'INV-1044', 'demo-d3', 'Brightmill Flour', 3200, '2026-10-10', '2026-11-09'),
    iv('demo-i4', 'INV-1045', 'demo-d1', 'Hearth & Field', 3250, '2026-10-01', '2026-10-31'),
    iv('demo-i5', 'INV-1038', 'demo-d8', 'Lumen Appliances', 5500, '2026-07-21', '2026-08-20'),
    iv('demo-i6', 'INV-1033', 'demo-d9', 'Hearth & Field', 5000, '2026-06-04', '2026-07-04'),
    iv('demo-i7', 'INV-1030', 'demo-d10', 'Brightmill Flour', 2800, '2026-04-02', '2026-05-02'),
    iv('demo-i8', 'INV-1027', 'demo-d11', 'Brightmill Flour', 2400, '2025-12-05', '2026-01-04'),
    iv('demo-i9', 'INV-1029', 'demo-d12', 'Orchard Row Cider', 3600, '2026-01-24', '2026-02-08')
  ];
  const payments: Payment[] = [
    { id: 'demo-p1', invoiceId: 'demo-i2', amountCents: c(500), receivedOn: '2026-10-03', note: 'Partial' },
    { id: 'demo-p2', invoiceId: 'demo-i5', amountCents: c(5500), receivedOn: '2026-08-20', note: '' },
    { id: 'demo-p3', invoiceId: 'demo-i6', amountCents: c(5000), receivedOn: '2026-06-30', note: '' },
    { id: 'demo-p4', invoiceId: 'demo-i7', amountCents: c(2800), receivedOn: '2026-05-01', note: '' },
    { id: 'demo-p5', invoiceId: 'demo-i8', amountCents: c(2400), receivedOn: '2026-01-06', note: '' },
    { id: 'demo-p6', invoiceId: 'demo-i9', amountCents: c(3600), receivedOn: '2026-02-05', note: '' }
  ];
  // Direct (non-invoiced) income by month, Nov 2025 → Oct 2026.
  const months = lastMonths(TODAY, 12);
  const monthly: Record<string, number[]> = {
    events: [2400, 3200, 0, 1800, 2200, 2600, 3000, 2400, 0, 2800, 3200, 2400],
    digital: [1100, 2600, 900, 700, 800, 650, 700, 600, 750, 900, 1200, 700],
    affiliate: [900, 1400, 700, 650, 700, 800, 750, 900, 850, 800, 950, 600],
    appearances: [0, 0, 1500, 0, 0, 2000, 0, 0, 2500, 0, 0, 0],
    brand: [1800, 1400, 0, 3000, 2400, 2000, 3500, 1000, 4500, 0, 5500, 0],
    other: [200, 300, 150, 200, 150, 250, 200, 300, 150, 200, 250, 150]
  };
  const income: IncomeEntry[] = [];
  for (const [stream, arr] of Object.entries(monthly)) arr.forEach((amt, i) => {
    if (!amt) return;
    const day = months[i] === TODAY.slice(0, 7) ? '15' : '20';
    income.push({ id: `demo-e-${stream}-${i}`, stream: stream as any, amountCents: c(amt), receivedOn: `${months[i]}-${day}`, counterparty: stream === 'brand' ? 'Platform creator fund' : '', description: stream === 'events' ? 'Supper club tickets' : stream === 'digital' ? 'Recipe e-book sales' : '' });
  });
  return {
    profile: { displayName: 'Noor Haddad', businessName: 'Noor Cooks', niche: 'Food & cooking', location: 'Chicago, IL', platforms: ['Instagram', 'TikTok', 'YouTube'], followerRange: '100k–250k',
      revenueStreams: ['Brand partnerships', 'Events', 'Digital products', 'Affiliate', 'Appearances'], hasManager: false, businessStructure: 'LLC', priority: 'Build more predictable income', onboardingStep: 4, onboardingCompletedAt: TODAY },
    input: {
      today: TODAY, deals, invoices, payments, income,
      expenses: [['Ingredients & props', 6200], ['Event venue & staff', 9800], ['Video editor (contract)', 7200], ['Equipment', 3100], ['Software & subscriptions', 1400], ['Travel', 900]].map(([category, amt], i) => ({ id: 'demo-x' + i, category: category as string, amountCents: c(amt as number), spentOn: '2026-09-30', note: '' })),
      goals: { monthlyCents: c(10000), annualCents: c(130000) },
      opportunities: [
        { id: 'demo-o1', name: 'Orchard Row Cider', category: 'Past brand renewal', location: 'Chicago, IL', fit: 'Paid $3,600 for a supper club pairing in January. Contact mentioned a spring release.', source: 'Your records · Cider pairing dinner', angle: 'Propose a winter pairing dinner ahead of their spring release.', status: 'new' },
        { id: 'demo-o2', name: 'Brightmill Flour', category: 'Past brand renewal', location: '', fit: 'Three paid campaigns in 12 months, rising from $2,400 to $3,200.', source: 'Your records · 3 campaigns', angle: 'Pitch a holiday baking series instead of a single Reel.', status: 'saved' },
        { id: 'demo-o3', name: 'Holiday supper club', category: 'Creator-led event', location: 'Chicago, IL', fit: 'Supper club ticket income recorded in 10 of the last 12 months.', source: 'Your records · events income', angle: 'Add a December date with a presenting sponsor.', status: 'new' },
        { id: 'demo-o4', name: 'Copperline Cookware affiliate', category: 'Affiliate opportunity', location: '', fit: 'You already feature their pans in recipes.', source: 'Added by you · program terms not verified', angle: 'Ask to bundle an affiliate code into the gifting deal.', status: 'new' }
      ],
      audience: [['Instagram', [78100, 84200], 4.1, 38000], ['TikTok', [104000, 126000], 5.6, 61000], ['YouTube', [17200, 21400], 3.2, 14500]].flatMap(([platform, [a, b], eng, views]: any) => [
        { id: `demo-a-${platform}-0`, platform, followers: a, engagementRate: eng, avgViews: views, capturedOn: '2025-11-01' },
        { id: `demo-a-${platform}-1`, platform, followers: Math.round((a + b) / 2), engagementRate: eng, avgViews: views, capturedOn: '2026-05-01' },
        { id: `demo-a-${platform}-2`, platform, followers: b, engagementRate: eng, avgViews: views, capturedOn: '2026-10-20' }]),
      categories: [{ id: 'demo-c1', name: 'Weeknight recipe tutorials', avgViews: 72000, posts: 42 }, { id: 'demo-c2', name: 'Supper club & events', avgViews: 29000, posts: 18 }, { id: 'demo-c3', name: 'Baking', avgViews: 51000, posts: 20 }, { id: 'demo-c4', name: 'Kitchen tools & gear', avgViews: 34000, posts: 12 }]
    }
  };
}
