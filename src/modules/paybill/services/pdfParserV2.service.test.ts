import { describe, it, expect } from 'vitest';
import { pdfParserV2Service } from './pdfParserV2.service';

const EIGHT_COL = `
PAYBILL INNER SHEET - Deduction Side for the Month of : April-2026
D.D.O HRPN : 20105451 Bill No. : Srt0299002202
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) HBA Interest (9591) GPF Reg (9670) GPF Reg Class 4 (9531) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20105451 Smt.Sulochana Vijaykumar Solanki Office Superintendent 6268.00 200.00 0.00 20000.00 0.00 0.00 240.00 560.00 27268.00 85830.00
2 20105536 Shri.Amarjeet Gambhirbhai Kathodi Accountant 0.00 200.00 0.00 0.00 0.00 5941.00 120.00 280.00 6541.00 63753.00
Total 6268.00 200.00 0.00 20000.00 0.00 5941.00 360.00 840.00 33809.00 149583.00
`;

const SIX_COL = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
D.D.O HRPN : 20014113 Bill No. : Srt0299002201
Sr No HRPN Employee Name Designation Income Tax (9510) Prof Tax (9570) GPF Reg (9670) NPS Reg (9534) Govt Fund (9581) Govt Saving (9582) Total Ded Net Pay
1 20013826 Shri.Dr Dineshbhai Chamabhai Chaudhari Deputy Director (Animal Husbandary) 30043.00 200.00 0.00 16195.00 480.00 1120.00 48038.00 171172.00
2 20014113 Shri.Dr Hitendrabhai Manilal Patidar Assistant Director 37677.00 200.00 40000.00 0.00 480.00 1120.00 79477.00 164199.00
Total 67720.00 400.00 40000.00 16195.00 960.00 2240.00 127515.00 335371.00
`;

const PT_ONLY = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
D.D.O HRPN : 20014113 Bill No. : Srt0299002204
Sr No HRPN Employee Name Designation Prof Tax (9570) Total Ded Net Pay
1 20110757 Shri.Mikikumar Bharatbhai Chaudhari Live Stock Inspector Ambheti 200.00 200.00 25800.00
2 20477200 Mr.ANKITKUMAR MUKESHBHAI CHAUDHARI Junior Clerk 200.00 200.00 25800.00
Total 400.00 400.00 51600.00
`;

const EARNING = `
PAYBILL INNER SHEET - Earning Side for the Month of : July-2026
D.D.O HRPN : 20105451 Bill No. : Srt0299002201
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay (0101)/(0102) DA (0103) HRA (0110) CLA (0111) Med Allow (0107) Trans Allow (0113) Gross Amt
1 20105536 Shri.Amarjeet Gambhirbhai Kathodi Accountant PB-2 No P 37600.00 22560.00 6016.00 270.00 1000.00 3600.00 71046.00
Total 37600.00 22560.00 6016.00 270.00 1000.00 3600.00 71046.00
`;

const SINGLE_ALLOWANCE_EARNING = `
PAYBILL INNER SHEET - Earning Side for the Month of : March-2026
D.D.O HRPN : 20014113 Bill No. : Srt0299002204
Sr No HRPN Employee Name Designation Pay Scale PH SLO Basic Pay (0101)/(0102) Gross Amt
1 20110757 Shri.Mikikumar Bharatbhai Chaudhari Live Stock Inspector Ambheti PB-1 No P 26000.00 26000.00
2 20477200 Mr.ANKITKUMAR MUKESHBHAI CHAUDHARI Junior Clerk PB-1 No P 26000.00 26000.00
Total 52000.00 52000.00
`;

