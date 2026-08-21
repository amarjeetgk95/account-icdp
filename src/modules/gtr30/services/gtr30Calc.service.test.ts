import { describe, expect, it } from 'vitest';
import {
  billTotals,
  deductionsTotal,
  earningsTotal,
  groupInsuranceBreakdown,
  numberToWords,
} from './gtr30Calc.service';
import { createDefaultEmployee } from '../constants/defaults';
import { gtr30BillFormService } from './gtr30BillForm.service';

describe('GTR-30 calculations & PDF sample checks', () => {
  it('calculates employee gross, deductions, and net accurately for PDF sample', () => {
    const employee = createDefaultEmployee(1);
    const gross = earningsTotal(employee);
    const deductions = deductionsTotal(employee);
    const net = gross - deductions;

    expect(gross).toBe(72550);
    expect(deductions).toBe(8068);
    expect(net).toBe(64482);
  });

  it('calculates bill totals across employees', () => {
    const data = gtr30BillFormService.emptyFormData();
    const totals = billTotals(data);

    expect(totals.gross).toBe(72550);
    expect(totals.deductions).toBe(8068);
    expect(totals.net).toBe(64482);
    expect(totals.societyTotal).toBe(4154);
    expect(totals.netAfterSociety).toBe(60328);
    expect(totals.totalRent).toBe(300);
    expect(totals.totalProfTax).toBe(200);
    expect(totals.totalGis).toBe(800);
  });

  it('aggregates group insurance schedules correctly (Page 8)', () => {
    const data = gtr30BillFormService.emptyFormData();
    const breakdown = groupInsuranceBreakdown(data.employees);

    const groupB = breakdown.find((b) => b.groupCode === 'B');
    expect(groupB).toBeDefined();
    expect(groupB?.countSavingsAndIns).toBe(1);
    expect(groupB?.insFund).toBe(240);
    expect(groupB?.savingsFund).toBe(560);
    expect(groupB?.total).toBe(800);
  });

  it('converts amounts to words properly (Indian system)', () => {
    expect(numberToWords(64482)).toBe('SixtyFour Thousand Four Hundred EightyTwo');
    expect(numberToWords(300)).toBe('Three Hundred');
    expect(numberToWords(200)).toBe('Two Hundred');
    expect(numberToWords(800)).toBe('Eight Hundred');
    expect(numberToWords(72550)).toBe('SeventyTwo Thousand Five Hundred Fifty');
  });
});
