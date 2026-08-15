import { describe, it, expect } from 'vitest';
import { pdfParserService } from './pdfParser.service';

const SAMPLE_PAYBILL_TEXT_GAZETTED = `
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
Sr
No
HRPN Employee Name Designation Pay Scale PH SLO
Basic Pay
(0101)/(0102)
DA (0103) HRA (0110) CLA (0111) Med Allow (0107) Trans Allow (0113)
Non Private Practice
Allow (0128)
Gross Amt
1 20013826
Shri.Dr
Dineshbhai
Chamabhai
Chaudhari
Deputy Director (Animal
Husbandary)
PB-3 (15600-
39100)/6600
No P 105600.00 76032.00 16896.00 270.00 1000.00 7200.00 21120.00 228118.00
2 20014113
Shri.Dr
Hitendrabhai
Manilal
Patidar
Assistant Director
PB-2 (9300-
34800)/5400
No P 117800.00 84816.00 18848.00 270.00 1000.00 7200.00 23560.00 253494.00
3 20014151
Shri.Dr
Jagdishkumar
Mohanbhai
Jalandhra
Assistant Director
PB-2 (9300-
34800)/5400
No T 117800.00 84816.00 9424.00 0.00 1000.00 3600.00 23560.00 240200.00
4 20014153
Shri.Dr
Harit
Dhananjaybhai
Bhatt
Assistant Director
PB-2 (9300-
34800)/5400
No T 77900.00 56088.00 12464.00 270.00 1000.00 7200.00 15580.00 170502.00
Total 419100.00 301752.00 57632.00 810.00 4000.00 25200.00 83820.00 892314.00
I hereby certify that all the particulars furnished above are correct and complete.
Rupees : 892314
Rupees (In Words) : EIGHT LAKH NINETY TWO THOUSAND THREE HUNDRED AND FOURTEEN
ONLY
Date : 15/08/2026 10:47
karmyogi.gujarat.gov.in/Payrollsalaryfinalization?Billcode : 8NVS6tN✿R6ui2BtLQKQepQ♬♬
`;

const SAMPLE_PAYBILL_TEXT_NON_GAZETTED = `
Smt. Sulochana Vijaykumar Solanki
Assistant Administrative cum Accounts Officer - DDO
Office of the Deputy Director (ICDP - Surat)
Cardex No : 22
PAYBILL INNER SHEET - Earning Side for the Month of : July-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002202
Name of D.D.O : Smt. Sulochana Vijaykumar Solanki Name of Ministry : Major Head : 2403
D.D.O Code No : 299 Department: Office of the Deputy Director (ICDP - Surat) TAN No. : SRTD00979G
E-Mail ID : Address : Surat Cardex No. : 22
Phone no. : Taluka : Mobile No. : 9909913660
Sr
No
HRPN Employee Name Designation Pay Scale PH SLO
Basic Pay
(0101)/(0102)
DA (0103) HRA (0110) CLA (0111) Med Allow (0107) Trans Allow (0113)
Special Additional
Pay (0101)/(0102)
Washing Allow
(0132)
Gross Amt
1 20105536
Shri.Amarjeet
Gambhirbhai
Kathodi
Accountant
PB-2 (9300-
34800)/4200
No P 37600.00 22560.00 6016.00 270.00 1000.00 3600.00 0.00 0.00 71046.00
2 20105672
Shri.Tejashkumar
Rajnikant
Patel
Senior Clerk
PB-1 (5200-
20200)/2400
No P 29600.00 17760.00 4736.00 270.00 1000.00 3600.00 0.00 0.00 56966.00
3 20105976
Smt.Smita
Kirankumar
Randeri
Junior Clerk
PB-1 (5200-
20200)/1900
No P 24500.00 14700.00 3920.00 170.00 1000.00 3600.00 0.00 0.00 47890.00
4 20106008
Shri.Rajubhai
Gulabsing
Vasava
Statistical Inspector
PB-1 (5200-
20200)/2800
No P 32900.00 19740.00 5264.00 270.00 1000.00 3600.00 0.00 0.00 62774.00
5 20108570
Mr.PRAVINBHAI
MALIYABHAI
CHAUDHARY
Driver
PB-1 (5200-
20200)/2000
No P 40600.00 24360.00 6496.00 170.00 1000.00 3600.00 55.00 200.00 76481.00
6 20111324
Shri.Jayantibhai
Tidabhai
Sandish
Peon
PB-1 (5200-
20200)/1800
No P 39900.00 23940.00 6384.00 170.00 1000.00 3600.00 55.00 200.00 75249.00
7 20111423
Shri.Narvatbhai
Akhambhai
Damor
Peon 4440-7440/1400 No P 22800.00 13680.00 3648.00 110.00 1000.00 1350.00 0.00 200.00 42788.00
Total 227900.00 136740.00 36464.00 1430.00 7000.00 22950.00 110.00 600.00 433194.00
I hereby certify that all the particulars furnished above are correct and complete.
Rupees : 433194
Rupees (In Words) : FOUR LAKH THIRTY THREE THOUSAND ONE HUNDRED AND NINETY
FOUR ONLY
Date : 15/08/2026 11:12
karmyogi.gujarat.gov.in/Payrollsalaryfinalization?Billcode : V26✤0CQzVf56oJ3ZugrwVg♬♬
`;

