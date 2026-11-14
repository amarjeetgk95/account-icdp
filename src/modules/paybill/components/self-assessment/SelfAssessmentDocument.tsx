import React from 'react';
import type { SelfAssessmentMemo } from '../../types/selfAssessment';
import { inr, inrOrDash, formatDesignation } from '../../utils/selfAssessmentFormat';

interface SelfAssessmentDocumentProps {
  memo: SelfAssessmentMemo;
  id?: string;
}

export const SelfAssessmentDocument: React.FC<SelfAssessmentDocumentProps> = ({
  memo,
  id = 'self-assessment-print-memo',
}) => {
  const isPersonal = memo.preferredFormat === 'PERSONAL' || memo.preferredFormat === 'DANGS';

  return (
    <div
      id={id}
      className="self-assessment-root bg-white text-black font-serif w-full max-w-[210mm] p-[3mm] mx-auto shadow-md print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:border-none box-border"
      style={{ fontFamily: "'Times New Roman', Times, 'Liberation Serif', 'Lohit Gujarati', Shruti, Georgia, serif" }}
    >
      <style>{`
        @font-face {
          font-family: 'Lohit Gujarati';
          src: local('Lohit Gujarati'),
               local('Lohit-Gujarati'),
               url('/fonts/Lohit-Gujarati.ttf') format('truetype');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Lohit Gujarati';
          src: local('Lohit Gujarati'),
               local('Lohit-Gujarati'),
               url('/fonts/Lohit-Gujarati.ttf') format('truetype');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Lohit Gujarati';
          src: local('Lohit Gujarati'),
               local('Lohit-Gujarati'),
               url('/fonts/Lohit-Gujarati.ttf') format('truetype');
          font-weight: 600;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Lohit Gujarati';
          src: local('Lohit Gujarati'),
               local('Lohit-Gujarati'),
               url('/fonts/Lohit-Gujarati.ttf') format('truetype');
          font-weight: bold;
          font-style: normal;
          font-display: swap;
        }
        .font-guj, [lang="gu"] {
          font-family: 'Lohit Gujarati', Shruti, 'Nirmala UI', sans-serif !important;
        }
        .self-assessment-root,
        .self-assessment-root * {
          font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif;
          box-sizing: border-box;
        }
        .self-assessment-root table {
          width: 100% !important;
          border-collapse: separate !important;
          border-spacing: 0 !important;
        }
        .self-assessment-root tr {
          border: none !important;
        }
        .self-assessment-root th,
        .self-assessment-root td {
          box-sizing: border-box !important;
        }
        .self-assessment-root h1,
        .self-assessment-root h2,
        .self-assessment-root h3,
        .self-assessment-root h4,
        .self-assessment-root h5,
        .self-assessment-root h6 {
          font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
        }
        .self-assessment-root .font-guj,
        .self-assessment-root [lang="gu"] {
          font-family: 'Lohit Gujarati', Shruti, 'Nirmala UI', sans-serif !important;
        }
        @page {
          size: A4 portrait;
          margin: 3.5mm 4mm !important;
        }
        @media print {
          *, *:before, *:after {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box !important;
          }
          html, body {
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Times New Roman', Times, 'Liberation Serif', 'Lohit Gujarati', Shruti, Georgia, serif !important;
          }
          .self-assessment-root,
          .self-assessment-root * {
            font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
          }
          .self-assessment-root h1,
          .self-assessment-root h2,
          .self-assessment-root h3,
          .self-assessment-root h4,
          .self-assessment-root h5,
          .self-assessment-root h6 {
            font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
          }
          .font-guj, [lang="gu"],
          .self-assessment-root .font-guj,
          .self-assessment-root [lang="gu"] {
            font-family: 'Lohit Gujarati', Shruti, 'Nirmala UI', sans-serif !important;
          }
          #self-assessment-print-memo,
          .self-assessment-root {
            width: 100% !important;
            max-width: 202mm !important;
            margin: 0 auto !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .self-assessment-root table {
            width: 100% !important;
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          .self-assessment-root tr {
            border: none !important;
          }
          .self-assessment-root .signature-block {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
      {isPersonal ? <PersonalTemplate memo={memo} /> : <StandardTemplate memo={memo} />}
    </div>
  );
};

/**
 * Format 1: Personal (DTO Dangs format) layout - Single A4 Page Optimized
 */
const PersonalTemplate: React.FC<{ memo: SelfAssessmentMemo }> = ({ memo }) => {
  const w = memo.working;
  const m = memo.monthlyTds;
  const fyText = `${memo.financialYear}-${String(memo.financialYear + 1).slice(-2)}`;
  const ayText = memo.assessmentYear;

  const displayOfficeName = memo.departmentName?.toUpperCase().startsWith('OFFICE OF')
    ? memo.departmentName
    : (memo.departmentName || 'DISTRICT TREASURY OFFICE');

  return (
    <div className="border border-black">
      {/* Top Header */}
      <div className="text-center py-1 border-b border-black">
        {/* Office Letterhead */}
        <div className="pb-0.5">
          <h1 className="text-[10pt] font-bold uppercase tracking-wider text-black leading-tight">
            {displayOfficeName}
          </h1>
          {memo.departmentDivision ? (
            <p className="text-[8pt] font-medium text-black mt-0.5 leading-tight">
              {memo.departmentDivision}
            </p>
          ) : null}
        </div>

        {/* Hairline Divider */}
        <div className="w-56 mx-auto border-t border-black/40 my-0.5"></div>

        {/* Memo Period */}
        <p className="font-bold text-[8pt] mt-0.5 leading-tight text-black">
          Self Assessment Income Tax Calculation Memo for Accounting Year{' '}
          <span className="font-bold underline">{fyText}</span> And Assessment Year{' '}
          <span className="font-bold underline">{ayText}</span>
        </p>
      </div>

      {/* Particulars Table */}
      <table className="w-full text-[8pt] leading-normal" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <tbody>
          <tr>
            <td className="w-[18%] px-2 py-1 border-r border-b border-black font-semibold align-middle">
              Name :
            </td>
            <td className="w-[32%] px-2 py-1 border-r border-b border-black uppercase font-bold align-middle">
              {memo.taxpayerName || '—'}
            </td>
            <td className="w-[18%] px-2 py-1 border-r border-b border-black font-semibold align-middle">
              Designation :
            </td>
            <td className="w-[32%] px-2 py-1 border-b border-black uppercase align-middle">
              {formatDesignation(memo.designation) || 'RETIRED GOVERNMENT EMPLOYEE'}
            </td>
          </tr>
          <tr>
            <td className="px-2 py-1 border-r border-b border-black font-semibold align-middle">
              Address :
            </td>
            <td className="px-2 py-1 border-r border-b border-black align-middle">
              {memo.residentialAddress || memo.district || '—'}
            </td>
            <td className="px-2 py-1 border-r border-b border-black font-semibold align-middle">
              PAN / EMP ID :
            </td>
            <td className="px-2 py-1 border-b border-black align-middle">
              <span className="font-bold tracking-wider">{memo.pan || '—'}</span> &nbsp;/&nbsp; <span className="font-bold">{memo.employeeIdOrPsn || memo.hrpn || '—'}</span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Main Income & Tax Calculation Table */}
      <table className="w-full text-[8pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr className="font-bold text-center bg-slate-100">
            <th className="w-6 border-r border-b border-black py-1 align-middle">No.</th>
            <th className="border-r border-b border-black px-2 py-1 text-left align-middle">Particular</th>
            <th className="w-20 border-r border-b border-black px-1.5 py-1 text-right align-middle">Details Rs.</th>
            <th className="w-24 border-b border-black px-1.5 py-1 text-right align-middle">Total Rs.</th>
          </tr>
        </thead>
        <tbody>
          {/* Row 1: Income */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black align-middle py-[2.5px]">1</td>
            <td colSpan={3} className="px-2 font-bold border-b border-black py-[2.5px] align-middle">
              Income :
            </td>
          </tr>

          {/* 1[a] Gross Salary */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">
              [a] Gross Salary Income (Statement enclose) PAY+DA+D.PAY+HRA+CLA+MA+TA and Other Allowance
            </td>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-1.5 py-[2.5px] text-right font-medium border-b border-black/30 align-middle">
              {inr(memo.grossSalaryTotal)}
            </td>
          </tr>

          {/* 1[b] Honorarium/Bonus */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">
              [b] Honorarium, Bonus, Bank NSC Interest, House Rent Income
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.honorariumBonus)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[c] Bonus */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[c] Bonus</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.bonus)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[d] Bank Interest */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[d] Bank Interest</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.bankInterest)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[e] NSC Interest */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[e] NSC Interest</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.nscInterest)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[f] House Rent Income */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[f] House Rent Income</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.housePropertyIncome)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[g] Retirement Gratuity */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[g] Retirement Gratuity</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.retirementGratuity)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[h] Leave Salary */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">
              [h] Leave Salary in Retirement Govt. Employee (U/s 10 10AA)
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.leaveSalaryEncashment)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[i] Retrenchment */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">[i] Retrenchment Compensation</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.retrenchmentCompensation)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[j] Agricultural */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">
              [j] Agricultural Income <span className="text-[7pt] text-slate-600">(U/s Section 10(1) Ded. Max. 5000)</span>
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(memo.agriculturalIncome)}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[k] Family Pension */}
          <tr>
            <td className="border-r border-b border-black/30 py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black/30 align-middle">
              [k] Family Pension <span className="text-[7pt] text-slate-600">(U/s 57(iia) Ded. Max. 25000 or 1/3 which is less)</span>
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black/30 align-middle">
              {inrOrDash(Math.max(0, memo.familyPensionGross - memo.familyPensionDeduction57iia))}
            </td>
            <td className="border-b border-black/30 py-[2.5px]"></td>
          </tr>

          {/* 1[l] Other Income */}
          <tr>
            <td className="border-r border-b border-black py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black align-middle">[l] Other Income Sources [ if any ]</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black align-middle">
              {inrOrDash(memo.otherIncomeSources)}
            </td>
            <td className="border-b border-black py-[2.5px]"></td>
          </tr>

          {/* Subtotal of [b] to [l] */}
          <tr className="font-medium">
            <td className="border-r border-b border-black py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">Total [b] to [l]</td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black font-semibold align-middle">
              {inr(
                memo.honorariumBonus +
                  memo.bonus +
                  memo.bankInterest +
                  memo.nscInterest +
                  memo.housePropertyIncome +
                  memo.retirementGratuity +
                  memo.leaveSalaryEncashment +
                  memo.retrenchmentCompensation +
                  memo.agriculturalIncome +
                  Math.max(0, memo.familyPensionGross - memo.familyPensionDeduction57iia) +
                  memo.otherIncomeSources
              )}
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">
              {inr(memo.grossTotalIncome)}
            </td>
          </tr>

          {/* 2: Standard Deduction */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">2</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Standard deduction under section 16 (ia) (A Deduction of Rs. 75,000)
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">
              {inr(memo.standardDeduction16ia)}
            </td>
          </tr>

          {/* 3: Gross Total Income */}
          <tr className="font-bold bg-slate-100">
            <td className="text-center border-r border-b border-black py-[2.5px] align-middle">3</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Gross Total Income (1+ (1.a to 1.l)) - 2(Standard deduction)
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">
              {inr(Math.max(0, memo.grossTotalIncome - memo.standardDeduction16ia))}
            </td>
          </tr>

          {/* 4: Less: Deduction NPS */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">4</td>
            <td className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">Less : Deduction</td>
            <td className="px-1.5 py-[2.5px] border-r border-b border-black text-right font-medium align-middle"></td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle"></td>
          </tr>
          <tr>
            <td className="border-r border-b border-black py-[2.5px]"></td>
            <td className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Sec. 80CCD(2) NPS Contribution (Max. 14% of Salary Govt. Contribution)
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-r border-b border-black align-middle">
              {inr(memo.nps80CCD2)}
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">
              {inr(memo.nps80CCD2)}
            </td>
          </tr>

          {/* 5: Net Taxable Total Income */}
          <tr className="font-bold bg-slate-100">
            <td className="text-center border-r border-b border-black py-[2.5px] align-middle">5</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Net Taxable Total Income [3 - 4 ] rounded to Multiple of ten Rupees
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-b border-black align-middle">{inr(memo.taxableTotalIncome)}</td>
          </tr>

          {/* 6: Income Tax Working & Slabs */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">6</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Income Tax Payable on Total Income Calculation of Income Tax on
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(w.taxOnNormalIncome)}</td>
          </tr>

          {/* Nested Slabs Table */}
          <tr>
            <td className="border-r border-b border-black py-[2px]"></td>
            <td colSpan={3} className="p-0 border-b border-black">
              <table className="w-full text-[7.5pt] leading-tight" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                <thead>
                  <tr className="bg-slate-50 font-semibold text-center">
                    <th className="py-1 border-r border-b border-black px-1.5 text-left align-middle">Income Tax up to</th>
                    <th className="py-1 border-r border-b border-black w-20 text-right pr-1.5 align-middle">Taxable Amt</th>
                    <th className="py-1 border-r border-b border-black w-10 text-center align-middle">Rate</th>
                    <th className="py-1 border-r border-b border-black w-16 text-right pr-1.5 align-middle">Tax Amt</th>
                    <th className="py-1 border-b border-black w-24 text-right pr-1.5 align-middle">Total Tax</th>
                  </tr>
                </thead>
                <tbody>
                  {w.slabs.map((s, idx) => (
                    <tr key={idx}>
                      <td className="px-1.5 py-[1.5px] border-r border-b border-black/30 align-middle">{s.label}</td>
                      <td className="px-1.5 py-[1.5px] border-r border-b border-black/30 text-right align-middle">{inr(s.taxableAmount)}</td>
                      <td className="px-1 py-[1.5px] border-r border-b border-black/30 text-center align-middle">{s.rate}%</td>
                      <td className="px-1.5 py-[1.5px] border-r border-b border-black/30 text-right align-middle">{inr(s.taxAmount)}</td>
                      <td className="px-1.5 py-[1.5px] text-right font-bold border-b border-black/30 align-middle">
                        {idx === w.slabs.length - 1 ? inr(w.taxOnNormalIncome) : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>

          {/* Rebate 87A */}
          <tr>
            <td className="border-r border-b border-black py-[2.5px]"></td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Less: Tax Credit (Available only to assessees having total taxable income upto Rs. 12 lacs) u/s 87A
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(w.rebate87A)}</td>
          </tr>

          {/* 7: After Rebate */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">7</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              After Rebate Payable Income Tax Amount
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(w.taxAfterRebate)}</td>
          </tr>

          {/* 8: Surcharge */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">8</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">Add: Surcharge</td>
            <td className="px-1.5 py-[2.5px] text-right font-medium border-b border-black align-middle">{inr(w.surcharge)}</td>
          </tr>

          {/* 9: Cess */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">9</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Add: Health and Education Cess @ 4% on Payable Income Tax Amount
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-medium border-b border-black align-middle">{inr(w.cess4)}</td>
          </tr>

          {/* 10: Relief u/s 89 */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">10</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Less : Relief U/s 89 [Attach Details Form 10 E]
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-medium border-b border-black align-middle">{inr(w.relief89)}</td>
          </tr>

          {/* 11: Total Tax Payable */}
          <tr className="font-bold bg-slate-100">
            <td className="text-center border-r border-b border-black py-[2.5px] align-middle">11</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Total Tax Payable [ after relief ]
            </td>
            <td className="px-1.5 py-[2.5px] text-right border-b border-black align-middle">{inr(w.totalTaxLiability)}</td>
          </tr>

          {/* 12: Total Tax Paid Till January */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">12</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Total Tax Paid Till January
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(m.totalTaxPaidTillJan)}</td>
          </tr>

          {/* 13: Total Tax including Delay */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">13</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Total Tax Including Delay in filing of Tax Returns - (Section 234(A)): {m.delayFiling234A ? 'Yes' : 'No'}
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-medium border-b border-black align-middle">{inr(m.delayPenaltyAmount)}</td>
          </tr>

          {/* 14: Tax to be deducted in February */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">14</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black font-semibold align-middle">
              Tax to be deducted in February {memo.financialYear + 1}
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(m.taxDeductedFeb)}</td>
          </tr>

          {/* 15: Challans */}
          <tr>
            <td className="text-center font-bold border-r border-b border-black py-[2.5px] align-middle">15</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-b border-black align-middle">
              Taxes Deposited Through Challan{' '}
              {m.challans.length > 0 && (
                <span className="font-semibold">
                  (C. No: {m.challans[0]?.challanNo || '—'} Date: {m.challans[0]?.date || '—'})
                </span>
              )}
            </td>
            <td className="px-1.5 py-[2.5px] text-right font-bold border-b border-black align-middle">{inr(m.totalChallanAmount)}</td>
          </tr>

          {/* 16: Net Balance */}
          <tr className="font-bold bg-slate-100">
            <td className="text-center border-r border-b border-black py-[2.5px] align-middle">16</td>
            <td colSpan={2} className="px-2 py-[2.5px] border-r border-black text-[8pt] align-middle">
              Tax Payable / Refundable [ 11 - (12+14+15) ]
            </td>
            <td className="px-1.5 py-[2.5px] text-right text-[8pt] border-b border-black align-middle">
              {m.netTaxPayableOrRefund < 0
                ? `${inr(Math.abs(m.netTaxPayableOrRefund))} (Refund)`
                : inr(m.netTaxPayableOrRefund)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Option u/s 115BAC & Statutory Declaration */}
      <div className="border-b border-black px-2.5 py-1 text-[7.5pt] leading-snug bg-slate-50">
        <p className="font-bold uppercase tracking-wider text-[7.5pt] text-black">
          Declaration / <span lang="gu" className="font-guj">સંમતિ પત્રક</span> (U/S 115BAC)
        </p>
        <p className="font-medium text-black mt-0.5 leading-snug">
          I hereby declare that for the Financial Year <span className="font-bold">{fyText}</span> (Assessment Year{' '}
          <span className="font-bold">{ayText}</span>), I have exercised the option to be assessed under the{' '}
          <span className="font-bold underline">New Tax Regime under Section 115BAC</span> of the Income-tax Act, 1961.
        </p>
        <p lang="gu" className="font-guj mt-0.5 text-black font-normal text-[7.5pt] leading-snug">
          {memo.gujaratiConsentText &&
          memo.gujaratiConsentText !== 'હું નવી કર યોજનામાં જોડાવા સંમતી આપું છું' ? (
            memo.gujaratiConsentText
          ) : (
            `હું આથી બાંહેધરી આપું છું કે નાણાકીય વર્ષ ${fyText} માટે મેં આવકવેરા અધિનિયમ, ૧૯૬૧ ની કલમ ૧૧૫બીએસી હેઠળ નવી કર વ્યવસ્થા (New Tax Regime) નો વિકલ્પ પસંદ કરેલ છે.`
          )}
        </p>
      </div>

      {/* Place, Date & Signatures - Bottom Section */}
      <div className="signature-block px-2 pt-2 pb-1 text-[8pt]">
        <div className="flex justify-between font-medium text-[8pt]">
          <div>
            Place : <span className="font-bold">{memo.place || memo.district || 'Surat'}</span>
          </div>
          <div>
            Date :{' '}
            <span className="font-bold">
              {memo.computationDate || new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* Generous physical signing space */}
        <div style={{ height: '8mm' }} />

        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Taxpayer Signature */}
          <div className="flex flex-col items-start">
            <div className="w-64 text-center">
              <div className="w-full border-b border-black mb-1"></div>
              <p className="font-bold uppercase tracking-wider text-[8pt] text-black leading-tight">
                Signature of Employee / Taxpayer
              </p>
              <p className="font-bold uppercase text-[8pt] text-black mt-0.5 leading-tight">
                {memo.taxpayerSignatureName || memo.taxpayerName}
              </p>
              <p className="font-normal uppercase text-[7.5pt] text-black mt-0.5 leading-tight">
                {formatDesignation(memo.designation)}
              </p>
            </div>
          </div>

          {/* DDO Signature */}
          <div className="flex flex-col items-end">
            <div className="w-64 text-center">
              <div className="w-full border-b border-black mb-1"></div>
              <p className="font-bold uppercase text-[8pt] text-black leading-tight">
                {memo.treasuryOfficerDesignation || 'Assistant Administrative cum Account Officer'}
              </p>
              <p className="font-normal text-[7.5pt] text-black mt-0.5 leading-tight">
                (Signature &amp; Office Seal of DDO)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Format 2: Standard Clean Departmental 6-Section Form - Single A4 Page Guaranteed
 */
const StandardTemplate: React.FC<{ memo: SelfAssessmentMemo }> = ({ memo }) => {
  const w = memo.working;
  const m = memo.monthlyTds;
  const fyText = `${memo.financialYear}-${String(memo.financialYear + 1).slice(-2)}`;
  const ayText = memo.assessmentYear;

  const displayOfficeName = memo.departmentName?.toUpperCase().startsWith('OFFICE OF')
    ? memo.departmentName
    : `OFFICE OF THE ${memo.departmentName || 'DISTRICT TREASURY OFFICE'}`;

  return (
    <div className="border border-black p-2 space-y-2">
      {/* Header */}
      <div className="text-center py-1 border-b border-black">
        {/* Office Letterhead */}
        <div className="pb-0.5">
          <h2 className="text-[10pt] font-bold uppercase tracking-wider text-black leading-tight">
            {displayOfficeName}
          </h2>
          {memo.departmentDivision ? (
            <p className="text-[8pt] font-medium text-black mt-0.5 leading-tight">
              {memo.departmentDivision}
            </p>
          ) : null}
        </div>

        {/* Hairline Divider */}
        <div className="w-56 mx-auto border-t border-black/40 my-0.5"></div>

        {/* Document Title & Regime Info */}
        <div className="pt-0.5 space-y-0.5">
          <h1 className="text-[10.5pt] font-bold uppercase tracking-wide text-black leading-tight">
            SELF-ASSESSMENT INCOME-TAX COMPUTATION MEMO
          </h1>
          <p className="text-[8pt] font-bold uppercase text-black leading-tight">
            NEW TAX REGIME ONLY — SECTION 115BAC(1A) &nbsp;|&nbsp; FY {fyText} &nbsp;|&nbsp; AY {ayText}
          </p>
        </div>
      </div>

      {/* 1. Particulars */}
      <div>
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 mb-1 bg-slate-100">
          1. PARTICULARS OF TAXPAYER
        </h3>
        <table className="w-full border-t border-l border-black text-[8pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td className="w-1/4 py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">Name</td>
              <td colSpan={3} className="py-1 px-2.5 font-bold uppercase border-r border-b border-black align-middle">{memo.taxpayerName || '—'}</td>
            </tr>
            <tr>
              <td className="w-1/4 py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">PAN</td>
              <td className="w-1/4 py-1 px-2.5 border-r border-b border-black font-bold tracking-wider align-middle">{memo.pan || '—'}</td>
              <td className="w-1/4 py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">Employee ID / PPO / PSN</td>
              <td className="w-1/4 py-1 px-2.5 font-medium border-r border-b border-black align-middle">{memo.employeeIdOrPsn || memo.hrpn || '—'}</td>
            </tr>
            <tr>
              <td className="py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">DDO / Treasury / Office</td>
              <td className="py-1 px-2.5 border-r border-b border-black align-middle">{memo.departmentName || memo.district || '—'}</td>
              <td className="py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">Designation / Status</td>
              <td className="py-1 px-2.5 uppercase border-r border-b border-black align-middle">{formatDesignation(memo.designation) || '—'}</td>
            </tr>
            <tr>
              <td className="py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">Residential Address</td>
              <td className="py-1 px-2.5 border-r border-b border-black align-middle">{memo.residentialAddress || memo.district || '—'}</td>
              <td className="py-1 px-2.5 font-semibold border-r border-b border-black bg-slate-50 align-middle">Residential Status</td>
              <td className="py-1 px-2.5 font-medium border-r border-b border-black align-middle">{memo.residentialStatus === 'RESIDENT' ? 'Resident' : 'Non-Resident'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 2. Computation of Income */}
      <div>
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 mb-1 bg-slate-100">
          2. COMPUTATION OF INCOME
        </h3>
        <table className="w-full border-t border-l border-black text-[8pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr className="font-semibold text-center bg-slate-50">
              <th className="w-6 border-r border-b border-black py-0.5 align-middle">No.</th>
              <th className="border-r border-b border-black px-2.5 py-0.5 text-left align-middle">Particulars of Income</th>
              <th className="w-24 border-r border-b border-black px-2.5 py-0.5 text-right align-middle">Amount (Rs.)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">1</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">Salary / pension taxable under the head "Salaries" (gross)</td>
              <td className="px-2.5 py-1 text-right font-medium border-r border-b border-black/30 align-middle">{inr(memo.grossSalaryTotal)}</td>
            </tr>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">2</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">Income from house property (if applicable)</td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">{inrOrDash(memo.housePropertyIncome)}</td>
            </tr>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">3</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">Family pension (gross, if applicable)</td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">{inr(memo.familyPensionGross)}</td>
            </tr>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">4</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">Interest, dividends and other income from other sources u/s 192(2B)</td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">
                {inr(memo.bankInterest + memo.nscInterest + memo.otherIncomeSources + memo.bonus + memo.honorariumBonus + memo.capitalGainsSpecialRate)}
              </td>
            </tr>
            <tr className="font-bold bg-slate-50">
              <td className="text-center border-r border-b border-black py-1 align-middle">5</td>
              <td className="px-2.5 py-1 border-r border-b border-black align-middle">GROSS TOTAL INCOME</td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black align-middle">{inr(memo.grossTotalIncome)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 3. Deductions */}
      <div>
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 mb-1 bg-slate-100">
          3. DEDUCTIONS / ADJUSTMENTS PERMITTED UNDER NEW TAX REGIME
        </h3>
        <table className="w-full border-t border-l border-black text-[8pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td className="w-6 text-center border-r border-b border-black/30 py-1 align-middle">1</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">
                Standard deduction from eligible salary / pension u/s 16(ia) (up to Rs. 75,000)
              </td>
              <td className="w-24 px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">{inr(memo.standardDeduction16ia)}</td>
            </tr>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">2</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">
                Family pension deduction u/s 57(iia) (lower of 1/3 or Rs. 25,000)
              </td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">{inr(memo.familyPensionDeduction57iia)}</td>
            </tr>
            <tr>
              <td className="text-center border-r border-b border-black/30 py-1 align-middle">3</td>
              <td className="px-2.5 py-1 border-r border-b border-black/30 align-middle">
                Eligible employer contribution to NPS u/s 80CCD(2), within statutory limit
              </td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black/30 align-middle">{inr(memo.nps80CCD2)}</td>
            </tr>
            <tr className="font-bold bg-slate-50">
              <td className="text-center border-r border-b border-black py-1 align-middle">4</td>
              <td className="px-2.5 py-1 border-r border-b border-black align-middle">
                TOTAL PERMITTED DEDUCTIONS / ADJUSTMENTS
              </td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black align-middle">{inr(memo.totalPermittedDeductions)}</td>
            </tr>
            <tr className="font-bold">
              <td className="text-center border-r border-b border-black py-1 align-middle">5</td>
              <td className="px-2.5 py-1 border-r border-b border-black align-middle">
                TAXABLE TOTAL INCOME after deductions, rounded u/s 288A
              </td>
              <td className="px-2.5 py-1 text-right border-r border-b border-black align-middle">{inr(memo.taxableTotalIncome)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 4. Income-Tax Working */}
      <div>
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 mb-1 bg-slate-100">
          4. INCOME-TAX WORKING ({ayText})
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {/* Slabs Grid */}
          <table className="border-t border-l border-black text-[7.5pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr className="bg-slate-50 font-semibold">
                <th className="py-0.5 text-left pl-1.5 border-r border-b border-black align-middle">Income Slab</th>
                <th className="py-0.5 text-center w-8 border-r border-b border-black align-middle">Rate</th>
                <th className="py-0.5 text-right pr-1.5 border-r border-b border-black align-middle">Tax (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {w.slabs.map((s, idx) => (
                <tr key={idx}>
                  <td className="py-[1.5px] pl-1.5 border-r border-b border-black/30 align-middle">{s.label}</td>
                  <td className="py-[1.5px] text-center border-r border-b border-black/30 align-middle">{s.rate}%</td>
                  <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(s.taxAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Working Items A to G */}
          <table className="border-t border-l border-black text-[7.5pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <tbody>
              <tr>
                <td className="w-4 font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">A</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Tax on normal slab income</td>
                <td className="py-[1.5px] text-right pr-1.5 w-16 font-medium border-r border-b border-black/30 align-middle">{inr(w.taxOnNormalIncome)}</td>
              </tr>
              <tr>
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">B</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Less: Tax Rebate u/s 87A</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(w.rebate87A)}</td>
              </tr>
              <tr className="font-semibold">
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">C</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Tax after Rebate (A - B)</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(w.taxAfterRebate)}</td>
              </tr>
              <tr>
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">D</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Add: Surcharge (if applicable)</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(w.surcharge)}</td>
              </tr>
              <tr>
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">E</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Add: Health &amp; Education Cess @ 4%</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(w.cess4)}</td>
              </tr>
              <tr>
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black/30 align-middle">F</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black/30 align-middle">Less: Relief u/s 89 (Form 10E)</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black/30 align-middle">{inr(w.relief89)}</td>
              </tr>
              <tr className="font-bold bg-slate-50">
                <td className="font-bold py-[1.5px] text-center border-r border-b border-black align-middle">G</td>
                <td className="py-[1.5px] px-1.5 border-r border-b border-black align-middle">TOTAL TAX LIABILITY</td>
                <td className="py-[1.5px] text-right pr-1.5 border-r border-b border-black align-middle">{inr(w.totalTaxLiability)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Taxes Paid / Balance */}
      <div>
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 mb-1 bg-slate-100">
          5. TAXES PAID / TAX CREDITS AND BALANCE
        </h3>
        <table className="w-full border-t border-l border-black text-[8pt] leading-snug" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <tbody>
            <tr>
              <td className="py-1 px-2.5 border-r border-b border-black/30 align-middle">TDS Deducted across Paybills (Form 16 / AIS verified)</td>
              <td className="py-1 px-2.5 text-right w-24 border-r border-b border-black/30 align-middle">{inr(m.totalTaxPaidTillJan + m.taxDeductedFeb)}</td>
            </tr>
            <tr>
              <td className="py-1 px-2.5 border-r border-b border-black/30 align-middle">TCS / Other TDS Credits reported u/s 192(2B)</td>
              <td className="py-1 px-2.5 text-right border-r border-b border-black/30 align-middle">{inr(m.otherTdsTcsCredits)}</td>
            </tr>
            <tr>
              <td className="py-1 px-2.5 border-r border-b border-black/30 align-middle">Advance Tax / Self-Assessment Tax Paid via Challans</td>
              <td className="py-1 px-2.5 text-right border-r border-b border-black/30 align-middle">{inr(m.totalChallanAmount)}</td>
            </tr>
            <tr className="font-semibold">
              <td className="py-1 px-2.5 border-r border-b border-black align-middle">TOTAL VERIFIED TAX CREDITS</td>
              <td className="py-1 px-2.5 text-right border-r border-b border-black align-middle">{inr(m.totalTaxCredits)}</td>
            </tr>
            <tr className="font-bold bg-slate-50">
              <td className="py-1 px-2.5 border-r border-b border-black align-middle">NET TAX PAYABLE / (REFUND)</td>
              <td className="py-1 px-2.5 text-right border-r border-b border-black align-middle">
                {m.netTaxPayableOrRefund < 0
                  ? `${inr(Math.abs(m.netTaxPayableOrRefund))} (Refund)`
                  : inr(m.netTaxPayableOrRefund)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 6. Statutory Declaration & Verification */}
      <div className="pt-0.5 space-y-0.5">
        <h3 className="text-[8pt] font-bold uppercase border-b border-black py-0.5 px-2 bg-slate-100">
          6. STATUTORY DECLARATION &amp; VERIFICATION / <span lang="gu" className="font-guj">સંમતિ પત્રક</span> (U/S 115BAC)
        </h3>

        {/* Option u/s 115BAC & Statutory Declaration */}
        <div className="border border-black p-1.5 text-[7.5pt] leading-snug bg-slate-50">
          <p className="font-medium text-black leading-snug">
            I hereby declare that for the Financial Year <span className="font-bold">{fyText}</span> (Assessment Year{' '}
            <span className="font-bold">{ayText}</span>), I have exercised the option to be assessed under the{' '}
            <span className="font-bold underline">New Tax Regime under Section 115BAC</span> of the Income-tax Act, 1961.
          </p>
          <p lang="gu" className="font-guj mt-0.5 text-black font-normal text-[7.5pt] leading-snug">
            {memo.gujaratiConsentText &&
            memo.gujaratiConsentText !== 'હું નવી કર યોજનામાં જોડાવા સંમતી આપું છું' ? (
              memo.gujaratiConsentText
            ) : (
              `હું આથી બાંહેધરી આપું છું કે નાણાકીય વર્ષ ${fyText} માટે મેં આવકવેરા અધિનિયમ, ૧૯૬૧ ની કલમ ૧૧૫બીએસી હેઠળ નવી કર વ્યવસ્થા (New Tax Regime) નો વિકલ્પ પસંદ કરેલ છે.`
            )}
          </p>
        </div>
      </div>

      {/* Place, Date & Signatures - Bottom Section */}
      <div className="signature-block px-2 pt-2 pb-1 text-[8pt]">
        <div className="flex justify-between font-medium text-[8pt]">
          <div>
            Place : <span className="font-bold">{memo.place || memo.district || 'Surat'}</span>
          </div>
          <div>
            Date :{' '}
            <span className="font-bold">
              {memo.computationDate || new Date().toLocaleDateString('en-GB')}
            </span>
          </div>
        </div>

        {/* Generous physical signing space */}
        <div style={{ height: '8mm' }} />

        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Taxpayer Signature */}
          <div className="flex flex-col items-start">
            <div className="w-64 text-center">
              <div className="w-full border-b border-black mb-1"></div>
              <p className="font-bold uppercase tracking-wider text-[8pt] text-black leading-tight">
                Signature of Employee / Taxpayer
              </p>
              <p className="font-bold uppercase text-[8pt] text-black mt-0.5 leading-tight">
                {memo.taxpayerSignatureName || memo.taxpayerName}
              </p>
              <p className="font-normal uppercase text-[7.5pt] text-black mt-0.5 leading-tight">
                {formatDesignation(memo.designation)}
              </p>
            </div>
          </div>

          {/* DDO Signature */}
          <div className="flex flex-col items-end">
            <div className="w-64 text-center">
              <div className="w-full border-b border-black mb-1"></div>
              <p className="font-bold uppercase text-[8pt] text-black leading-tight">
                {memo.treasuryOfficerDesignation || 'Assistant Administrative cum Account Officer'}
              </p>
              <p className="font-normal text-[7.5pt] text-black mt-0.5 leading-tight">
                (Signature &amp; Office Seal of DDO)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
