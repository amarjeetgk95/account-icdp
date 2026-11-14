import { describe, expect, it } from 'vitest';
import { gtr30BillSchema } from './gtr30Bill.schema';

const validPayload = {
  billRegisterNo: 'BR-1',
  billDate: '2026-07-01',
  monthOf: 'July-2026',
  billCode: 'GTR30-SAL',
  officeName: 'Office',
  employees: [{ id: 'e1', srNo: 1, name: 'Shri A' }],
};

describe('gtr30BillSchema status', () => {
  it.each(['draft', 'submitted', 'passed', 'rejected'] as const)('accepts status %s', (status) => {
    const result = gtr30BillSchema.safeParse({ ...validPayload, status });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe(status);
  });

  it('defaults status to draft', () => {
    const result = gtr30BillSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBe('draft');
  });

  it('rejects an unknown status', () => {
    const result = gtr30BillSchema.safeParse({ ...validPayload, status: 'cancelled' });
    expect(result.success).toBe(false);
  });
});

describe('gtr30BillSchema employee srNo', () => {
  it('accepts srNo >= 1', () => {
    const result = gtr30BillSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects srNo 0', () => {
    const result = gtr30BillSchema.safeParse({
      ...validPayload,
      employees: [{ id: 'e1', srNo: 0, name: 'Shri A' }],
    });
    expect(result.success).toBe(false);
  });
});
