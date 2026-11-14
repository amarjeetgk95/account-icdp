import { describe, it, expect } from 'vitest';
import { mergeGstEdit, quarterBounds, fyBounds, splitCsvLine, parsePartyCsv } from './partyTx.utils';

describe('mergeGstEdit (P0 regression: partial edit must not zero untouched legs)', () => {
  it('preserves sgst/igst when only cgst is edited', () => {
    const out = mergeGstEdit({ cgst: 100, sgst: 100, igst: 0 }, { cgst: 150 });
    expect(out).toEqual({ cgst: 150, sgst: 100, igst: 0, totalGst: 250 });
  });

  it('recomputes total from merged values', () => {
    const out = mergeGstEdit({ cgst: 10, sgst: 20, igst: 30 }, { igst: 0 });
    expect(out.totalGst).toBe(30);
  });
});

describe('FY / quarter bounds', () => {
  it('fy bounds are [Apr 1, next Apr 1)', () => {
    expect(fyBounds(2025)).toEqual({ from: '2025-04-01', to: '2026-04-01' });
  });

  it('Q4 spans Jan-Mar of next calendar year', () => {
    expect(quarterBounds(2025, 'Q4')).toEqual({ from: '2026-01-01', to: '2026-04-01' });
  });

  it('rejects unknown quarter', () => {
    expect(quarterBounds(2025, 'Q9')).toBeNull();
  });
});

describe('CSV parsing', () => {
  it('handles quoted commas', () => {
    expect(splitCsvLine('"ABC, Ltd",B1,2025-04-01,100')).toEqual(['ABC, Ltd', 'B1', '2025-04-01', '100']);
  });

  it('rejects missing date instead of defaulting to today', () => {
    const { entries, skipped } = parsePartyCsv('Party,Bill,Date,Amount\nABC,B1,,100', '2025-04-01');
    expect(entries).toHaveLength(0);
    expect(skipped.join(' ')).toMatch(/YYYY-MM-DD/);
  });

  it('parses optional trailing cpin/gst/pan columns', () => {
    const { entries } = parsePartyCsv(
      'Party,Bill,Date,Amount,CGST,SGST,IGST,IT,CPIN,GST,PAN\nABC,B1,2025-04-05,1000,90,90,0,100,CP1,22AAAAA0000A1Z5,ABCDE1234F',
      '2025-04-01'
    );
    expect(entries[0]).toMatchObject({ cpinNo: 'CP1', gstNo: '22AAAAA0000A1Z5', panNo: 'ABCDE1234F' });
  });

  it('parses DDO Bill No, Invoice Date, and Settlement Date with named headers', () => {
    const csv = `Party Name,DDO Bill No,Invoice No,Invoice Date,Settlement Date,Amount,CGST,SGST,IGST,Income Tax
Shree Ram Computers,DDO-104,INV-889,2025-05-10,2025-05-25,50000,4500,4500,0,1000`;
    const { entries, skipped } = parsePartyCsv(csv, '2025-04-01');
    expect(skipped).toHaveLength(0);
    expect(entries[0]).toMatchObject({
      partyName: 'Shree Ram Computers',
      ddoBillNo: 'DDO-104',
      billNo: 'INV-889',
      invoiceDate: '2025-05-10',
      settlementDate: '2025-05-25',
      amount: 50000,
      cgst: 4500,
      sgst: 4500,
      igst: 0,
      incomeTax: 1000,
    });
  });
});
