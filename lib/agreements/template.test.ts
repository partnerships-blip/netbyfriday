import { describe, it, expect } from 'vitest';
import { EMPTY_TERMS, renderAgreement, agreementText, parseAgreementText, missingRequired, suggestions, type AgreementTerms } from './template';
import { extractionToTerms } from './terms';
import { AgreementTermsSchema, AgreementSendSchema } from '../validation';

const terms: AgreementTerms = {
  ...EMPTY_TERMS, creatorName: 'Casey Test', creatorEmail: 'casey@test.dev', brandName: 'Petalwear', brandSignerName: 'Jordan Lee', brandSignerEmail: 'jordan@petalwear.test',
  campaign: 'Spring Capsule', fee: '4200.00', paymentTerms: 'Net 30 after the posts go live',
  deliverables: [{ name: '1 Instagram Reel', dueOn: '2026-12-05' }, { name: '3 Instagram Stories', dueOn: '' }],
  usageRights: "Organic reposting on Petalwear's channels", usageDays: '60'
};

describe('agreement template', () => {
  it('fills in the creator’s terms with engine-formatted money and long dates', () => {
    const text = agreementText(renderAgreement(terms));
    expect(text.startsWith('Petalwear x Casey Test\n')).toBe(true);
    expect(text).toContain('between Casey Test (“Creator”) and Petalwear (“Brand”)');
    expect(text).toContain('a total fee of $4,200 (US dollars)');
    expect(text).toContain('• 1 Instagram Reel: publish by December 5, 2026');
    expect(text).toContain('• 3 Instagram Stories: publish on a date both parties agree in writing');
    expect(text).toContain("as follows: Organic reposting on Petalwear's channels, for 60 days from the date each piece is first published.");
  });
  it('uses stated, creator-protective fallbacks when a term is missing', () => {
    const text = agreementText(renderAgreement(terms));
    expect(text).toContain('None. Creator may work with other brands');                          // no exclusivity given
    expect(text).toContain('Brand will pay Creator for the work already completed');              // no kill fee given
    const noUsage = agreementText(renderAgreement({ ...terms, usageRights: '', usageDays: '' }));
    expect(noUsage).toContain('Paid advertising or any other use needs Creator’s written agreement');
  });
  it('lists what must be filled in before sending, and what is worth adding', () => {
    expect(missingRequired(terms)).toEqual([]);
    expect(missingRequired(EMPTY_TERMS)).toEqual(['Your name', 'Brand name', 'Fee', 'Payment terms', 'At least one deliverable']);
    expect(suggestions(terms).some(s => s.startsWith('A publish date'))).toBe(true);
    expect(suggestions(terms).some(s => s.startsWith('A kill fee'))).toBe(true);
  });
  it('the frozen text reads back into the same numbered sections', () => {
    const r = renderAgreement(terms);
    const back = parseAgreementText(agreementText(r));
    expect(back.title).toBe(r.title);
    expect(back.intro).toBe(r.intro);
    expect(back.sections.map(s => s.heading)).toEqual(r.sections.map(s => s.heading));
    expect(back.sections[1].lines).toEqual(r.sections[1].lines);
  });
});

describe('terms from the AI proposal', () => {
  it('parses the fee with the engine and falls back to the partnership', () => {
    const t = extractionToTerms({ source: 'text', fields: { fee: { value: '$4,200', quote: 'Budget is $4,200 total' }, contactEmail: { value: 'not-an-email', quote: '' } }, deliverables: [], warnings: [] },
      { creatorName: 'Casey', creatorEmail: 'c@test.dev', deal: { brandName: 'Petalwear', campaign: 'Spring', feeCents: 990000 } });
    expect(t.fee).toBe('4200.00');
    expect(t.brandName).toBe('Petalwear');
    expect(t.campaign).toBe('Spring');
    expect(t.brandSignerEmail).toBe('');                                                      // invalid email is dropped, not guessed
    const noFee = extractionToTerms(null, { creatorName: 'Casey', creatorEmail: '', deal: { brandName: 'Petalwear', campaign: '', feeCents: 990000 } });
    expect(noFee.fee).toBe('9900.00');
  });
});

