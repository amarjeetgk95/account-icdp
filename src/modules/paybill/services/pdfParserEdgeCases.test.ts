import { describe, it, expect } from 'vitest';
import { pdfParserService } from './pdfParser.service';

const HEADER = `
Smt. Sulochana Vijaykumar Solanki
Assistant Administrative cum Accounts Officer - DDO
Office of the Deputy Director (ICDP - Surat)
Cardex No : 22
PAYBILL INNER SHEET - Earning Side for the Month of : July-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002201
Name of D.D.O : Smt. Sulochana Vijaykumar Solanki Name of Ministry : Major Head : 2403
D.D.O Code No : 299 Department: Office of the Deputy Director (ICDP - Surat) TAN No. : SRTD00979G
E-Mail ID : Address : Surat Cardex No. : 22
Phone no. : Taluka : Mobile No. : 9909913660
`;

describe('PdfParserService - Edge Cases', () => {
  it('parses Indian-grouped comma amounts (e.g. 37,600.00 / 4,19,100.00)', () => {
    const text = `
${HEADER}
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay DA HRA CLA Med Allow Trans Allow NPP Gross Amt
1 20013826 Shri.Dr Dineshbhai Chamabhai Chaudhari Deputy Director PB-3 No P 1,05,600.00 76,032.00 16,896.00 270.00 1,000.00 7,200.00 21,120.00 2,28,118.00
2 20014113 Shri.Dr Hitendrabhai Manilal Patidar Assistant Director PB-2 No P 117,800.00 84,816.00 18,848.00 270.00 1,000.00 7,200.00 23,560.00 253,494.00
Total 4,19,100.00 3,01,752.00 57,632.00 810.00 4,000.00 25,200.00 83,820.00 8,92,314.00
`;

    const result = pdfParserService.parseExtractedText(text);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].basicPay).toBe(105600);
    expect(result.rows[0].da).toBe(76032);
    expect(result.rows[0].grossAmount).toBe(228118);
    expect(result.rows[1].basicPay).toBe(117800);
    expect(result.pdfTotals?.basicPay).toBe(419100);
    expect(result.pdfTotals?.grossAmount).toBe(892314);
  });

  it('parses deduction rows whose printed Total Deductions column is blank (9 numbers: fields + net pay)', () => {
    const text = `
PAYBILL INNER SHEET - Deduction Side for the Month of : April-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002202
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) HBA Interest (9591) GPF Reg (9670) GPF Reg Class 4 (9531) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20105451 Smt.Sulochana Vijaykumar Solanki Office Superintendent 6268.00 200.00 0.00 20000.00 0.00 0.00 240.00 560.00 85830.00
2 20105536 Shri.Amarjeet Gambhirbhai Kathodi Accountant 0.00 200.00 0.00 0.00 0.00 5941.00 120.00 280.00 63753.00
Total 6268.00 1600.00 6240.00 40000.00 5000.00 22880.00 1020.00 2380.00 85388.00 447496.00
`;

    const result = pdfParserService.parseExtractedText(text);
    expect(result.sheetType).toBe('DEDUCTION');
    expect(result.deductionRows).toHaveLength(2);

    // Blank Total Ded column -> derived as sum of the 8 deduction fields
    const r1 = result.deductionRows![0];
    expect(r1.incomeTax).toBe(6268);
    expect(r1.totalDeductions).toBe(6268 + 200 + 20000 + 240 + 560);
    expect(r1.netPay).toBe(85830);

    const r2 = result.deductionRows![1];
    expect(r2.npsRegular).toBe(5941);
    expect(r2.totalDeductions).toBe(0 + 200 + 5941 + 120 + 280);
    expect(r2.netPay).toBe(63753);
  });

  it('parses deduction rows where a middle column is blank/zero (values printed as 0.00)', () => {
    const text = `
PAYBILL INNER SHEET - Deduction Side for the Month of : April-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002202
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) HBA Interest (9591) GPF Reg (9670) GPF Reg Class 4 (9531) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20105536 Shri.Amarjeet Gambhirbhai Kathodi Accountant 0.00 200.00 0.00 0.00 0.00 0.00 120.00 280.00 600.00 63753.00
Total 0.00 200.00 0.00 0.00 0.00 0.00 120.00 280.00 600.00 63753.00
`;

    const result = pdfParserService.parseExtractedText(text);
    const r = result.deductionRows![0];
    expect(r.incomeTax).toBe(0);
    expect(r.hbaInterest).toBe(0);
    expect(r.npsRegular).toBe(0);
    expect(r.profTax).toBe(200);
    expect(r.totalDeductions).toBe(600);
    expect(r.netPay).toBe(63753);
  });

  it('reports detection confidence of 100% for a clean earning sheet', () => {
    const text = `
${HEADER}
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay DA HRA CLA Med Allow Trans Allow NPP Gross Amt
1 20013826 Shri.Dr Dineshbhai Chamabhai Chaudhari Deputy Director PB-3 No P 105600.00 76032.00 16896.00 270.00 1000.00 7200.00 21120.00 228118.00
Total 105600.00 76032.00 16896.00 270.00 1000.00 7200.00 21120.00 228118.00
`;

    const result = pdfParserService.parseExtractedText(text);
    expect(result.detection?.confidence).toBe(100);
    expect(result.detection?.issues).toEqual([]);
  });

  it('flags low detection confidence + guidance when rows are missing amounts', () => {
    const text = `
${HEADER}
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay DA HRA CLA Med Allow Trans Allow NPP Gross Amt
1 20013826 Shri.Dr Dineshbhai Chamabhai Chaudhari Deputy Director PB-3 No P 105600.00 76032.00 16896.00 270.00 1000.00 7200.00 21120.00 228118.00
2 20014113 Shri.Dr Hitendrabhai Manilal Patidar Assistant Director PB-2 No P
Total 105600.00 76032.00 16896.00 270.00 1000.00 7200.00 21120.00 228118.00
`;

    const result = pdfParserService.parseExtractedText(text);
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.detection).toBeDefined();
    expect(result.detection!.confidence).toBeLessThan(100);
    expect(result.parsingWarnings.some((w) => /confidence is low/i.test(w))).toBe(true);
    expect(result.detection!.issues.some((i) => /confidence is low/i.test(i))).toBe(true);
  });

  it('captures slightly shifted coordinate columns via two-pass tolerance (wide pass)', () => {
    // Net Pay column header sits at x=760 but the value is printed ~55pt away (x=815)
    const mockItems = [
      { str: 'PAYBILL INNER SHEET - Deduction Side', x: 200, y: 600, w: 100, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 500, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 500, w: 50, h: 10, page: 1 },
      { str: 'Income Tax (9510)', x: 440, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Prof Tax (9570)', x: 500, y: 500, w: 40, h: 10, page: 1 },
      { str: 'HBA Interest (9591)', x: 560, y: 500, w: 40, h: 10, page: 1 },
      { str: 'GPF Reg (9670)', x: 620, y: 500, w: 40, h: 10, page: 1 },
      { str: 'GPF Reg Class 4 (9531)', x: 680, y: 500, w: 40, h: 10, page: 1 },
      { str: 'NPS Reg (9534)', x: 730, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Fund (9581)', x: 790, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Saving (9582)', x: 850, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Total Ded', x: 910, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Net Pay', x: 970, y: 500, w: 40, h: 10, page: 1 },

      { str: '1', x: 25, y: 430, w: 10, h: 10, page: 1 },
      { str: '20105536', x: 60, y: 430, w: 35, h: 10, page: 1 },
      { str: 'Shri.Amarjeet Gambhirbhai Kathodi', x: 120, y: 430, w: 60, h: 10, page: 1 },
      { str: 'Accountant', x: 220, y: 430, w: 45, h: 10, page: 1 },
      { str: '6268.00', x: 442, y: 430, w: 30, h: 10, page: 1 },
      { str: '200.00', x: 502, y: 430, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 562, y: 430, w: 20, h: 10, page: 1 },
      { str: '20000.00', x: 622, y: 430, w: 30, h: 10, page: 1 },
      { str: '0.00', x: 682, y: 430, w: 20, h: 10, page: 1 },
      { str: '0.00', x: 732, y: 430, w: 20, h: 10, page: 1 },
      { str: '240.00', x: 792, y: 430, w: 25, h: 10, page: 1 },
      { str: '560.00', x: 852, y: 430, w: 25, h: 10, page: 1 },
      { str: '27268.00', x: 912, y: 430, w: 35, h: 10, page: 1 },
      // Net pay printed 55pt away from its header x (970) - beyond tight 30, within wide 80
      { str: '85830.00', x: 1025, y: 430, w: 35, h: 10, page: 1 },
    ];

    const result = pdfParserService.parseExtractedText('Deduction Side', 1, mockItems);

    expect(result.sheetType).toBe('DEDUCTION');
    expect(result.deductionRows).toHaveLength(1);
    expect(result.deductionRows![0].netPay).toBe(85830);
    expect(result.deductionRows![0].gpfRegular).toBe(20000);
    expect(result.deductionRows![0].totalDeductions).toBe(27268);
  });
});
