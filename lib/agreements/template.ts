// The creator partnership agreement template. Plain-English, fixed wording: the app fills in the creator's reviewed terms.
// The AI never writes any of this text. The template is provided as a starting point, not legal advice; see docs/AGREEMENTS.md
// (it should be reviewed by a lawyer before the 'agreements' flag is turned on for everyone).
import { parseMoneyToCents, formatCentsExact } from '../finance/core.js';

export interface AgreementTerms {
  creatorName: string; creatorEmail: string;
  brandName: string; brandSignerName: string; brandSignerEmail: string;
  campaign: string;
  fee: string;                    // dollars as typed and normalized, e.g. "4200.00"; parsed by the engine
  paymentTerms: string;
  deliverables: { name: string; dueOn: string }[];
  usageRights: string; usageDays: string;
  exclusivity: string; exclusivityDays: string;
  whitelisting: string; revisions: string; approval: string; killFee: string; otherTerms: string; governingLaw: string;
}

export const EMPTY_TERMS: AgreementTerms = {
  creatorName: '', creatorEmail: '', brandName: '', brandSignerName: '', brandSignerEmail: '', campaign: '', fee: '', paymentTerms: '',
  deliverables: [], usageRights: '', usageDays: '', exclusivity: '', exclusivityDays: '', whitelisting: '', revisions: '', approval: '',
  killFee: '', otherTerms: '', governingLaw: ''
};

export interface RenderedAgreement { title: string; intro: string; sections: { heading: string; lines: string[] }[] }

const longDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const end = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + '.');
const days = (n: string) => (n ? `${n} day${n === '1' ? '' : 's'}` : '');

/** "Brand x Creator", e.g. "Honey Hair Co. x Poca". Falls back while either name is still missing. */
export function partnershipTitle(brand: string, creator: string, fallback = 'Creator Partnership Agreement') {
  const b = brand.trim(), c = creator.trim();
  return b && c ? `${b} x ${c}` : b ? `${b} x Creator` : c ? `Brand x ${c}` : fallback;
}
export function agreementTitle(t: AgreementTerms) {
  return partnershipTitle(t.brandName, t.creatorName);
}

/** Required before the agreement can be signed and sent. */
export function missingRequired(t: AgreementTerms): string[] {
  const m: string[] = [];
  if (!t.creatorName.trim()) m.push('Your name');
  if (!t.brandName.trim()) m.push('Brand name');
  if (parseMoneyToCents(t.fee) === null) m.push('Fee');
  if (!t.paymentTerms.trim()) m.push('Payment terms');
  if (!t.deliverables.some(d => d.name.trim())) m.push('At least one deliverable');
  return m;
}

/** Worth adding, but the agreement can go out without them (the template uses a stated fallback). */
export function suggestions(t: AgreementTerms): string[] {
  const s: string[] = [];
  if (t.deliverables.some(d => d.name.trim() && !d.dueOn)) s.push('A publish date for every deliverable (otherwise: a date both sides agree in writing)');
  if (!t.usageRights.trim()) s.push('Usage rights (otherwise: the brand may only reshare the posts organically, with credit)');
  if (!t.killFee.trim()) s.push('A kill fee (otherwise: the brand pays for work already completed if it cancels)');
  if (!t.brandSignerEmail.trim()) s.push('The brand signer’s email, so you can send the link');
  return s;
}

