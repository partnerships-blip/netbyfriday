import { describe, it, expect } from 'vitest';
import { parseCsv, guessMapping, parseDate, parseStage, checkAll, dupKey } from './csv';

describe('parseCsv', () => {
  it('handles quotes, commas and newlines inside quotes, CRLF, BOM and blank lines', () => {
    const t = '﻿Brand,Notes,Fee\r\n"Glow, Inc.","Said ""yes""\non call",$4,500\r\n\r\nLumière,,1200\n';
    // an unquoted $4,500 splits at the comma, as in any CSV reader: spreadsheets quote it when exporting
    expect(parseCsv(t)).toEqual([['Brand', 'Notes', 'Fee'], ['Glow, Inc.', 'Said "yes"\non call', '$4', '500'], ['Lumière', '', '1200']]);
  });
  it('detects tab- and semicolon-separated files', () => {
    expect(parseCsv('Name\tEmail\nAva\tava@x.co')).toEqual([['Name', 'Email'], ['Ava', 'ava@x.co']]);
    expect(parseCsv('Name;Email\nAva;ava@x.co')).toEqual([['Name', 'Email'], ['Ava', 'ava@x.co']]);
  });
});

describe('mapping and values', () => {
  it('guesses columns from common spreadsheet headers, each column once', () => {
    const m = guessMapping('deals', ['Company', 'Campaign Name', 'Rate', 'Status', 'Contact', 'Contact Email', 'Date', 'Notes']);
    expect(m).toMatchObject({ brand: 0, campaign: 1, fee: 2, stage: 3, contactName: 4, contactEmail: 5, startedOn: 6, notes: 7, paymentTerms: null });
    expect(guessMapping('contacts', ['Full Name', 'Email Address', 'Agency', 'Title'])).toMatchObject({ name: 0, email: 1, brand: 2, role: 3 });
  });
  it('reads common date formats and rejects impossible dates', () => {
    expect(parseDate('2026-03-14')).toBe('2026-03-14');
    expect(parseDate('3/14/2026')).toBe('2026-03-14');
    expect(parseDate('03/14/26')).toBe('2026-03-14');
    expect(parseDate('March 14, 2026')).toBe('2026-03-14');
    expect(parseDate('14 Mar 2026')).toBe('2026-03-14');
    expect(parseDate('2/30/2026')).toBeNull();
    expect(parseDate('soon')).toBeNull();
  });
  it('maps creator pipeline words to stages', () => {
    expect(['Inquiry', 'Signed', 'Posted', 'Paid', 'Declined', 'Contract sent', ''].map(parseStage)).toEqual(['lead', 'contracted', 'completed', 'paid', 'lost', 'negotiating', 'lead']);
    expect(parseStage('vibes')).toBeNull();
  });
});

describe('checkAll', () => {
  const map = guessMapping('deals', ['Brand', 'Campaign', 'Fee', 'Stage', 'Date']);
  it('blocks rows with errors, warns on soft problems, and never treats money as received', () => {
    const r = checkAll('deals', [
      ['Glow', 'Spring', '$4,500.00', 'Paid', '3/1/2026'],
      ['', 'No brand', '100', '', ''],
      ['Lumière', 'Holiday', 'four thousand', '', ''],
      ['Nova', 'Launch', '2000', 'vibes', 'someday']
    ], map, new Set());
    expect(r[0].value).toMatchObject({ brand: 'Glow', feeCents: 450000, stage: 'paid', startedOn: '2026-03-01' });
    expect(r[0].warnings.join()).toMatch(/no payment is recorded/);
    expect(r[1].errors).toEqual(['Brand is empty']);
    expect(r[2].errors[0]).toMatch(/isn’t an amount/);
    expect(r[3].value).toMatchObject({ stage: 'lead', startedOn: null });
    expect(r[3].warnings).toHaveLength(2);
    expect(r.map(x => x.line)).toEqual([2, 3, 4, 5]);
  });
  it('flags duplicates of existing records and repeats within the file, ignoring case and punctuation', () => {
    const existing = new Set([dupKey('deals', { brand: 'Glow', campaign: 'Spring', feeCents: 0, startedOn: null })]);
    const r = checkAll('deals', [['GLOW', 'spring!', '1', '', ''], ['Nova', 'Launch', '1', '', ''], ['nova', 'launch', '2', '', '']], map, existing);
    expect(r.map(x => x.duplicate)).toEqual(['existing', '', 'file']);
  });
  it('dedupes contacts by email, else by name and brand', () => {
    const cm = guessMapping('contacts', ['Name', 'Email', 'Brand']);
    const r = checkAll('contacts', [['Ava', 'AVA@x.co', 'Glow'], ['Ava Two', 'ava@x.co', ''], ['Ben', '', 'Nova'], ['ben', '', 'NOVA'], ['Cy', 'not-an-email', '']], cm, new Set());
    expect(r.map(x => x.duplicate)).toEqual(['', 'file', '', 'file', '']);
    expect(r[4].value).toMatchObject({ email: '' });
    expect(r[4].warnings[0]).toMatch(/looks wrong/);
  });
});
