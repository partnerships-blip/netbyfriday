import type { FieldSpec } from './FormModal';
import { STAGES } from '@/lib/finance/core.js';
import { STREAM_LABEL } from '@/lib/brand';

const stageOpts = STAGES.map(([v, l]) => ({ v, l }));
const streamOpts = Object.entries(STREAM_LABEL).map(([v, l]) => ({ v, l }));

export const dealFields: FieldSpec[] = [
  { name: 'brand', label: 'Brand', required: true }, { name: 'campaign', label: 'Campaign' },
  { name: 'agency', label: 'Agency' }, { name: 'contactName', label: 'Contact person' }, { name: 'contactEmail', label: 'Contact email', type: 'email' },
  { name: 'fee', label: 'Fee ($)', type: 'money' }, { name: 'feeIsEstimate', label: 'This fee is my estimate, not an offer', type: 'checkbox' },
  { name: 'stage', label: 'Stage', type: 'select', options: stageOpts }, { name: 'paymentTerms', label: 'Payment terms', placeholder: 'Net 30' },
  { name: 'contentCategory', label: 'Content category' }, { name: 'contractStatus', label: 'Contract status' },
  { name: 'usageRights', label: 'Usage rights' }, { name: 'exclusivity', label: 'Exclusivity terms' },
  { name: 'description', label: 'Campaign description', type: 'area' }, { name: 'notes', label: 'Notes', type: 'area' }
];
export const invoiceFields = (deals: { id: string; label: string }[]): FieldSpec[] => [
  { name: 'clientName', label: 'Client', required: true }, { name: 'amount', label: 'Amount ($)', type: 'money', required: true },
  { name: 'dealId', label: 'Partnership (optional)', type: 'select', options: [{ v: '', l: 'Not linked' }, ...deals.map(d => ({ v: d.id, l: d.label }))] },
  { name: 'stream', label: 'Revenue source', type: 'select', options: streamOpts },
  { name: 'issuedOn', label: 'Issue date', type: 'date', required: true }, { name: 'dueOn', label: 'Due date', type: 'date', required: true },
  { name: 'terms', label: 'Payment terms', type: 'select', options: ['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on receipt'] },
  { name: 'description', label: 'Description', full: true }
];
export const paymentFields: FieldSpec[] = [{ name: 'amount', label: 'Amount received ($)', type: 'money', required: true }, { name: 'receivedOn', label: 'Date received', type: 'date', required: true }, { name: 'note', label: 'Note', full: true }];
export const incomeFields: FieldSpec[] = [
  { name: 'stream', label: 'Source', type: 'select', options: streamOpts.filter(s => s.v !== 'brand').concat([{ v: 'brand', l: 'Brand (not invoiced)' }]) },
  { name: 'amount', label: 'Amount received ($)', type: 'money', required: true }, { name: 'receivedOn', label: 'Date received', type: 'date', required: true },
  { name: 'counterparty', label: 'From (optional)' }, { name: 'description', label: 'Description', full: true }
];
export const expenseFields: FieldSpec[] = [{ name: 'category', label: 'Category', required: true }, { name: 'amount', label: 'Amount ($)', type: 'money', required: true }, { name: 'spentOn', label: 'Date', type: 'date', required: true }, { name: 'note', label: 'Note', full: true }];
export const goalFields: FieldSpec[] = [{ name: 'monthly', label: 'Monthly goal ($)', type: 'money' }, { name: 'annual', label: 'Annual goal ($)', type: 'money' }];
export const oppFields: FieldSpec[] = [
  { name: 'name', label: 'Company or opportunity', required: true },
  { name: 'category', label: 'Category', type: 'select', options: ['Past brand renewal', 'Potential new brand outreach', 'Product launch', 'Local event or activation', 'Creator appearance', 'Affiliate opportunity', 'Speaking opportunity', 'Creator-led event'] },
  { name: 'location', label: 'Location' }, { name: 'source', label: 'Source or evidence', placeholder: 'Where did you learn about this?' },
  { name: 'fit', label: 'Why it may fit', type: 'area' }, { name: 'angle', label: 'Outreach angle', type: 'area' }
];