export function renderAgreement(t: AgreementTerms): RenderedAgreement {
  const creator = t.creatorName.trim() || '[Creator name]';
  const brand = t.brandName.trim() || '[Brand name]';
  const fee = parseMoneyToCents(t.fee);
  const sections: { heading: string; lines: string[] }[] = [];

  const work = t.deliverables.filter(d => d.name.trim()).map(d => `• ${d.name.trim()}: publish ${d.dueOn ? `by ${longDate(d.dueOn)}` : 'on a date both parties agree in writing'}`);
  sections.push({ heading: 'The work', lines: [
    `Creator will create and publish the following content for Brand${t.campaign.trim() ? ` for the ${t.campaign.trim()} campaign` : ''}:`,
    ...(work.length ? work : ['• [Deliverables]']),
    `Creator will share each piece with Brand for review before it is published.${t.approval.trim() ? ' ' + end(t.approval) : ''}${t.revisions.trim() ? ` Revisions: ${end(t.revisions)}` : ' Brand may ask for reasonable revisions within the scope above.'}`
  ] });

  sections.push({ heading: 'Fee and payment', lines: [
    `Brand will pay Creator a total fee of ${fee === null ? '[fee]' : formatCentsExact(fee)} (US dollars) for the work above.`,
    `Payment terms: ${end(t.paymentTerms.trim() || '[payment terms]')}`,
    'Creator will invoice Brand for the fee, and Brand will pay each invoice according to these payment terms.'
  ] });

  sections.push({ heading: 'Ownership and usage rights', lines: [
    'Creator owns the content Creator makes under this Agreement.',
    t.usageRights.trim()
      ? `Creator gives Brand a non-exclusive license to use the published content as follows: ${t.usageRights.trim().replace(/\.$/, '')}${t.usageDays ? `, for ${days(t.usageDays)} from the date each piece is first published` : ''}.`
      : 'Brand may reshare the published content on its own social media accounts, with credit to Creator. Paid advertising or any other use needs Creator’s written agreement.',
    ...(t.whitelisting.trim() ? [`Paid amplification: ${end(t.whitelisting)}`] : []),
    'Any use beyond what is stated here needs Creator’s written agreement and may require an additional fee.'
  ] });

  sections.push({ heading: 'Exclusivity', lines: [
    t.exclusivity.trim()
      ? `${t.exclusivity.trim().replace(/\.$/, '')}${t.exclusivityDays ? `, for ${days(t.exclusivityDays)}` : ''}.`
      : 'None. Creator may work with other brands, including Brand’s competitors.'
  ] });

  sections.push({ heading: 'Cancellation', lines: [
    t.killFee.trim() ? `If Brand cancels after this Agreement is signed: ${end(t.killFee)}` : 'If Brand cancels after this Agreement is signed, Brand will pay Creator for the work already completed.'
  ] });

  sections.push({ heading: 'Disclosure', lines: ['Creator will clearly disclose the paid partnership in each post, as the FTC Endorsement Guides require (for example, with #ad or the platform’s paid-partnership label).'] });
  sections.push({ heading: 'Independent contractor', lines: ['Creator is an independent contractor, not Brand’s employee, and is responsible for Creator’s own taxes.'] });
  if (t.otherTerms.trim()) sections.push({ heading: 'Other terms', lines: t.otherTerms.trim().split(/\n+/).map(end) });
  if (t.governingLaw.trim()) sections.push({ heading: 'Governing law', lines: [`This Agreement is governed by the laws of ${t.governingLaw.trim().replace(/\.$/, '')}.`] });
  sections.push({ heading: 'Entire agreement and signatures', lines: [
    'This Agreement is the entire agreement between Creator and Brand about this work. Any change must be in writing and agreed by both parties.',
    'Both parties agree to sign this Agreement electronically. An electronic signature has the same effect as a handwritten one.'
  ] });

  return {
    title: agreementTitle(t),
    intro: `This Creator Partnership Agreement (the “Agreement”) is between ${creator} (“Creator”) and ${brand} (“Brand”). It takes effect on the date both parties have signed it.`,
    sections
  };
}

/** The exact text that is frozen, fingerprinted (SHA-256) and signed. */
export function agreementText(r: RenderedAgreement): string {
  return [r.title, r.intro, ...r.sections.map((s, i) => `${i + 1}. ${s.heading}\n${s.lines.join('\n')}`)].join('\n\n');
}

/** Reads a frozen agreement text back into title, intro and numbered sections for display. */
export function parseAgreementText(body: string): RenderedAgreement {
  const blocks = body.split('\n\n');
  const [title = '', intro = '', ...rest] = blocks;
  return { title, intro, sections: rest.map(b => { const [h, ...lines] = b.split('\n'); return { heading: h.replace(/^\d+\.\s*/, ''), lines }; }) };
}
