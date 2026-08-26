import type { Form16Certificate } from '../types/form16';
import { numberToWordsINR } from '@/modules/gtr44/utils/gtr44Utils';

const fmt = (n: number | undefined | null): string => {
  const val = Number(n) || 0;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.round(val * 100) / 100);
};

function ayText(cert: Form16Certificate): string {
  return `${cert.assessmentYear}-${String((cert.assessmentYear + 1) % 100).padStart(2, '0')}`;
}

export function Form16Document({ cert }: { cert: Form16Certificate }) {
  const t = cert.computedTotals;
  const qSum = (k: 'amountPaid' | 'taxDeducted' | 'taxDeposited') =>
    cert.partA.quarters.reduce((s, q) => s + (Number(q[k]) || 0), 0);

  const employerName = cert.employer.name || 'Office of Deputy Director (ICDP)';
  const employerAddress = cert.employer.address || '';
  const employeeAddress = cert.employee.address || '';

  const totalTdsPaid = t?.tdsDeducted ?? qSum('taxDeducted') ?? 0;
  const currentDate = cert.signatory.date || new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const certNumber =
    cert.certificateNumber ||
    `F16/${cert.assessmentYear}-${String((cert.assessmentYear + 1) % 100).padStart(2, '0')}/${cert.employee.pan || cert.hrpn}`;

  const periodFrom = cert.partA.periodFrom || `01-Apr-${cert.financialYear}`;
  const periodTo = cert.partA.periodTo || `31-Mar-${cert.financialYear + 1}`;
  const fyLabel = `${cert.financialYear}-${String((cert.financialYear + 1) % 100).padStart(2, '0')}`;
  const ayLabel = ayText(cert);

  return (
    <div id="form16-document-root" className={`f16-root ${cert.status !== 'ISSUED' ? 'f16-draft' : ''}`}>
      <style>{`
        @page {
          size: A4 portrait;
          margin: 4mm 5mm;
        }
        .f16-root {
          font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif;
          color: #000;
          background: transparent;
          width: 100%;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .f16-page {
          width: 100%;
          max-width: 210mm;
          min-height: 282mm;
          padding: 3mm 4.5mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 4px 25px rgba(0,0,0,.08);
          box-sizing: border-box;
          position: relative;
          font-size: 8.5pt;
          line-height: 1.2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Titles */
        .f16-title-main {
          text-align: center;
          font-weight: 900;
          font-size: 13.5pt;
          letter-spacing: 0.5px;
          margin-bottom: 0.1mm;
          text-transform: uppercase;
        }
        .f16-rule-sub {
          text-align: center;
          font-size: 8pt;
          margin-bottom: 0.3mm;
          font-weight: 600;
        }
        .f16-parta-title {
          text-align: center;
          font-weight: 900;
          font-size: 10.5pt;
          margin-top: 0.2mm;
          margin-bottom: 0.2mm;
          letter-spacing: 0.3px;
        }
        .f16-cert-desc {
          text-align: center;
          font-weight: 600;
          font-size: 7.5pt;
          margin-bottom: 1mm;
          padding: 0 2mm;
          line-height: 1.18;
        }

        /* Certificate Meta Strip */
        .f16-cert-meta-strip {
          display: flex;
          justify-content: space-between;
          border: 1.1px solid #000;
          border-bottom: none;
          background: #f8f8f8;
          padding: 0.8mm 2mm;
          font-size: 8pt;
          font-weight: 700;
        }

        /* Standard Unified Tables */
        .f16-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.1px solid #000;
          margin-bottom: 1mm;
        }
        .f16-table th, .f16-table td {
          border: 1px solid #000;
          padding: 0.6mm 1.6mm;
          font-size: 8.2pt;
          vertical-align: middle;
          line-height: 1.18;
        }
        .f16-table th {
          background: #f2f2f2;
          font-weight: 800;
          text-align: center;
          font-size: 7.8pt;
          line-height: 1.15;
        }
        .f16-sec-hdr {
          text-align: center;
          font-weight: 900;
          font-size: 8.2pt;
          padding: 0.8mm !important;
          background: #eaeaea !important;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .f16-b-opt {
          text-align: center;
          font-weight: 800;
          font-size: 8.2pt;
          padding: 0.5mm;
          background: #fafafa;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          margin-bottom: 0.8mm;
        }
        .f16-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          font-family: 'Times New Roman', Times, serif;
          font-weight: 700;
          font-size: 8.8pt;
        }
        .f16-center {
          text-align: center;
        }
        .f16-bold {
          font-weight: 700;
        }
        .f16-bold-row {
          font-weight: 800;
          background: #fafafa;
        }
        .f16-indent-1 {
          padding-left: 3.5mm !important;
        }

        /* Verification Box */
        .f16-verify-box {
          margin-top: 1.2mm;
          font-size: 7.8pt;
          line-height: 1.25;
          border: none;
          padding: 1mm 1mm;
          background: #fff;
        }
        .f16-verify-title {
          font-weight: 900;
          font-size: 8.5pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          margin-bottom: 0.6mm;
          text-align: center;
          text-decoration: underline;
        }
        .f16-verify-text {
          text-align: justify;
          margin-bottom: 1mm;
          font-size: 7.6pt;
          line-height: 1.2;
        }
        .f16-sig-line {
          font-weight: bold;
          margin-bottom: 0.3mm;
          font-size: 8pt;
          letter-spacing: -0.5px;
        }
        .f16-sig-caption {
          font-size: 7pt;
          font-style: italic;
          margin-bottom: 0.6mm;
        }
        .f16-sig-field {
          font-size: 7.8pt;
        }

        .f16-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-28deg);
          font-size: 34pt;
          font-weight: 900;
          letter-spacing: 2px;
          color: rgba(180, 180, 180, 0.16);
          white-space: nowrap;
          z-index: 10;
          pointer-events: none;
          text-align: center;
          width: 90%;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 4mm 5mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .f16-root {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .f16-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: auto !important;
            max-height: 288mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .f16-title-main { font-size: 13pt !important; font-weight: 900 !important; margin-bottom: 0.1mm !important; }
          .f16-rule-sub { font-size: 8pt !important; font-weight: 600 !important; margin-bottom: 0.2mm !important; }
          .f16-parta-title { font-size: 10pt !important; font-weight: 900 !important; margin: 0.1mm 0 !important; }
          .f16-cert-desc { font-size: 7.2pt !important; font-weight: 600 !important; line-height: 1.15 !important; margin-bottom: 0.8mm !important; }
          .f16-cert-meta-strip { font-size: 7.5pt !important; padding: 0.6mm 1.5mm !important; border: 1.1px solid #000 !important; }
          
          .f16-table { border: 1.1px solid #000 !important; margin-bottom: 0.8mm !important; }
          .f16-table th { font-size: 7.6pt !important; font-weight: 800 !important; padding: 0.5mm 1.2mm !important; background: #f2f2f2 !important; line-height: 1.15 !important; }
          .f16-table td { font-size: 8pt !important; padding: 0.45mm 1.2mm !important; line-height: 1.18 !important; }
          .f16-sec-hdr { font-size: 8pt !important; font-weight: 900 !important; background: #eaeaea !important; padding: 0.5mm !important; }
          .f16-b-opt { font-size: 7.8pt !important; font-weight: 800 !important; padding: 0.4mm !important; margin-bottom: 0.5mm !important; }
          .f16-num { font-size: 8.5pt !important; font-weight: 700 !important; font-family: 'Times New Roman', Times, serif !important; }
          .f16-bold { font-weight: 800 !important; }
          .f16-bold-row { font-weight: 800 !important; background: #f8f8f8 !important; }
          
          .f16-verify-box { font-size: 7.4pt !important; border: none !important; padding: 1mm 1mm !important; margin-top: 0.8mm !important; }
          .f16-verify-title { font-size: 8.2pt !important; font-weight: 900 !important; text-align: center !important; margin-bottom: 0.4mm !important; text-decoration: underline !important; }
          .f16-verify-text { font-size: 7.2pt !important; line-height: 1.18 !important; margin-bottom: 0.5mm !important; }
          .f16-sig-line { font-weight: 900 !important; font-size: 7.5pt !important; }
          .f16-sig-caption { font-size: 6.8pt !important; margin-bottom: 0.3mm !important; }
          .f16-sig-field { font-size: 7.4pt !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="f16-page" id="form16-single-page">
        <div>
          {/* Header Title Section */}
          <div className="f16-title-main">FORM NO. 16</div>
          <div className="f16-rule-sub">[See rule 31(1)(a)]</div>
          <div className="f16-parta-title">PART A</div>
          <div className="f16-cert-desc">
            Certificate under Section 203 of the Income-tax Act, 1961 for tax deducted at source on salary paid to an employee under section 192 or pension/interest income
          </div>

          {/* Certificate No. & Date Strip */}
          <div className="f16-cert-meta-strip">
            <div>
              <span>Certificate No: </span>
              <span className="font-mono font-bold">{certNumber}</span>
            </div>
            <div>
              <span>Last Updated: </span>
              <span className="font-bold">{currentDate}</span>
            </div>
          </div>

          {/* Clean 4-Row TRACES Single Table */}
          <table className="f16-table" style={{ marginBottom: '0.8mm' }}>
            <thead>
              <tr>
                <th colSpan={2} style={{ width: '50%', textAlign: 'left', paddingLeft: '2mm' }}>
                  Name and Address of the Employer / Deductor
                </th>
                <th colSpan={2} style={{ width: '50%', textAlign: 'left', paddingLeft: '2mm' }}>
                  Name and Address of the Employee / Deductee
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={2} style={{ height: '11mm', verticalAlign: 'top', padding: '1mm 2mm' }}>
                  <div style={{ fontWeight: 800, fontSize: '9pt', whiteSpace: 'pre-line', lineHeight: 1.25 }}>{employerName}</div>
                  {employerAddress ? (
                    <div style={{ fontSize: '8pt', color: '#111', marginTop: '0.4mm', lineHeight: 1.2, whiteSpace: 'pre-line' }}>
                      {employerAddress}
                    </div>
                  ) : null}
                </td>
                <td colSpan={2} style={{ height: '11mm', verticalAlign: 'top', padding: '1mm 2mm' }}>
                  <div style={{ fontWeight: 800, fontSize: '9pt' }}>{cert.employee.name || '—'}</div>
                  <div style={{ fontSize: '8pt', marginTop: '0.4mm', lineHeight: 1.2 }}>
                    <div><b>Designation:</b> {cert.employee.designation || 'Staff'}</div>
                    {employeeAddress ? <div><b>Address:</b> {employeeAddress}</div> : null}
                    <div><b>HRPN / Emp No:</b> <span className="font-mono font-bold">{cert.hrpn}</span></div>
                  </div>
                </td>
              </tr>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ width: '25%' }}>PAN of Deductor</th>
                <th style={{ width: '25%' }}>TAN of Deductor</th>
                <th colSpan={2} style={{ width: '50%' }}>PAN of Employee</th>
              </tr>
              <tr>
                <td className="f16-center font-mono font-bold" style={{ fontSize: '9pt' }}>
                  {cert.employer.pan || 'PANNOTREQD'}
                </td>
                <td className="f16-center font-mono font-bold" style={{ fontSize: '9pt' }}>
                  {cert.employer.tan || '—'}
                </td>
                <td colSpan={2} className="f16-center font-mono font-bold" style={{ fontSize: '9.5pt' }}>
                  {cert.employee.pan || '—'}
                </td>
              </tr>
              <tr style={{ background: '#f8f8f8' }}>
                <th style={{ width: '25%' }}>CIT (TDS) Location</th>
                <th style={{ width: '25%' }}>Financial Year</th>
                <th style={{ width: '25%' }}>Assessment Year</th>
                <th style={{ width: '25%' }}>Period with Employer</th>
              </tr>
              <tr>
                <td className="f16-center font-bold" style={{ fontSize: '8.5pt' }}>
                  {cert.partA.citTds || 'CIT (TDS), Surat'}
                </td>
                <td className="f16-center font-mono font-bold" style={{ fontSize: '9pt' }}>
                  {fyLabel}
                </td>
                <td className="f16-center font-mono font-bold" style={{ fontSize: '9pt' }}>
                  {ayLabel}
                </td>
                <td className="f16-center font-bold" style={{ fontSize: '8.2pt' }}>
                  {periodFrom} to {periodTo}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Part A Quarterly TDS Summary Table */}
          <table className="f16-table" style={{ marginBottom: '0.8mm' }}>
            <thead>
              <tr>
                <th colSpan={5} className="f16-sec-hdr">
                  Summary of amount paid/credited and tax deducted at source thereon in respect of the employee
                </th>
              </tr>
              <tr>
                <th style={{ width: '12%' }}>Quarter(s)</th>
                <th style={{ width: '36%' }}>Receipt Numbers of original quarterly statements of TDS</th>
                <th style={{ width: '18%' }}>Amount paid/credited (Rs.)</th>
                <th style={{ width: '17%' }}>Amount of tax deducted (Rs.)</th>
                <th style={{ width: '17%' }}>Amount of tax deposited / remitted (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {cert.partA.quarters.map((q) => (
                <tr key={q.quarter}>
                  <td className="f16-center f16-bold">{q.quarter}</td>
                  <td className="f16-center font-mono">{q.receiptNumber || '—'}</td>
                  <td className="f16-num">{fmt(q.amountPaid)}</td>
                  <td className="f16-num">{fmt(q.taxDeducted)}</td>
                  <td className="f16-num">{fmt(q.taxDeposited)}</td>
                </tr>
              ))}
              <tr className="f16-bold-row">
                <td className="f16-bold f16-center">Total (Rs.)</td>
                <td />
                <td className="f16-num">{fmt(qSum('amountPaid'))}</td>
                <td className="f16-num">{fmt(qSum('taxDeducted'))}</td>
                <td className="f16-num">{fmt(qSum('taxDeposited'))}</td>
              </tr>
            </tbody>
          </table>

          {/* PART B Title */}
          <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '10pt', marginTop: '0.6mm', letterSpacing: '0.3px' }}>
            PART B
          </div>
          <div className="f16-b-opt">
            Whether opting out of taxation u/s 115BAC(1A)? <b>NO (New Tax Regime)</b>
          </div>

          {/* Part B: 19-Row Standard Table */}
          <table className="f16-table" style={{ marginBottom: '0.8mm' }}>
            <thead>
              <tr>
                <th style={{ width: '7%' }}>Sl. No.</th>
                <th style={{ width: '70%', textAlign: 'left', paddingLeft: '2mm' }}>Particulars</th>
                <th style={{ width: '23%', textAlign: 'right', paddingRight: '2mm' }}>Amount (Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. Gross Salary */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">1</td>
                <td className="f16-bold">Gross Salary</td>
                <td />
              </tr>
              <tr>
                <td className="f16-center">(a)</td>
                <td className="f16-indent-1">Salary as per provisions contained in section 17(1)</td>
                <td className="f16-num">{fmt(t?.grossSalary17_1)}</td>
              </tr>
              <tr>
                <td className="f16-center">(b)</td>
                <td className="f16-indent-1">Value of perquisites under section 17(2), wherever applicable</td>
                <td className="f16-num">{fmt(t?.perquisites17_2)}</td>
              </tr>
              <tr>
                <td className="f16-center">(c)</td>
                <td className="f16-indent-1">Profits in lieu of salary under section 17(3), wherever applicable</td>
                <td className="f16-num">{fmt(t?.profitsInLieu17_3)}</td>
              </tr>
              <tr className="f16-bold">
                <td className="f16-center">(d)</td>
                <td className="f16-indent-1">Total</td>
                <td className="f16-num">{fmt(t?.totalGrossSalary1d)}</td>
              </tr>
              <tr>
                <td className="f16-center">(e)</td>
                <td className="f16-indent-1">Reported total amount of salary received from other employer(s)</td>
                <td className="f16-num">{fmt(t?.otherEmployerSalary)}</td>
              </tr>

              {/* 2. Deductions u/s 16 */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">2</td>
                <td className="f16-bold">Deductions from salary under section 16 — New-regime applicable</td>
                <td />
              </tr>
              <tr>
                <td className="f16-center">(a)</td>
                <td className="f16-indent-1">Standard deduction under section 16(ia)</td>
                <td className="f16-num">{fmt(t?.standardDeduction16ia)}</td>
              </tr>

              {/* 3 */}
              <tr className="f16-bold">
                <td className="f16-center">3</td>
                <td>Income chargeable under the head 'Salaries' after standard deduction</td>
                <td className="f16-num">{fmt(t?.incomeChargeableSalaries)}</td>
              </tr>

              {/* 4 */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">4</td>
                <td className="f16-bold">Add: Any other income reported by the employee under section 192(2B)</td>
                <td />
              </tr>
              <tr>
                <td className="f16-center">(a)</td>
                <td className="f16-indent-1">Income / loss from house property reported for TDS</td>
                <td className="f16-num">{fmt(t?.housePropertyIncome)}</td>
              </tr>
              <tr>
                <td className="f16-center">(b)</td>
                <td className="f16-indent-1">Income under the head Other Sources offered for TDS</td>
                <td className="f16-num">{fmt(t?.otherSourcesIncome)}</td>
              </tr>

              {/* 5 */}
              <tr>
                <td className="f16-center f16-bold">5</td>
                <td>Total other income reported by the employee</td>
                <td className="f16-num">{fmt(t?.totalOtherIncome)}</td>
              </tr>

              {/* 6 */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">6</td>
                <td className="f16-bold">Gross Total Income</td>
                <td className="f16-num">{fmt(t?.grossTotalIncome)}</td>
              </tr>

              {/* 7 */}
              <tr>
                <td className="f16-center f16-bold">7</td>
                <td>Employer contribution to NPS / pension scheme u/s 80CCD(2)</td>
                <td className="f16-num">{fmt(t?.nps80CCD2)}</td>
              </tr>

              {/* 8 */}
              <tr>
                <td className="f16-center f16-bold">8</td>
                <td>Contribution to Agnipath Scheme u/s 80CCH, if applicable</td>
                <td className="f16-num">{fmt(t?.agnipath80CCH)}</td>
              </tr>

              {/* 9 */}
              <tr>
                <td className="f16-center f16-bold">9</td>
                <td>Aggregate new-regime deductions (80CCD(2) + 80CCH, where applicable)</td>
                <td className="f16-num">{fmt(t?.aggregateNewRegimeDeductions)}</td>
              </tr>

              {/* 10 */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">10</td>
                <td className="f16-bold">Total Taxable Income</td>
                <td className="f16-num">{fmt(t?.totalTaxableIncome)}</td>
              </tr>

              {/* 11 */}
              <tr>
                <td className="f16-center f16-bold">11</td>
                <td>Tax on total income</td>
                <td className="f16-num">{fmt(t?.taxOnTotalIncome)}</td>
              </tr>

              {/* 12 */}
              <tr>
                <td className="f16-center f16-bold">12</td>
                <td>Rebate under section 87A, if applicable</td>
                <td className="f16-num">{fmt(t?.rebate87A)}</td>
              </tr>

              {/* 13 */}
              <tr>
                <td className="f16-center f16-bold">13</td>
                <td>Surcharge</td>
                <td className="f16-num">{fmt(t?.surcharge)}</td>
              </tr>

              {/* 14 */}
              <tr>
                <td className="f16-center f16-bold">14</td>
                <td>Health and education cess</td>
                <td className="f16-num">{fmt(t?.cess4)}</td>
              </tr>

              {/* 15 */}
              <tr className="f16-bold-row">
                <td className="f16-center f16-bold">15</td>
                <td className="f16-bold">Total Tax payable</td>
                <td className="f16-num">{fmt(t?.totalTaxPayable)}</td>
              </tr>

              {/* 16 */}
              <tr>
                <td className="f16-center f16-bold">16</td>
                <td>Less: Relief under section 89</td>
                <td className="f16-num">{fmt(t?.relief89)}</td>
              </tr>

              {/* 17 */}
              <tr>
                <td className="f16-center f16-bold">17</td>
                <td>Less: Tax deducted at source</td>
                <td className="f16-num">{fmt(t?.tdsDeducted)}</td>
              </tr>

              {/* 18 */}
              <tr>
                <td className="f16-center f16-bold">18</td>
                <td>Less: Tax collected at source</td>
                <td className="f16-num">{fmt(t?.taxCollectedAtSource)}</td>
              </tr>

              {/* 19 */}
              <tr className="f16-bold-row" style={{ background: '#f0f4f8' }}>
                <td className="f16-center f16-bold">19</td>
                <td className="f16-bold">Net Tax Payable</td>
                <td className="f16-num">{fmt(t?.netTaxPayable)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Verification & Signature Block */}
        <div className="f16-verify-box">
          <div className="f16-verify-title">Verification</div>
          <div className="f16-verify-text">
            I, <b>{cert.signatory.name || '_______________________________'}</b>, working in the capacity of{' '}
            <b>{cert.signatory.designation || '_______________________________'}</b>, hereby certify that a sum of{' '}
            <b>Rs. {fmt(totalTdsPaid)}</b> [in words: <b>{numberToWordsINR(totalTdsPaid)}</b>] has been deducted at source and paid to the credit of the Central Government. I further certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements, and other available records.
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '1mm' }}>
            <tbody>
              <tr>
                <td style={{ width: '45%', verticalAlign: 'bottom', border: 'none', padding: 0, lineHeight: 1.3 }}>
                  <div><b>Place:</b> {cert.signatory.place || 'Surat'}</div>
                  <div><b>Date:</b> {currentDate}</div>
                </td>
                <td style={{ width: '55%', verticalAlign: 'bottom', textAlign: 'right', border: 'none', padding: 0, lineHeight: 1.25 }}>
                  <div style={{ height: '4.5mm' }}></div>
                  <div className="f16-sig-line">__________________________________________</div>
                  <div className="f16-sig-caption">(Signature of the person responsible for deducting tax)</div>
                  <div className="f16-sig-field"><b>Full Name:</b> {cert.signatory.name || '__________________________'}</div>
                  <div className="f16-sig-field"><b>Designation:</b> {cert.signatory.designation || '__________________________'}</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Draft watermark */}
        {cert.status !== 'ISSUED' && (
          <div className="f16-watermark">DRAFT — NOT ISSUED</div>
        )}
      </div>
    </div>
  );
}
