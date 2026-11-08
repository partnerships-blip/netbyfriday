import { describe, it, expect } from 'vitest';
import { ContractLinkSchema } from './validation';

const id = '11111111-1111-4111-8111-111111111111';
const deal = '22222222-2222-4222-8222-222222222222';

describe('linking a contract to a partnership', () => {
  it('accepts a partnership to link, or null to unlink', () => {
    expect(ContractLinkSchema.parse({ contractId: id, dealId: deal })).toEqual({ contractId: id, dealId: deal });
    expect(ContractLinkSchema.parse({ contractId: id, dealId: null })).toEqual({ contractId: id, dealId: null });
  });
  it('rejects ids that are not uuids and a missing dealId', () => {
    expect(() => ContractLinkSchema.parse({ contractId: 'abc', dealId: deal })).toThrow();
    expect(() => ContractLinkSchema.parse({ contractId: id, dealId: 'not-a-deal' })).toThrow();
    expect(() => ContractLinkSchema.parse({ contractId: id })).toThrow();
  });
});
