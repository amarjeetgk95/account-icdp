import { describe, expect, it } from 'vitest';
import { gtr30BillCodeMappingsSchema } from './gtr30BillCodeMappings.schema';

describe('gtr30BillCodeMappingsSchema', () => {
  it('accepts valid mappings array', () => {
    const mappings = [
      {
        id: 'm1',
        billCode: 'GTR30-SAL',
        description: 'Salary Bill',
        monthKey: 'July-2024',
        budgetHeadId: 'bh1',
        controllingOfficer: 'CO',
        classOfExpenditure: 'Class',
        fund: 'Fund',
        drawingOfficer: 'DO',
        demandNo: '1',
        demandNoLabel: 'Demand 1',
        typeOfBudget: 'State',
        schemeNo: 'Scheme1',
        headChargeable: '2071',
        sector: 'A',
        majorHead: '2071',
        subMajorHead: '01',
        minorHead: '101',
        subHead: '01',
        budgetYear: '2024-25',
      },
      {
        id: 'm2',
        billCode: 'GTR30-ARR',
        description: 'Arrears Bill',
      },
    ];

    const result = gtr30BillCodeMappingsSchema.safeParse(mappings);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('rejects missing required fields', () => {
    const mappings = [
      {
        id: 'm1',
        description: 'Missing billCode',
      },
    ];

    const result = gtr30BillCodeMappingsSchema.safeParse(mappings);
    expect(result.success).toBe(false);
  });

  it('accepts empty array', () => {
    const result = gtr30BillCodeMappingsSchema.safeParse([]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('rejects non-array input', () => {
    const result = gtr30BillCodeMappingsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});