import { describe, expect, it } from 'vitest';
import { gtr30BudgetHeadsSchema } from './gtr30BudgetHeads.schema';

describe('gtr30BudgetHeadsSchema', () => {
  it('accepts valid budget heads array', () => {
    const heads = [
      {
        id: 'bh1',
        name: 'Salary Head',
        headChargeable: '2071',
        controllingOfficer: 'CO',
        classOfExpenditure: 'Class',
        fund: 'Consolidated',
        drawingOfficer: 'DO',
        demandNo: '1',
        typeOfBudget: 'State',
        schemeNo: 'Scheme1',
        sector: 'A',
        majorHead: '2071',
        subMajorHead: '01',
        minorHead: '101',
        subHead: '01',
        budgetYear: '2024-25',
      },
      {
        id: 'bh2',
        name: 'Arrears Head',
      },
    ];

    const result = gtr30BudgetHeadsSchema.safeParse(heads);
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('rejects missing required fields', () => {
    const heads = [
      {
        name: 'Missing ID',
      },
    ];

    const result = gtr30BudgetHeadsSchema.safeParse(heads);
    expect(result.success).toBe(false);
  });

  it('accepts empty array', () => {
    const result = gtr30BudgetHeadsSchema.safeParse([]);
    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('rejects non-array input', () => {
    const result = gtr30BudgetHeadsSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});