describe('pdfParserV2', () => {
  it('parses full 8-column deduction sheets', () => {
    const r = pdfParserV2Service.parseExtractedText(EIGHT_COL);
    expect(r.sheetType).toBe('DEDUCTION');
    expect(r.deductionRows).toHaveLength(2);
    expect(r.deductionRows![0].incomeTax).toBe(6268);
    expect(r.deductionRows![1].npsRegular).toBe(5941);
    expect(r.pdfDeductionTotals!.totalDeductions).toBe(33809);
  });

  it('parses 6-column sheets with omitted HBA/Class-4 without shifting', () => {
    const r = pdfParserV2Service.parseExtractedText(SIX_COL);
    expect(r.deductionRows).toHaveLength(2);
    expect(r.deductionRows![0].incomeTax).toBe(30043);
    expect(r.deductionRows![0].npsRegular).toBe(16195);
    expect(r.deductionRows![0].hbaInterest).toBe(0);
    expect(r.deductionRows![1].gpfRegular).toBe(40000);
    expect(r.deductionRows![0].designation).toMatch(/Deputy Director/i);
  });

  it('parses minimal single-column PT-only sheets', () => {
    const r = pdfParserV2Service.parseExtractedText(PT_ONLY);
    expect(r.sheetType).toBe('DEDUCTION');
    expect(r.deductionRows).toHaveLength(2);
    expect(r.deductionRows![0].profTax).toBe(200);
    expect(r.deductionRows![0].totalDeductions).toBe(200);
    expect(r.deductionRows![0].netPay).toBe(25800);
    expect(r.deductionRows![0].designation).toMatch(/Live Stock Inspector/i);
    expect(r.deductionRows![1].designation).toMatch(/Junior Clerk/i);
  });

  it('parses earning sheets', () => {
    const r = pdfParserV2Service.parseExtractedText(EARNING);
    expect(r.sheetType).toBe('EARNING');
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0].basicPay).toBe(37600);
    expect(r.rows[0].grossAmount).toBe(71046);
  });

  it('parses minimal single-column earning sheet without assigning gross to special pay', () => {
    const r = pdfParserV2Service.parseExtractedText(SINGLE_ALLOWANCE_EARNING);
    expect(r.sheetType).toBe('EARNING');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0].basicPay).toBe(26000);
    expect(r.rows[0].specialPay).toBe(0);
    expect(r.rows[0].grossAmount).toBe(26000);
    expect(r.rows[1].basicPay).toBe(26000);
    expect(r.rows[1].specialPay).toBe(0);
    expect(r.rows[1].grossAmount).toBe(26000);
    expect(r.pdfTotals?.basicPay).toBe(52000);
    expect(r.pdfTotals?.specialPay).toBe(0);
    expect(r.pdfTotals?.grossAmount).toBe(52000);
  });

  it('keeps full names with station posts on wrapped rows', () => {
    const text = `
PAYBILL INNER SHEET - Deduction Side for the Month of : March-2026
Sr
No
HRPN Employee Name Designation Prof Tax (9570) Total Ded Net Pay
1 20110757
Shri.Mikikumar
Bharatbhai
Chaudhari
Live Stock Inspector
Ambheti
200.00 200.00 25800.00
4 20111144
Ms.Rachanaben
Vitthalbhai
patel
Live Stock Inspector Sayan 200.00 200.00 25800.00
Total 400.00 400.00 51600.00
`;
    const r = pdfParserV2Service.parseExtractedText(text);
    expect(r.deductionRows).toHaveLength(2);
    expect(r.deductionRows![0].employeeName).toBe('Shri.Mikikumar Bharatbhai Chaudhari');
    expect(r.deductionRows![0].designation).toBe('Live Stock Inspector Ambheti');
    expect(r.deductionRows![1].employeeName).toBe('Ms.Rachanaben Vitthalbhai patel');
    expect(r.deductionRows![1].designation).toBe('Live Stock Inspector Sayan');
  });

  it('detects combined sheets with both tables', () => {
    const r = pdfParserV2Service.parseExtractedText(`${EARNING}\n${EIGHT_COL}`);
    expect(r.sheetType).toBe('COMBINED');
    expect(r.rows.length).toBeGreaterThan(0);
    expect(r.deductionRows!.length).toBeGreaterThan(0);
  });

  it('parses real downloaded paybill 8 via pdfParserV2Service.parsePdf', async () => {
    // @ts-expect-error node fs module for local integration test
    const fs = await import('fs');
    const path = 'C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (8).pdf';
    if (!fs.existsSync(path)) return;
    const buf = fs.readFileSync(path);
    const res = await pdfParserV2Service.parsePdf(buf);

    expect(res.rows).toHaveLength(8);
    expect(res.rows[0].hrpn).toBe('20110757');
    expect(res.rows[0].employeeName).toBe('Shri.Mikikumar Bharatbhai Chaudhari');
    expect(res.rows[0].designation).toBe('Live Stock Inspector Ambheti');
    expect(res.rows[0].basicPay).toBe(26000);
    expect(res.rows[0].specialPay).toBe(0);
    expect(res.rows[0].grossAmount).toBe(26000);

    expect(res.rows[1].hrpn).toBe('20112224');
    expect(res.rows[1].employeeName).toBe('Shri.Nikhil Prakashchandra Sagar');
    expect(res.rows[1].designation).toBe('Live Stock Inspector Borbodhan');

    expect(res.rows[2].hrpn).toBe('20111003');
    expect(res.rows[2].employeeName).toBe('Shri.Ronakkumar Bhupendrakumar Chaudhari');
    expect(res.rows[2].designation).toBe('Live Stock Inspector Dindoli');

    expect(res.rows[3].hrpn).toBe('20111144');
    expect(res.rows[3].employeeName).toBe('Ms.Rachanaben Vitthalbhai patel');
    expect(res.rows[3].designation).toBe('Live Stock Inspector Sayan');

    expect(res.rows[7].hrpn).toBe('20477200');
    expect(res.rows[7].employeeName).toBe('Mr.ANKITKUMAR MUKESHBHAI CHAUDHARI');
    expect(res.rows[7].designation).toBe('Junior Clerk');
  });

  it('parses real downloaded deduction bill 10 via pdfParserV2Service.parsePdf', async () => {
    // @ts-expect-error node fs module for local integration test
    const fs = await import('fs');
    const path = 'C:/Users/amarj/Downloads/Pay Bill Inner Deduction Report (10).pdf';

    if (!fs.existsSync(path)) return;
    const buf = fs.readFileSync(path);
    const res = await pdfParserV2Service.parsePdf(buf);

    expect(res.sheetType).toBe('DEDUCTION');
    expect(res.deductionRows).toBeDefined();
    expect(res.deductionRows!.length).toBeGreaterThan(0);
    expect(res.deductionRows![0].hrpn).toBe('20013826');
    expect(res.deductionRows![0].employeeName).toBe('Shri.Dr Dineshbhai Chamabhai Chaudhari');
    expect(res.deductionRows![0].designation).toBe('Deputy Director (Animal Husbandary)');
    expect(res.deductionRows![0].incomeTax).toBe(30043);
    expect(res.deductionRows![0].profTax).toBe(200);
    expect(res.deductionRows![0].npsRegular).toBe(16195);
    expect(res.deductionRows![0].totalDeductions).toBe(48038);
    expect(res.deductionRows![0].netPay).toBe(171172);

    expect(res.deductionRows![1].hrpn).toBe('20014113');
    expect(res.deductionRows![1].employeeName).toBe('Shri.Dr Hitendrabhai Manilal Patidar');
    expect(res.deductionRows![1].designation).toBe('Assistant Director');
    expect(res.deductionRows![1].incomeTax).toBe(37677);
  });

  it('parses multi-page Bill 2203 without duplicate rows across pages', async () => {
    // @ts-expect-error node fs module for local integration test
    const fs = await import('fs');
    const pEarning13 = `C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (13).pdf`;
    if (!fs.existsSync(pEarning13)) return;

    const buf = fs.readFileSync(pEarning13);
    const res = await pdfParserV2Service.parsePdf(buf);

    expect(res.metadata.billNo).toBe('Srt0299002203');
    expect(res.rows).toHaveLength(26);
    expect(res.pdfTotals?.grossAmount).toBe(2453488);
    expect(res.pdfTotals?.basicPay).toBe(1297300);

    // Sum of all 26 rows matches PDF total exactly
    const sumGross = res.rows.reduce((s, r) => s + r.grossAmount, 0);
    const sumBasic = res.rows.reduce((s, r) => s + r.basicPay, 0);
    expect(sumGross).toBe(2453488);
    expect(sumBasic).toBe(1297300);

    // Verify first and last employees on 3-page bill
    expect(res.rows[0].employeeName).toBe('Shri.Kalpeshkumar Chimanbhai Rathod');
    expect(res.rows[0].designation).toBe('Live Stock Inspector Barasadi');

    expect(res.rows[25].employeeName).toBe('Shri.Mahendrasinh Raymalsinh Bariya');
    expect(res.rows[25].designation).toBe('Live Stock Inspector Karjan');

    // Deduction side of 3-page bill 2203
    const pDed12 = `C:/Users/amarj/Downloads/Pay Bill Inner Deduction Report (12).pdf`;
    if (fs.existsSync(pDed12)) {
      const dedBuf = fs.readFileSync(pDed12);
      const dedRes = await pdfParserV2Service.parsePdf(dedBuf);
      expect(dedRes.metadata.billNo).toBe('Srt0299002203');
      expect(dedRes.deductionRows).toHaveLength(26);
      expect(dedRes.pdfDeductionTotals?.totalDeductions).toBe(488530);
    }
  });

  it('parses all March 2026 bills (2202, 2204, 2205, 2206) with correct counts', async () => {
    // @ts-expect-error node fs module for local integration test
    const fs = await import('fs');

    // Bill 2202 (Earning 12)
    const pEarning12 = `C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (12).pdf`;
    if (fs.existsSync(pEarning12)) {
      const res = await pdfParserV2Service.parsePdf(fs.readFileSync(pEarning12));
      expect(res.metadata.billNo).toBe('Srt0299002202');
      expect(res.rows).toHaveLength(8);
      expect(res.pdfTotals?.grossAmount).toBe(532884);
    }

    // Bill 2204 (Earning 14)
    const pEarning14 = `C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (14).pdf`;
    if (fs.existsSync(pEarning14)) {
      const res = await pdfParserV2Service.parsePdf(fs.readFileSync(pEarning14));
      expect(res.metadata.billNo).toBe('Srt0299002204');
      expect(res.rows).toHaveLength(8);
      expect(res.pdfTotals?.grossAmount).toBe(208000);
    }

    // Bill 2205 (Earning 15)
    const pEarning15 = `C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (15).pdf`;
    if (fs.existsSync(pEarning15)) {
      const res = await pdfParserV2Service.parsePdf(fs.readFileSync(pEarning15));
      expect(res.metadata.billNo).toBe('Srt0299002205');
      expect(res.rows).toHaveLength(1);
      expect(res.pdfTotals?.grossAmount).toBe(276572);
    }

    // Bill 2206 (Earning 16)
    const pEarning16 = `C:/Users/amarj/Downloads/Pay Bill Inner Earning Report (16).pdf`;
    if (fs.existsSync(pEarning16)) {
      const res = await pdfParserV2Service.parsePdf(fs.readFileSync(pEarning16));
      expect(res.metadata.billNo).toBe('Srt0299002206');
      expect(res.rows).toHaveLength(2);
      expect(res.pdfTotals?.grossAmount).toBe(113694);
    }
  });

  it('inspects all deduction files 10 to 15', async () => {
    // @ts-expect-error node fs module for local integration test
    const fs = await import('fs');
    for (const n of ['10', '11', '12', '13', '14', '15']) {
      const p = `C:/Users/amarj/Downloads/Pay Bill Inner Deduction Report (${n}).pdf`;
      if (!fs.existsSync(p)) continue;
      const res = await pdfParserV2Service.parsePdf(fs.readFileSync(p));
      console.log(`Deduction file (${n}):`, {
        billNo: res.metadata.billNo,
        sheetType: res.sheetType,
        rowsCount: res.deductionRows?.length,
        firstRow: res.deductionRows?.[0],
        totals: res.pdfDeductionTotals,
      });
    }
  });

  it('fetches NPPA correctly when the bill has Special + NPP but no Trans column (2203 layout)', () => {
    // Regression: Karmayogi wraps long headers across lines
    // ("Special Additional" / "Pay (0101)/(0102)"). Text detection missed
    // the Special column (it shares codes 0101/0102 with Basic Pay, so it
    // has no code fallback) and every later amount shifted left — NPPA came
    // out as 0 (or as the Special value) for every employee in the bill.
    const text = `
PAYBILL INNER SHEET - Earning Side for the Month of : August-2026
D.D.O HRPN : 20105451 Name of Office : Office of the Deputy Director (ICDP - Surat) Bill No. : Srt0299002203
Sr
No
HRPN Employee Name Designation Pay Scale PH SLO
Basic Pay
(0101)/(0102)
DA (0103) HRA (0110) CLA (0111) Med Allow (0107)
Special Additional
Pay (0101)/(0102)
Non Private Practice
Allow (0128)
Gross Amt
1 20106090 Shri.Kalpeshkumar Chimanbhai Rathod Live Stock Inspector Barasadi PB-1 (5200-20200)/2800 No P 59200.00 40848.00 4736.00 0.00 1000.00 0.00 8880.00 114664.00
7 20106461 Shri.Amrutbhai Hargovanbhai Patel Live Stock Inspector Pipodara PB-2 (9300-34800)/4400 No P 88700.00 61203.00 7096.00 0.00 1000.00 125.00 13305.00 171429.00
14 20108385 Shri.Jignesh Kishorbhai Pethani Live Stock Inspector Parab PB-1 (5200-20200)/2400 No P 30500.00 18300.00 2440.00 0.00 1000.00 0.00 0.00 52240.00
Total 178400.00 120351.00 14272.00 0.00 3000.00 125.00 22185.00 338333.00
`;
    const r = pdfParserV2Service.parseExtractedText(text);
    expect(r.sheetType).toBe('EARNING');
    expect(r.rows).toHaveLength(3);

    // Special 0, NPPA 8880
    expect(r.rows[0].hrpn).toBe('20106090');
    expect(r.rows[0].basicPay).toBe(59200);
    expect(r.rows[0].transportAllowance).toBe(0);
    expect(r.rows[0].specialPay).toBe(0);
    expect(r.rows[0].nonPrivatePracticeAllowance).toBe(8880);
    expect(r.rows[0].grossAmount).toBe(114664);

    // Special 125, NPPA 13305 — Special must not leak into NPPA
    expect(r.rows[1].hrpn).toBe('20106461');
    expect(r.rows[1].specialPay).toBe(125);
    expect(r.rows[1].nonPrivatePracticeAllowance).toBe(13305);
    expect(r.rows[1].grossAmount).toBe(171429);

    // Both zero stays zero, gross still reconciles
    expect(r.rows[2].hrpn).toBe('20108385');
    expect(r.rows[2].specialPay).toBe(0);
    expect(r.rows[2].nonPrivatePracticeAllowance).toBe(0);
    expect(r.rows[2].grossAmount).toBe(52240);
  });
});







