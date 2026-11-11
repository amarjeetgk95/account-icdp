import { describe, it, expect } from 'vitest';
import { pdfParserService } from './pdfParser.service';
import { hrpnMappingService } from './hrpnMapping.service';
import { paybillValidationService } from './paybillValidation.service';

const SIX_COL_TEXT = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
D.D.O HRPN : 20014113 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002201
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) GPF Reg (9670) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20013826 Shri.Dr Dineshbhai Chamabhai Chaudhari Deputy Director (Animal Husbandary) 30043.00 200.00 0.00 16195.00 480.00 1120.00 48038.00 171172.00
2 20014113 Shri.Dr Hitendrabhai Manilal Patidar Assistant Director 37677.00 200.00 40000.00 0.00 480.00 1120.00 79477.00 164199.00
3 20014151 Shri.Dr Jagdishkumar Mohanbhai Jalandhra Assistant Director 33614.00 200.00 40000.00 0.00 480.00 1120.00 75414.00 155240.00
4 20014153 Shri.Dr Harit Dhananjaybhai Bhatt Assistant Director 15459.00 200.00 0.00 11945.00 480.00 1120.00 29204.00 134700.00
Total 116793.00 800.00 80000.00 28140.00 1920.00 4480.00 232133.00 625311.00
`;

describe('repro six-col gazetted deduction', () => {
  it('maps IT/GPF/NPS correctly when HBA and Class-4 columns are omitted (coordinate path)', () => {
    const mockItems = [
      { str: 'HRPN', x: 60, y: 500, w: 30, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 500, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 500, w: 50, h: 10, page: 1 },
      { str: 'Income Tax (9510)', x: 340, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Prof Tax (9570)', x: 420, y: 500, w: 40, h: 10, page: 1 },
      { str: 'GPF Reg (9670)', x: 500, y: 500, w: 40, h: 10, page: 1 },
      { str: 'NPS Reg (9534)', x: 580, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Fund (9581)', x: 660, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Saving (9582)', x: 740, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Total Ded', x: 820, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Net Pay', x: 900, y: 500, w: 40, h: 10, page: 1 },
      { str: '1', x: 25, y: 430, w: 10, h: 10, page: 1 },
      { str: '20013826', x: 60, y: 430, w: 35, h: 10, page: 1 },
      { str: 'Shri.Dr Dineshbhai', x: 120, y: 430, w: 60, h: 10, page: 1 },
      { str: 'Deputy Director', x: 220, y: 430, w: 45, h: 10, page: 1 },
      { str: '30043.00', x: 342, y: 430, w: 30, h: 10, page: 1 },
      { str: '200.00', x: 422, y: 430, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 502, y: 430, w: 20, h: 10, page: 1 },
      { str: '16195.00', x: 582, y: 430, w: 30, h: 10, page: 1 },
      { str: '480.00', x: 662, y: 430, w: 25, h: 10, page: 1 },
      { str: '1120.00', x: 742, y: 430, w: 25, h: 10, page: 1 },
      { str: '48038.00', x: 822, y: 430, w: 35, h: 10, page: 1 },
      { str: '171172.00', x: 902, y: 430, w: 35, h: 10, page: 1 },
    ];
    const coord = pdfParserService.parseExtractedText('Deduction Side March-2026 Total Ded Net Pay', 1, mockItems);
    expect(coord.sheetType).toBe('DEDUCTION');
    expect(coord.deductionRows).toHaveLength(1);
    expect(coord.deductionRows![0].incomeTax).toBe(30043);
    expect(coord.deductionRows![0].profTax).toBe(200);
    expect(coord.deductionRows![0].gpfRegular).toBe(0);
    expect(coord.deductionRows![0].npsRegular).toBe(16195);
    expect(coord.deductionRows![0].totalDeductions).toBe(48038);
    expect(coord.deductionRows![0].netPay).toBe(171172);
  });

  it('fills IT from bill text when the coordinate cell is offset from its header', () => {
    // Simulates the live bug: coordinates return the row but IT cell is
    // printed >80pt from its header X, so header-X alone yields 0.
    // Text cross-check must fill IT 30043 without touching correct fields.
    const offsetItems = [
      { str: 'HRPN', x: 60, y: 500, w: 30, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 500, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 500, w: 50, h: 10, page: 1 },
      { str: 'Income Tax (9510)', x: 340, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Prof Tax (9570)', x: 420, y: 500, w: 40, h: 10, page: 1 },
      { str: 'GPF Reg (9670)', x: 500, y: 500, w: 40, h: 10, page: 1 },
      { str: 'NPS Reg (9534)', x: 580, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Fund (9581)', x: 660, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Govt Saving (9582)', x: 740, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Total Ded', x: 820, y: 500, w: 40, h: 10, page: 1 },
      { str: 'Net Pay', x: 900, y: 500, w: 40, h: 10, page: 1 },
      { str: '1', x: 25, y: 430, w: 10, h: 10, page: 1 },
      { str: '20013826', x: 60, y: 430, w: 35, h: 10, page: 1 },
      { str: 'Shri.Dr Dineshbhai', x: 120, y: 430, w: 60, h: 10, page: 1 },
      { str: 'Deputy Director', x: 220, y: 430, w: 45, h: 10, page: 1 },
      // IT number far from its header (simulates real PDF offset)
      { str: '30043.00', x: 150, y: 430, w: 30, h: 10, page: 1 },
      { str: '200.00', x: 422, y: 430, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 502, y: 430, w: 20, h: 10, page: 1 },
      { str: '16195.00', x: 582, y: 430, w: 30, h: 10, page: 1 },
      { str: '480.00', x: 662, y: 430, w: 25, h: 10, page: 1 },
      { str: '1120.00', x: 742, y: 430, w: 25, h: 10, page: 1 },
      { str: '48038.00', x: 822, y: 430, w: 35, h: 10, page: 1 },
      { str: '171172.00', x: 902, y: 430, w: 35, h: 10, page: 1 },
    ];
    const singleRowText = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) GPF Reg (9670) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20013826 Shri.Dr Dineshbhai Deputy Director 30043.00 200.00 0.00 16195.00 480.00 1120.00 48038.00 171172.00
Total 30043.00 200.00 0.00 16195.00 480.00 1120.00 48038.00 171172.00
`;
    const merged = pdfParserService.parseExtractedText(singleRowText, 1, offsetItems);
    expect(merged.deductionRows).toHaveLength(1);
    expect(merged.deductionRows![0].incomeTax).toBe(30043);
    expect(merged.deductionRows![0].profTax).toBe(200);
    expect(merged.deductionRows![0].npsRegular).toBe(16195);
  });

  it('maps IT/GPF/NPS correctly when HBA and Class-4 columns are omitted', () => {
    const result = pdfParserService.parseExtractedText(SIX_COL_TEXT);
    expect(result.sheetType).toBe('DEDUCTION');
    expect(result.deductionRows).toHaveLength(4);
    const r1 = result.deductionRows![0];
    expect(r1.incomeTax).toBe(30043);
    expect(r1.profTax).toBe(200);
    expect(r1.gpfRegular).toBe(0);
    expect(r1.npsRegular).toBe(16195);
    expect(r1.hbaInterest).toBe(0);
    expect(r1.gpfClass4).toBe(0);
    expect(r1.totalDeductions).toBe(48038);
    expect(r1.netPay).toBe(171172);
    expect(r1.designation).toMatch(/Deputy Director/i);
    const r2 = result.deductionRows![1];
    expect(r2.incomeTax).toBe(37677);
    expect(r2.gpfRegular).toBe(40000);
    expect(r2.npsRegular).toBe(0);
    expect(r2.designation).toMatch(/Assistant Director/i);
    expect(result.deductionRows![2].designation).toMatch(/Assistant Director/i);
    expect(result.deductionRows![3].designation).toMatch(/Assistant Director/i);
    const t = result.pdfDeductionTotals!;
    expect(t.incomeTax).toBe(116793);
    expect(t.profTax).toBe(800);
    expect(t.gpfRegular).toBe(80000);
    expect(t.npsRegular).toBe(28140);
    expect(t.totalDeductions).toBe(232133);
    expect(t.netPay).toBe(625311);
  });

  it('parses minimal single-column sheets (PT-only 2204) without blocking the batch', () => {
    const text = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
D.D.O HRPN : 20014113 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002204
Sr No HRPN Employee Name Designation Prof Tax (9570) Total Ded Net Pay
1 20110757 Shri.Mikikumar Bharatbhai Chaudhari Live Stock Inspector Ambheti 200.00 200.00 25800.00
2 20112224 Shri.Nikhil Prakashchandra Sagar Live Stock Inspector Borbodhan 200.00 200.00 25800.00
8 20477200 Mr.ANKITKUMAR MUKESHBHAI CHAUDHARI Junior Clerk 200.00 200.00 25800.00
Total 1600.00 1600.00 206400.00
`;
    const parsed = pdfParserService.parseExtractedText(text);
    expect(parsed.sheetType).toBe('DEDUCTION');
    expect(parsed.deductionRows).toHaveLength(3);
    expect(parsed.deductionRows![0].profTax).toBe(200);
    expect(parsed.deductionRows![0].totalDeductions).toBe(200);
    expect(parsed.deductionRows![0].netPay).toBe(25800);
    expect(parsed.deductionRows![0].employeeName.length).toBeGreaterThan(2);
    expect(parsed.deductionRows![0].designation).toMatch(/Live Stock Inspector|Junior Clerk/i);
    // SSOT gate: HRPN not in Establishment directory is an ERROR and blocks the batch.
    const mapped = hrpnMappingService.mapDeductionRows(parsed.deductionRows || [], []);
    const validated = paybillValidationService.validateDeductionRecords(mapped);
    expect(validated.every((r) => r.mappingStatus === 'NOT_FOUND')).toBe(true);
    expect(validated.some((r) => r.validationStatus === 'ERROR')).toBe(true);
    expect(validated.some((r) => r.mappingStatus === 'DUPLICATE')).toBe(false);
  });
});
