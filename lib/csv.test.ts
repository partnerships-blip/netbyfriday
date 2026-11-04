import { describe, it, expect } from 'vitest';
import { parseCsv, csvToDealRows } from './csv';

describe('csv', () => {
  it('handles quoted commas, escaped quotes and CRLF', () => {
    expect(parseCsv('brand,campaign\r\n"Copperline, Inc.","The ""Big"" one"\r\n')).toEqual([['brand', 'campaign'], ['Copperline, Inc.', 'The "Big" one']]);
  });
  it('maps stage labels and requires a brand column', () => {
    expect(csvToDealRows(parseCsv('brand,stage,fee\nA,Content Submitted,1200\n,paid,5')).rows).toEqual([{ brand: 'A', campaign: '', fee: '1200', stage: 'in_progress', date: undefined }]);
    expect(csvToDealRows(parseCsv('name\nA')).error).toMatch(/brand/);
  });
});
