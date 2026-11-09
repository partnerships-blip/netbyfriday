// Turns the AI's proposal (from a message or screenshot) into editable agreement terms. Proposals only: the creator
// reviews and edits every term before anything is signed or sent. Money is parsed by the finance engine.
import { feeToCents } from '../ai/contracts';
import type { ContractExtraction } from '../types';
import { EMPTY_TERMS, type AgreementTerms } from './template';

export function extractionToTerms(x: ContractExtraction | null, ctx: { creatorName: string; creatorEmail: string; deal?: { brandName: string; campaign: string; feeCents: number } | null }): AgreementTerms {
  const v = (k: keyof ContractExtraction['fields']) => (x?.fields[k]?.value ?? '').trim();
  const feeCents = v('fee') ? feeToCents(v('fee')) : null;
  const dealFee = ctx.deal && ctx.deal.feeCents > 0 ? ctx.deal.feeCents : null;
  const fee = feeCents ?? dealFee;
  const email = v('contactEmail');
  return {
    ...EMPTY_TERMS,
    creatorName: ctx.creatorName, creatorEmail: ctx.creatorEmail,
    brandName: v('brandName') || ctx.deal?.brandName || '',
    brandSignerName: v('contactName'), brandSignerEmail: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : '',
    campaign: v('campaign') || v('title') || ctx.deal?.campaign || '',
    fee: fee === null ? '' : (fee / 100).toFixed(2),
    paymentTerms: v('paymentTerms'),
    deliverables: (x?.deliverables ?? []).map(d => ({ name: d.name, dueOn: d.dueOn ?? '' })),
    usageRights: v('usageRights'), usageDays: v('usageDays'),
    exclusivity: v('exclusivity'), exclusivityDays: v('exclusivityDays'),
    whitelisting: v('whitelisting'), revisions: v('revisions'), approval: v('approval'), killFee: v('killFee'), otherTerms: v('otherTerms')
  };
}
