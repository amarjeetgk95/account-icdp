import { pdfParserService } from '../services/pdfParser.service';
import type { PayBillParsedResult } from '../types';

export const SAMPLE_PAYBILL_RAW_TEXT = `
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

const SAMPLE_PAYBILL_RAW_TEXT_CLERICAL = `
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
Rupees (In Words) : FOUR LAKH THIRTY THREE THOUSAND ONE HUNDRED AND NINETY
FOUR ONLY
`;

const SAMPLE_PAYBILL_RAW_TEXT_DEDUCTION = `
Smt. Sulochana Vijaykumar Solanki
Assistant Administrative cum Accounts Officer - DDO
Office of the Deputy Director (ICDP - Surat)
Cardex No : 22
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
karmyogi.gujarat.gov.in/Payrollsalaryfinalization?Billcode : V26✤0CQzVf56oJ3ZugrwVg♬♬
`;

export function loadSamplePayBillData(variant: 'gazetted' | 'clerical' = 'gazetted'): PayBillParsedResult {
  const text = variant === 'clerical' ? SAMPLE_PAYBILL_RAW_TEXT_CLERICAL : SAMPLE_PAYBILL_RAW_TEXT;
  return pdfParserService.parseExtractedText(text, 1);
}

export function loadSamplePayBillDeductionData(): PayBillParsedResult {
  return pdfParserService.parseExtractedText(SAMPLE_PAYBILL_RAW_TEXT_DEDUCTION, 1);
}
