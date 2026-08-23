import { describe, expect, it } from 'vitest';
import {
  billTotals,
  deductionsTotal,
  earningsTotal,
  groupInsuranceBreakdown,
  numberToWords,
  formatWordsCertificate,
} from './gtr30Calc.service';
import { createDefaultEmployee } from '../constants/defaults';
import { gtr30BillFormService } from './gtr30BillForm.service';

describe('GTR-30 calculations & PDF sample checks', () => {
  it('calculates employee gross, deductions, and net as zero for blank template', () => {
    const employee = createDefaultEmployee(1);
    const gross = earningsTotal(employee);
    const deductions = deductionsTotal(employee);
    const net = gross - deductions;

    expect(gross).toBe(0);
    expect(deductions).toBe(0);
    expect(net).toBe(0);
  });

  it('calculates bill totals as zero for blank template', () => {
    const data = gtr30BillFormService.emptyFormData();
    const totals = billTotals(data);

    expect(totals.gross).toBe(0);
    expect(totals.deductions).toBe(0);
    expect(totals.net).toBe(0);
    expect(totals.societyTotal).toBe(0);
    expect(totals.netAfterSociety).toBe(0);
    expect(totals.totalRent).toBe(0);
    expect(totals.totalProfTax).toBe(0);
    expect(totals.totalGis).toBe(0);
  });

  it('aggregates group insurance schedules as zero for blank template', () => {
    const data = gtr30BillFormService.emptyFormData();
    const breakdown = groupInsuranceBreakdown(data.employees);

    const groupB = breakdown.find((b) => b.groupCode === 'B');
    expect(groupB).toBeDefined();
    expect(groupB?.countSavingsAndIns).toBe(0);
    expect(groupB?.insFund).toBe(0);
    expect(groupB?.savingsFund).toBe(0);
    expect(groupB?.total).toBe(0);
  });

  it('converts amounts to words properly (Indian system)', () => {
    expect(numberToWords(0)).toBe('Zero');
    expect(numberToWords(21)).toBe('Twenty One');
    expect(numberToWords(100)).toBe('One Hundred');
    expect(numberToWords(1001)).toBe('One Thousand One');
    expect(numberToWords(10000000)).toBe('One Crore');
    expect(numberToWords(1000000000)).toBe('One Hundred Crore');
    expect(numberToWords(123456789)).toBe('Twelve Crore Thirty Four Lakh Fifty Six Thousand Seven Hundred Eighty Nine');
    expect(numberToWords(64482)).toBe('Sixty Four Thousand Four Hundred Eighty Two');
    expect(numberToWords(300)).toBe('Three Hundred');
    expect(numberToWords(200)).toBe('Two Hundred');
    expect(numberToWords(800)).toBe('Eight Hundred');
    expect(numberToWords(72550)).toBe('Seventy Two Thousand Five Hundred Fifty');
  });

  it('formats words certificate correctly', () => {
    expect(formatWordsCertificate(0)).toBe('Rupees Zero Only');
    expect(formatWordsCertificate(21)).toBe('Rupees Twenty One Only');
    expect(formatWordsCertificate(10000000)).toBe('Rupees One Crore Only');
  });
});