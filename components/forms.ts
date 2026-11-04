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

type Opt = { id: string; label: string };
const none = (l: string) => [{ v: '', l }];
export const contactFields = (brands: string[]): FieldSpec[] => [
  { name: 'name', label: 'Name', required: true }, { name: 'brand', label: 'Brand', placeholder: brands.length ? brands.slice(0, 2).join(', ') + '…' : 'Brand or agency' },
  { name: 'role', label: 'Role', placeholder: 'Influencer marketing manager' }, { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Phone' }, { name: 'followUpOn', label: 'Follow up on', type: 'date' },
  { name: 'lastContactedOn', label: 'Last contacted', type: 'date' }, { name: 'notes', label: 'Notes', type: 'area' }
];
export const taskFields = (deals: Opt[], contacts: Opt[], invoices: Opt[]): FieldSpec[] => [
  { name: 'title', label: 'Task', required: true, full: true }, { name: 'dueOn', label: 'Due date', type: 'date' },
  { name: 'priority', label: 'Priority', type: 'select', options: [{ v: 'normal', l: 'Normal' }, { v: 'high', l: 'High' }, { v: 'low', l: 'Low' }] },
  { name: 'dealId', label: 'Partnership', type: 'select', options: [...none('Not linked'), ...deals.map(d => ({ v: d.id, l: d.label }))] },
  { name: 'contactId', label: 'Contact', type: 'select', options: [...none('Not linked'), ...contacts.map(c => ({ v: c.id, l: c.label }))] },
  { name: 'invoiceId', label: 'Invoice', type: 'select', options: [...none('Not linked'), ...invoices.map(v => ({ v: v.id, l: v.label }))] },
  { name: 'notes', label: 'Notes', type: 'area' }
];
