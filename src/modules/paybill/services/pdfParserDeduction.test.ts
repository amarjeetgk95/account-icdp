import { describe, it, expect } from 'vitest';
import { pdfParserService } from './pdfParser.service';

describe('PdfParserService - Deduction Side Parsing', () => {
  const sampleDeductionOcrText = `
PAYBILL INNER SHEET - Deduction Side for the Month of : April-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002202
Name of D.D.O : Smt. Sulochana Vijaykumar Solanki Name of Ministry : Major Head : 2403
D.D.O Code No : 299 Department: Office of the Deputy Director (ICDP - Surat) TAN No. : SRTD00979G
E-Mail ID : Address : Surat Cardex No. : 22
Phone no. : Taluka : Mobile No. : 9909913660
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) HBA Interest (9591) GPF Reg (9670) GPF Reg Class 4 (9531) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20105451 Smt.Sulochana Vijaykumar Solanki Office Superintendent 6268.00 200.00 0.00 20000.00 0.00 0.00 240.00 560.00 27268.00 85830.00
2 20105536 Shri.Amarjeet Gambhirbhai Kathodi Accountant 0.00 200.00 0.00 0.00 0.00 5941.00 120.00 280.00 6541.00 63753.00
3 20105672 Shri.Tejashkumar Rajnikant Patel Senior Clerk 0.00 200.00 0.00 0.00 0.00 4535.00 120.00 280.00 5135.00 49673.00
4 20105976 Smt.Smita Kirankumar Randeri Junior Clerk 0.00 200.00 0.00 0.00 0.00 3871.00 120.00 280.00 4471.00 42929.00
5 20106008 Shri.Rajubhai Gulabsing Vasava Statistical Inspector 0.00 200.00 0.00 0.00 0.00 5041.00 120.00 280.00 5641.00 54735.00
6 20108570 Mr.PRAVINBHAI MALIYABHAI CHAUDHARY Driver 0.00 200.00 4740.00 20000.00 0.00 0.00 120.00 280.00 25340.00 48091.00
7 20111324 Shri.Jayantibhai Tidabhai Sandish Peon 0.00 200.00 1500.00 0.00 5000.00 0.00 120.00 280.00 7100.00 65263.00
8 20111423 Shri.Narvatbhai Akhambhai Damor Peon 0.00 200.00 0.00 0.00 0.00 3492.00 60.00 140.00 3892.00 37222.00
Total 6268.00 1600.00 6240.00 40000.00 5000.00 22880.00 1020.00 2380.00 85388.00 447496.00
I hereby certify that all the particulars furnished above are correct and complete.
Rupees : 85388
Rupees (In Words) : EIGHTY FIVE THOUSAND THREE HUNDRED AND EIGHTY EIGHT ONLY
Date : 15/08/2026 11:06
  `;

  it('detects sheetType as DEDUCTION', () => {
    const result = pdfParserService.parseExtractedText(sampleDeductionOcrText);
    expect(result.sheetType).toBe('DEDUCTION');
  });

  it('correctly parses metadata from deduction sheet', () => {
    const result = pdfParserService.parseExtractedText(sampleDeductionOcrText);
    expect(result.metadata.month).toBe('April-2026');
    expect(result.metadata.billNo).toBe('Srt0299002202');
    expect(result.metadata.majorHead).toBe('2403');
    expect(result.metadata.ddoCode).toBe('299');
    expect(result.metadata.tanNo).toBe('SRTD00979G');
  });

  it('correctly extracts all 8 deduction records', () => {
    const result = pdfParserService.parseExtractedText(sampleDeductionOcrText);
    expect(result.deductionRows).toBeDefined();
    expect(result.deductionRows?.length).toBe(8);

    const r1 = result.deductionRows?.[0];
    expect(r1?.hrpn).toBe('20105451');
    expect(r1?.incomeTax).toBe(6268);
    expect(r1?.profTax).toBe(200);
    expect(r1?.gpfRegular).toBe(20000);
    expect(r1?.gisGovtFund).toBe(240);
    expect(r1?.gisGovtSaving).toBe(560);
    expect(r1?.totalDeductions).toBe(27268);
    expect(r1?.netPay).toBe(85830);

    const r2 = result.deductionRows?.[1];
    expect(r2?.hrpn).toBe('20105536');
    expect(r2?.npsRegular).toBe(5941);
    expect(r2?.totalDeductions).toBe(6541);
    expect(r2?.netPay).toBe(63753);

    const r6 = result.deductionRows?.[5];
    expect(r6?.hrpn).toBe('20108570');
    expect(r6?.hbaInterest).toBe(4740);
    expect(r6?.gpfRegular).toBe(20000);
    expect(r6?.totalDeductions).toBe(25340);
    expect(r6?.netPay).toBe(48091);

    const r7 = result.deductionRows?.[6];
    expect(r7?.hrpn).toBe('20111324');
    expect(r7?.gpfClass4).toBe(5000);
    expect(r7?.totalDeductions).toBe(7100);
    expect(r7?.netPay).toBe(65263);
  });

  it('correctly extracts deduction footer totals', () => {
    const result = pdfParserService.parseExtractedText(sampleDeductionOcrText);
    expect(result.pdfDeductionTotals).toBeDefined();
    expect(result.pdfDeductionTotals?.incomeTax).toBe(6268);
    expect(result.pdfDeductionTotals?.profTax).toBe(1600);
    expect(result.pdfDeductionTotals?.hbaInterest).toBe(6240);
    expect(result.pdfDeductionTotals?.gpfRegular).toBe(40000);
    expect(result.pdfDeductionTotals?.gpfClass4).toBe(5000);
    expect(result.pdfDeductionTotals?.npsRegular).toBe(22880);
    expect(result.pdfDeductionTotals?.gisGovtFund).toBe(1020);
    expect(result.pdfDeductionTotals?.gisGovtSaving).toBe(2380);
    expect(result.pdfDeductionTotals?.totalDeductions).toBe(85388);
    expect(result.pdfDeductionTotals?.netPay).toBe(447496);
  });
});