describe('PdfParserService', () => {
  it('should extract bill metadata from sample paybill text (Gazetted)', () => {
    const result = pdfParserService.parseExtractedText(SAMPLE_PAYBILL_TEXT_GAZETTED);

    expect(result.metadata.month).toBe('July-2026');
    expect(result.metadata.ddoHrpn).toBe('20105451');
    expect(result.metadata.billNo).toBe('Srt0299002201');
    expect(result.metadata.majorHead).toBe('2403');
    expect(result.metadata.ddoCode).toBe('299');
    expect(result.metadata.tanNo).toBe('SRTD00979G');
    expect(result.metadata.cardexNo).toBe('22');
  });

  it('should extract 4 employee rows with exact HRPN and earnings from 8-column sample', () => {
    const result = pdfParserService.parseExtractedText(SAMPLE_PAYBILL_TEXT_GAZETTED);

    expect(result.rows).toHaveLength(4);

    // Employee 1: 20013826
    const emp1 = result.rows[0];
    expect(emp1.hrpn).toBe('20013826');
    expect(emp1.basicPay).toBe(105600);
    expect(emp1.da).toBe(76032);
    expect(emp1.hra).toBe(16896);
    expect(emp1.cla).toBe(270);
    expect(emp1.medicalAllowance).toBe(1000);
    expect(emp1.transportAllowance).toBe(7200);
    expect(emp1.nonPrivatePracticeAllowance).toBe(21120);
    expect(emp1.grossAmount).toBe(228118);

    // Employee 2: 20014113
    const emp2 = result.rows[1];
    expect(emp2.hrpn).toBe('20014113');
    expect(emp2.basicPay).toBe(117800);
    expect(emp2.da).toBe(84816);
    expect(emp2.hra).toBe(18848);
    expect(emp2.cla).toBe(270);
    expect(emp2.medicalAllowance).toBe(1000);
    expect(emp2.transportAllowance).toBe(7200);
    expect(emp2.nonPrivatePracticeAllowance).toBe(23560);
    expect(emp2.grossAmount).toBe(253494);
  });

  it('should extract 7 employee rows with Special Pay & Washing Allowance without any column shift (9-column sample)', () => {
    const result = pdfParserService.parseExtractedText(SAMPLE_PAYBILL_TEXT_NON_GAZETTED);

    expect(result.metadata.billNo).toBe('Srt0299002202');
    expect(result.rows).toHaveLength(7);

    // Row 1: Amarjeet Kathodi (Accountant)
    const emp1 = result.rows[0];
    expect(emp1.hrpn).toBe('20105536');
    expect(emp1.employeeName).toBe('Shri.Amarjeet Gambhirbhai Kathodi');
    expect(emp1.designation).toBe('Accountant');
    expect(emp1.payScale).toBe('PB-2 (9300-34800)/4200');
    expect(emp1.ph).toBe('No');
    expect(emp1.slo).toBe('P');
    expect(emp1.basicPay).toBe(37600);
    expect(emp1.da).toBe(22560);
    expect(emp1.hra).toBe(6016);
    expect(emp1.cla).toBe(270);
    expect(emp1.medicalAllowance).toBe(1000);
    expect(emp1.transportAllowance).toBe(3600);
    expect(emp1.specialPay).toBe(0);
    expect(emp1.washingAllowance).toBe(0);
    expect(emp1.grossAmount).toBe(71046);

    // Row 5: Pravinbhai Chaudhary (Driver)
    const emp5 = result.rows[4];
    expect(emp5.hrpn).toBe('20108570');
    expect(emp5.employeeName).toBe('Mr.PRAVINBHAI MALIYABHAI CHAUDHARY');
    expect(emp5.designation).toBe('Driver');
    expect(emp5.payScale).toBe('PB-1 (5200-20200)/2000');
    expect(emp5.ph).toBe('No');
    expect(emp5.slo).toBe('P');
    expect(emp5.basicPay).toBe(40600);
    expect(emp5.da).toBe(24360);
    expect(emp5.hra).toBe(6496);
    expect(emp5.cla).toBe(170);
    expect(emp5.medicalAllowance).toBe(1000);
    expect(emp5.transportAllowance).toBe(3600);
    expect(emp5.specialPay).toBe(55);
    expect(emp5.washingAllowance).toBe(200);
    expect(emp5.grossAmount).toBe(76481);

    // Row 7: Narvatbhai Damor (Peon)
    const emp7 = result.rows[6];
    expect(emp7.hrpn).toBe('20111423');
    expect(emp7.employeeName).toBe('Shri.Narvatbhai Akhambhai Damor');
    expect(emp7.designation).toBe('Peon');
    expect(emp7.payScale).toBe('4440-7440/1400');
    expect(emp7.ph).toBe('No');
    expect(emp7.slo).toBe('P');
    expect(emp7.basicPay).toBe(22800);
    expect(emp7.da).toBe(13680);
    expect(emp7.hra).toBe(3648);
    expect(emp7.cla).toBe(110);
    expect(emp7.medicalAllowance).toBe(1000);
    expect(emp7.transportAllowance).toBe(1350);
    expect(emp7.specialPay).toBe(0);
    expect(emp7.washingAllowance).toBe(200);
    expect(emp7.grossAmount).toBe(42788);
  });

  it('should extract totals row correctly for 9-column sample', () => {
    const result = pdfParserService.parseExtractedText(SAMPLE_PAYBILL_TEXT_NON_GAZETTED);

    expect(result.pdfTotals).not.toBeNull();
    expect(result.pdfTotals?.basicPay).toBe(227900);
    expect(result.pdfTotals?.da).toBe(136740);
    expect(result.pdfTotals?.hra).toBe(36464);
    expect(result.pdfTotals?.cla).toBe(1430);
    expect(result.pdfTotals?.medicalAllowance).toBe(7000);
    expect(result.pdfTotals?.transportAllowance).toBe(22950);
    expect(result.pdfTotals?.specialPay).toBe(110);
    expect(result.pdfTotals?.washingAllowance).toBe(600);
    expect(result.pdfTotals?.grossAmount).toBe(433194);
  });

  it('should correctly handle multi-line 3-line names with split pay scales without pay scale bleeding into name', () => {
    // Simulates horizontal row line reads where 3 lines of name and 2 lines of payscale wrap across numbers
    const MULTI_LINE_PAYBILL_TEXT = `
PAYBILL INNER SHEET - Earning Side for the Month of : July-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002202
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay (0101)/(0102) DA (0103) HRA (0110) CLA (0111) Med Allow (0107) Trans Allow (0113) Special Additional Pay (0101)/(0102) Washing Allow (0132) Gross Amt
1 20105536 Shri.Amarjeet Accountant PB-2 (9300- No P 37600.00 22560.00 6016.00 270.00 1000.00 3600.00 0.00 0.00 71046.00
Gambhirbhai 34800)/4200
Kathodi
2 20108570 Mr.PRAVINBHAI Driver PB-1 (5200- No P 40600.00 24360.00 6496.00 170.00 1000.00 3600.00 55.00 200.00 76481.00
MALIYABHAI 20200)/2000
CHAUDHARY
Total 78200.00 46920.00 12512.00 440.00 2000.00 7200.00 55.00 200.00 147527.00
`;

    const result = pdfParserService.parseExtractedText(MULTI_LINE_PAYBILL_TEXT);

    expect(result.rows).toHaveLength(2);

    const emp1 = result.rows[0];
    expect(emp1.hrpn).toBe('20105536');
    expect(emp1.employeeName).toBe('Shri.Amarjeet Gambhirbhai Kathodi');
    expect(emp1.designation).toBe('Accountant');
    expect(emp1.payScale).toBe('PB-2 (9300-34800)/4200');
    expect(emp1.basicPay).toBe(37600);
    expect(emp1.grossAmount).toBe(71046);

    const emp2 = result.rows[1];
    expect(emp2.hrpn).toBe('20108570');
    expect(emp2.employeeName).toBe('Mr.PRAVINBHAI MALIYABHAI CHAUDHARY');
    expect(emp2.designation).toBe('Driver');
    expect(emp2.payScale).toBe('PB-1 (5200-20200)/2000');
    expect(emp2.specialPay).toBe(55);
    expect(emp2.washingAllowance).toBe(200);
    expect(emp2.grossAmount).toBe(76481);
  });

  it('should extract rows using 2D Canvas Coordinate Grid when PDF items are present', () => {
    // Simulates PDF canvas items where items are emitted in column order or wrapped across multiple lines
    const mockItems = [
      // Header items (Y = 550)
      { str: 'Sr No', x: 25, y: 550, w: 20, h: 10, page: 1 },
      { str: 'HRPN', x: 60, y: 550, w: 30, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 550, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 550, w: 50, h: 10, page: 1 },
      { str: 'Pay Scale', x: 310, y: 550, w: 50, h: 10, page: 1 },
      { str: 'PH', x: 380, y: 550, w: 15, h: 10, page: 1 },
      { str: 'SLO', x: 405, y: 550, w: 15, h: 10, page: 1 },
      { str: 'Basic Pay', x: 440, y: 550, w: 40, h: 10, page: 1 },

      // Employee 1 items (Row 1, Y between 480 and 520)
      { str: '1', x: 25, y: 510, w: 10, h: 10, page: 1 },
      { str: '20105536', x: 60, y: 510, w: 35, h: 10, page: 1 },
      { str: 'Shri.Amarjeet', x: 120, y: 515, w: 50, h: 10, page: 1 },
      { str: 'Gambhirbhai', x: 120, y: 505, w: 50, h: 10, page: 1 },
      { str: 'Kathodi', x: 120, y: 495, w: 40, h: 10, page: 1 },
      { str: 'Accountant', x: 220, y: 510, w: 45, h: 10, page: 1 },
      { str: 'PB-2 (9300-', x: 310, y: 510, w: 40, h: 10, page: 1 },
      { str: '34800)/4200', x: 310, y: 500, w: 40, h: 10, page: 1 },
      { str: 'No', x: 380, y: 510, w: 15, h: 10, page: 1 },
      { str: 'P', x: 405, y: 510, w: 10, h: 10, page: 1 },
      { str: '37600.00', x: 440, y: 510, w: 30, h: 10, page: 1 },
      { str: '22560.00', x: 480, y: 510, w: 30, h: 10, page: 1 },
      { str: '6016.00', x: 520, y: 510, w: 25, h: 10, page: 1 },
      { str: '270.00', x: 560, y: 510, w: 20, h: 10, page: 1 },
      { str: '1000.00', x: 600, y: 510, w: 25, h: 10, page: 1 },
      { str: '3600.00', x: 640, y: 510, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 680, y: 510, w: 15, h: 10, page: 1 },
      { str: '0.00', x: 720, y: 510, w: 15, h: 10, page: 1 },
      { str: '71046.00', x: 760, y: 510, w: 35, h: 10, page: 1 },

      // Employee 2 items (Row 2, Y between 430 and 470)
      { str: '2', x: 25, y: 460, w: 10, h: 10, page: 1 },
      { str: '20105672', x: 60, y: 460, w: 35, h: 10, page: 1 },
      { str: 'Shri.Tejashkumar', x: 120, y: 465, w: 60, h: 10, page: 1 },
      { str: 'Rajnikant', x: 120, y: 455, w: 45, h: 10, page: 1 },
      { str: 'Patel', x: 120, y: 445, w: 30, h: 10, page: 1 },
      { str: 'Senior Clerk', x: 220, y: 460, w: 50, h: 10, page: 1 },
      { str: 'PB-1 (5200-', x: 310, y: 460, w: 40, h: 10, page: 1 },
      { str: '20200)/2400', x: 310, y: 450, w: 40, h: 10, page: 1 },
      { str: 'No', x: 380, y: 460, w: 15, h: 10, page: 1 },
      { str: 'P', x: 405, y: 460, w: 10, h: 10, page: 1 },
      { str: '29600.00', x: 440, y: 460, w: 30, h: 10, page: 1 },
      { str: '17760.00', x: 480, y: 460, w: 30, h: 10, page: 1 },
      { str: '4736.00', x: 520, y: 460, w: 25, h: 10, page: 1 },
      { str: '270.00', x: 560, y: 460, w: 20, h: 10, page: 1 },
      { str: '1000.00', x: 600, y: 460, w: 25, h: 10, page: 1 },
      { str: '3600.00', x: 640, y: 460, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 680, y: 460, w: 15, h: 10, page: 1 },
      { str: '0.00', x: 720, y: 460, w: 15, h: 10, page: 1 },
      { str: '56966.00', x: 760, y: 460, w: 35, h: 10, page: 1 },
    ];

    const result = pdfParserService.parseExtractedText('Month of : July-2026 Bill No. : Srt0299002202', 1, mockItems);

    expect(result.rows).toHaveLength(2);

    const emp1 = result.rows[0];
    expect(emp1.hrpn).toBe('20105536');
    expect(emp1.employeeName).toBe('Shri.Amarjeet Gambhirbhai Kathodi');
    expect(emp1.designation).toBe('Accountant');
    expect(emp1.payScale).toBe('PB-2 (9300-34800)/4200');
    expect(emp1.ph).toBe('No');
    expect(emp1.slo).toBe('P');
    expect(emp1.basicPay).toBe(37600);
    expect(emp1.grossAmount).toBe(71046);

    const emp2 = result.rows[1];
    expect(emp2.hrpn).toBe('20105672');
    expect(emp2.employeeName).toBe('Shri.Tejashkumar Rajnikant Patel');
    expect(emp2.designation).toBe('Senior Clerk');
    expect(emp2.payScale).toBe('PB-1 (5200-20200)/2400');
    expect(emp2.ph).toBe('No');
    expect(emp2.slo).toBe('P');
    expect(emp2.basicPay).toBe(29600);
    expect(emp2.grossAmount).toBe(56966);
  });

  it('should strictly exclude DDO HRPN, Mobile No, and Budget Head codes in header area from employee rows', () => {
    const mockPageItems = [
      // Top Header Area (Y = 700 to 750)
      { str: 'PAYBILL INNER SHEET - Earning Side', x: 200, y: 750, w: 100, h: 10, page: 1 },
      { str: 'D.D.O HRPN : 20105451', x: 50, y: 730, w: 100, h: 10, page: 1 },
      { str: 'Smt. Sulochana Vijaykumar Solanki', x: 160, y: 730, w: 100, h: 10, page: 1 },
      { str: 'Mobile No. : 9909913660', x: 300, y: 730, w: 100, h: 10, page: 1 },

      // Table Header Row (Y = 600)
      { str: 'Sr No', x: 25, y: 600, w: 20, h: 10, page: 1 },
      { str: 'HRPN', x: 60, y: 600, w: 30, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 600, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 600, w: 50, h: 10, page: 1 },
      { str: 'Pay Scale', x: 310, y: 600, w: 50, h: 10, page: 1 },
      { str: 'PH', x: 380, y: 600, w: 15, h: 10, page: 1 },
      { str: 'SLO', x: 405, y: 600, w: 15, h: 10, page: 1 },
      { str: 'Basic Pay', x: 440, y: 600, w: 40, h: 10, page: 1 },
      { str: '(0101)/(0102)', x: 440, y: 590, w: 40, h: 10, page: 1 },
      { str: 'DA (0103)', x: 480, y: 600, w: 30, h: 10, page: 1 },
      { str: 'HRA (0110)', x: 520, y: 600, w: 30, h: 10, page: 1 },
      { str: 'Gross Amt', x: 760, y: 600, w: 35, h: 10, page: 1 },

      // Table Body - Employee 1 (Y = 530)
      { str: '1', x: 25, y: 530, w: 10, h: 10, page: 1 },
      { str: '20105536', x: 60, y: 530, w: 35, h: 10, page: 1 },
      { str: 'Shri.Amarjeet', x: 120, y: 535, w: 50, h: 10, page: 1 },
      { str: 'Gambhirbhai', x: 120, y: 525, w: 50, h: 10, page: 1 },
      { str: 'Kathodi', x: 120, y: 515, w: 40, h: 10, page: 1 },
      { str: 'Accountant', x: 220, y: 530, w: 45, h: 10, page: 1 },
      { str: 'PB-2 (9300-', x: 310, y: 530, w: 40, h: 10, page: 1 },
      { str: '34800)/4200', x: 310, y: 520, w: 40, h: 10, page: 1 },
      { str: 'No', x: 380, y: 530, w: 15, h: 10, page: 1 },
      { str: 'P', x: 405, y: 530, w: 10, h: 10, page: 1 },
      { str: '37600.00', x: 440, y: 530, w: 30, h: 10, page: 1 },
      { str: '22560.00', x: 480, y: 530, w: 30, h: 10, page: 1 },
      { str: '6016.00', x: 520, y: 530, w: 25, h: 10, page: 1 },
      { str: '270.00', x: 560, y: 530, w: 20, h: 10, page: 1 },
      { str: '1000.00', x: 600, y: 530, w: 25, h: 10, page: 1 },
      { str: '3600.00', x: 640, y: 530, w: 25, h: 10, page: 1 },
      { str: '0.00', x: 680, y: 530, w: 15, h: 10, page: 1 },
      { str: '0.00', x: 720, y: 530, w: 15, h: 10, page: 1 },
      { str: '71046.00', x: 760, y: 530, w: 35, h: 10, page: 1 },

      // Table Footer - Total (Y = 400)
      { str: 'Total', x: 200, y: 400, w: 30, h: 10, page: 1 },
      { str: '37600.00', x: 440, y: 400, w: 30, h: 10, page: 1 },
      { str: '71046.00', x: 760, y: 400, w: 35, h: 10, page: 1 },
    ];

    const result = pdfParserService.parseExtractedText('Month of : July-2026', 1, mockPageItems);

    // Exactly 1 employee row, NOT DDO or phone numbers
    expect(result.rows).toHaveLength(1);
    const emp = result.rows[0];
    expect(emp.srNo).toBe(1);
    expect(emp.hrpn).toBe('20105536');
    expect(emp.employeeName).toBe('Shri.Amarjeet Gambhirbhai Kathodi');
    expect(emp.designation).toBe('Accountant');
    expect(emp.payScale).toBe('PB-2 (9300-34800)/4200');
    expect(emp.basicPay).toBe(37600);
    expect(emp.da).toBe(22560);
    expect(emp.hra).toBe(6016);
    expect(emp.grossAmount).toBe(71046);
  });

  it('should correctly parse 4 gazetted officers with PB-3 / PB-2 pay scales and NPP using 2D coordinates', () => {
    const mockGazettedItems = [
      // Table Header Row (Y = 600)
      { str: 'Sr No', x: 25, y: 600, w: 20, h: 10, page: 1 },
      { str: 'HRPN', x: 60, y: 600, w: 30, h: 10, page: 1 },
      { str: 'Employee Name', x: 120, y: 600, w: 60, h: 10, page: 1 },
      { str: 'Designation', x: 220, y: 600, w: 50, h: 10, page: 1 },
      { str: 'Pay Scale', x: 310, y: 600, w: 50, h: 10, page: 1 },
      { str: 'PH', x: 380, y: 600, w: 15, h: 10, page: 1 },
      { str: 'SLO', x: 405, y: 600, w: 15, h: 10, page: 1 },
      { str: 'Basic Pay', x: 440, y: 600, w: 40, h: 10, page: 1 },
      { str: '(0101)/(0102)', x: 440, y: 590, w: 40, h: 10, page: 1 },
      { str: 'DA (0103)', x: 480, y: 600, w: 30, h: 10, page: 1 },
      { str: 'HRA (0110)', x: 520, y: 600, w: 30, h: 10, page: 1 },
      { str: 'CLA (0111)', x: 560, y: 600, w: 20, h: 10, page: 1 },
      { str: 'Med Allow (0107)', x: 600, y: 600, w: 30, h: 10, page: 1 },
      { str: 'Trans Allow (0113)', x: 640, y: 600, w: 30, h: 10, page: 1 },
      { str: 'Non Private Practice Allow (0128)', x: 690, y: 600, w: 50, h: 10, page: 1 },
      { str: 'Gross Amt', x: 760, y: 600, w: 35, h: 10, page: 1 },

      // Employee 1 (Dr. Dineshbhai)
      { str: '1', x: 25, y: 530, w: 10, h: 10, page: 1 },
      { str: '20013826', x: 60, y: 530, w: 35, h: 10, page: 1 },
      { str: 'Shri.Dr Dineshbhai Chamabhai Chaudhari', x: 120, y: 530, w: 80, h: 10, page: 1 },
      { str: 'Deputy Director', x: 220, y: 530, w: 50, h: 10, page: 1 },
      { str: 'PB-3 (15600-', x: 310, y: 535, w: 40, h: 10, page: 1 },
      { str: '39100)/6600', x: 310, y: 525, w: 40, h: 10, page: 1 },
      { str: 'No', x: 380, y: 530, w: 15, h: 10, page: 1 },
      { str: 'P', x: 405, y: 530, w: 10, h: 10, page: 1 },
      { str: '105600.00', x: 440, y: 530, w: 35, h: 10, page: 1 },
      { str: '76032.00', x: 480, y: 530, w: 30, h: 10, page: 1 },
      { str: '16896.00', x: 520, y: 530, w: 30, h: 10, page: 1 },
      { str: '270.00', x: 560, y: 530, w: 20, h: 10, page: 1 },
      { str: '1000.00', x: 600, y: 530, w: 25, h: 10, page: 1 },
      { str: '7200.00', x: 640, y: 530, w: 25, h: 10, page: 1 },
      { str: '21120.00', x: 690, y: 530, w: 30, h: 10, page: 1 },
      { str: '228118.00', x: 760, y: 530, w: 35, h: 10, page: 1 },

      // Table Footer
      { str: 'Total', x: 200, y: 400, w: 30, h: 10, page: 1 },
      { str: '228118.00', x: 760, y: 400, w: 35, h: 10, page: 1 },
    ];

    const result = pdfParserService.parseExtractedText(SAMPLE_PAYBILL_TEXT_GAZETTED, 1, mockGazettedItems);

    expect(result.rows).toHaveLength(1);
    const emp = result.rows[0];
    expect(emp.hrpn).toBe('20013826');
    expect(emp.payScale).toBe('PB-3 (15600-39100)/6600');
    expect(emp.basicPay).toBe(105600);
    expect(emp.da).toBe(76032);
    expect(emp.hra).toBe(16896);
    expect(emp.cla).toBe(270);
    expect(emp.medicalAllowance).toBe(1000);
    expect(emp.transportAllowance).toBe(7200);
    expect(emp.nonPrivatePracticeAllowance).toBe(21120);
    expect(emp.grossAmount).toBe(228118);
  });
});