describe('agreement validation', () => {
  it('normalizes the fee and rejects bad emails and amounts', () => {
    expect(AgreementTermsSchema.parse({ fee: '4,200' }).fee).toBe('4200.00');
    expect(() => AgreementTermsSchema.parse({ fee: 'four grand' })).toThrow();
    expect(() => AgreementTermsSchema.parse({ brandSignerEmail: 'jordan@' })).toThrow();
    expect(AgreementTermsSchema.parse({ deliverables: [{ name: '', dueOn: '' }, { name: '1 Reel', dueOn: '2026-12-05' }] }).deliverables).toHaveLength(1);
  });
  it('sending needs a typed signature and consent', () => {
    const id = '11111111-1111-4111-8111-111111111111';
    expect(() => AgreementSendSchema.parse({ id, signature: 'Casey Test', consent: false })).toThrow();
    expect(() => AgreementSendSchema.parse({ id, signature: 'C', consent: true })).toThrow();
    expect(AgreementSendSchema.parse({ id, signature: 'Casey Test', consent: true }).signature).toBe('Casey Test');
  });
});

describe('reading a long email thread', () => {
  it('never turns a monthly rate into the total fee, and flags a missing deliverables list', async () => {
    const { parseExtraction } = await import('../ai/contracts');
    const thread = 'The monthly partnership rate would remain at $3,000. We would love 2 of the 4 monthly Story posts to be photo-based.';
    const x = parseExtraction(JSON.stringify({ fields: { fee: { value: '$3,000 monthly', quote: 'The monthly partnership rate would remain at $3,000' } }, deliverables: [] }), 'text', thread);
    expect(x.fields.fee).toBeUndefined();
    expect(x.warnings.some(w => w.includes('written as a rate'))).toBe(true);
    expect(x.warnings).toContain('No deliverables were found. Add each piece of content before sending.');
    const ok = parseExtraction(JSON.stringify({ fields: { fee: { value: '$6,000', quote: 'x' } }, deliverables: [{ name: '4 Instagram Stories (November), 2 photo-based', dueOn: null, quote: 'the 4 monthly Story posts' }] }), 'text', thread);
    expect(ok.fields.fee?.value).toBe('$6,000');
    expect(ok.deliverables[0]).toMatchObject({ name: '4 Instagram Stories (November), 2 photo-based', found: true });
    expect(ok.warnings).not.toContain('No deliverables were found. Add each piece of content before sending.');
  });
  it('tells the AI to keep deliverables that have no exact count', async () => {
    const { AGREEMENT_SYSTEM } = await import('../ai/agreements');
    expect(AGREEMENT_SYSTEM).toContain('(number not stated)');
    expect(AGREEMENT_SYSTEM).toContain('latest version both sides accepted');
  });
});

describe('fees with more than one amount', () => {
  it('never glues "$3,000 … and $3,000 …" into $30,003,000', async () => {
    const { parseExtraction } = await import('../ai/contracts');
    const x = parseExtraction(JSON.stringify({ fields: { fee: { value: '$3,000 for November and $3,000 for December', quote: '' } }, deliverables: [{ name: '1 Reel', quote: '' }] }), 'text', '');
    expect(x.fields.fee).toBeUndefined();
    expect(x.warnings.some(w => w.startsWith('The fee lists more than one amount'))).toBe(true);
    const one = parseExtraction(JSON.stringify({ fields: { fee: { value: '$6,000 for 2 months', quote: '' } }, deliverables: [{ name: '1 Reel', quote: '' }] }), 'text', '');
    expect(one.fields.fee?.value).toBe('$6,000 for 2 months');
    expect(extractionToTerms(one, { creatorName: 'Poca', creatorEmail: '' }).fee).toBe('6000.00');
  });
});
