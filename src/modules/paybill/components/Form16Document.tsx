import type { Form16Certificate } from '../types/form16';
import { numberToWordsINR } from '@/modules/gtr44/utils/gtr44Utils';

export type Form16PartALayout = 'traces' | 'modern';

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

export function Form16Document({
  cert,
  layout = 'traces',
}: {
  cert: Form16Certificate;
  layout?: Form16PartALayout;
}) {
  const t = cert.computedTotals;
  const qSum = (k: 'amountPaid' | 'taxDeducted' | 'taxDeposited') =>
    cert.partA.quarters.reduce((s, q) => s + (Number(q[k]) || 0), 0);

  const employerName = cert.employer.name || 'Office of Deputy Director (ICDP), Surat';
  const employerAddress = cert.employer.address || 'Jilla Seva Sadan-2, Athwalines, Surat - 395001';
  const employeeAddress = cert.employee.address || 'Surat, Gujarat';

  const totalTdsPaid = t?.tdsDeducted || qSum('taxDeducted') || 0;
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
          margin: 5mm 6mm;
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
          min-height: 284mm;
          padding: 3.5mm 5mm;
          margin: 0 auto;
          background: #fff;
          box-shadow: 0 4px 25px rgba(0,0,0,.08);
          box-sizing: border-box;
          position: relative;
          font-size: 9.5pt;
          line-height: 1.25;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        /* Titles */
        .f16-title-main {
          text-align: center;
          font-weight: 900;
          font-size: 15.5pt;
          letter-spacing: 1px;
          margin-bottom: 0.3mm;
          text-transform: uppercase;
        }
        .f16-rule-sub {
          text-align: center;
          font-size: 9.5pt;
          margin-bottom: 0.6mm;
          font-weight: 500;
        }
        .f16-parta-title {
          text-align: center;
          font-weight: 900;
          font-size: 12pt;
          margin-top: 0.3mm;
          margin-bottom: 0.3mm;
          letter-spacing: 0.5px;
        }
        .f16-cert-desc {
          text-align: center;
          font-weight: 600;
          font-size: 8.6pt;
          margin-bottom: 1.5mm;
          padding: 0 3mm;
          line-height: 1.22;
        }

        /* Certificate Meta Strip */
        .f16-cert-meta-strip {
          display: flex;
          justify-content: space-between;
          border: 1.3px solid #000;
          border-bottom: none;
          background: #f8f8f8;
          padding: 1.2mm 2.5mm;
          font-size: 8.6pt;
          font-weight: 700;
        }

        /* Grid Table Styles */
        .f16-grid-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.3px solid #000;
          margin-bottom: 1.5mm;
        }
        .f16-grid-table td, .f16-grid-table th {
          border: 1px solid #000;
          padding: 1.2mm 2.2mm;
          font-size: 9.4pt;
          vertical-align: top;
        }
        .f16-hdr-cell {
          font-weight: 800;
          background: #f2f2f2;
          font-size: 8.2pt;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          padding: 1mm 1.8mm;
          color: #000;
          border-bottom: 1px solid #000;
          margin: -1.2mm -2.2mm 1.2mm -2.2mm;
        }
        .f16-val-cell {
          white-space: pre-wrap;
          line-height: 1.25;
          font-size: 9.6pt;
          font-weight: 600;
        }
        .f16-mini-label {
          font-size: 7.8pt;
          text-transform: uppercase;
          font-weight: 800;
          color: #333;
          display: block;
          margin-bottom: 0.5mm;
        }

        /* Option 2 Modern Identity Cards */
        .f16-modern-id-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2mm;
          margin-bottom: 1.5mm;
        }
        .f16-modern-card {
          border: 1.3px solid #000;
          background: #fff;
          padding: 2mm 2.5mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .f16-modern-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1.2px solid #000;
          padding-bottom: 1mm;
          margin-bottom: 1.5mm;
        }
        .f16-modern-card-title {
          font-size: 8.6pt;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .f16-badge-pill {
          display: inline-block;
          border: 1px solid #000;
          padding: 0.5mm 2mm;
          font-size: 8pt;
          font-weight: 800;
          background: #f0f4f8;
          border-radius: 3px;
        }
        .f16-modern-meta-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1.3px solid #000;
          padding: 1.2mm 2.5mm;
          background: #f8fafc;
          font-size: 8.8pt;
          font-weight: 700;
          margin-bottom: 1.5mm;
        }

        /* General Tables */
        .f16-table {
          width: 100%;
          border-collapse: collapse;
          border: 1.3px solid #000;
          margin-bottom: 1.5mm;
        }
        .f16-table th, .f16-table td {
          border: 1px solid #000;
          padding: 1.2mm 2.2mm;
          font-size: 9.4pt;
          vertical-align: middle;
          line-height: 1.2;
        }
        .f16-table th {
          background: #f4f4f4;
          font-weight: 800;
          text-align: center;
          font-size: 9.2pt;
          line-height: 1.2;
        }
        .f16-sec-hdr {
          text-align: center;
          font-weight: 900;
          font-size: 9.6pt;
          padding: 1.2mm !important;
          background: #eaeaea !important;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .f16-b-opt {
          text-align: center;
          font-weight: 800;
          font-size: 9.4pt;
          padding: 0.8mm;
          background: #fafafa;
          border-top: 1px solid #000;
          border-bottom: 1px solid #000;
          margin-bottom: 1.2mm;
        }
        .f16-num {
          text-align: right;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
          font-family: 'Times New Roman', Times, serif;
          font-weight: 700;
          font-size: 10pt;
          letter-spacing: 0.2px;
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
          padding-left: 4.5mm !important;
        }

        /* Verification Box */
        .f16-verify-box {
          margin-top: 1.5mm;
          font-size: 9.2pt;
          line-height: 1.35;
          border: 1.2px solid #000;
          padding: 2mm 3mm;
          background: #fff;
        }
        .f16-verify-title {
          font-weight: 900;
          font-size: 9.8pt;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.8mm;
          text-decoration: underline;
        }
        .f16-verify-text {
          text-align: justify;
          margin-bottom: 1.5mm;
        }
        .f16-verify-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 1.5mm;
          font-size: 9.4pt;
        }
        .f16-verify-left {
          width: 40%;
          line-height: 1.4;
        }
        .f16-verify-sig {
          width: 55%;
          line-height: 1.35;
          text-align: right;
        }
        .f16-sig-line {
          font-weight: bold;
          margin-bottom: 0.5mm;
          letter-spacing: -0.5px;
        }
        .f16-sig-caption {
          font-size: 8.2pt;
          font-style: italic;
          margin-bottom: 1.2mm;
        }
        .f16-sig-field {
          font-size: 9.4pt;
        }

        .f16-watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-28deg);
          font-size: 38pt;
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
            margin: 5mm 6mm !important;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
            color: #000 !important;
            font-family: 'Times New Roman', Times, 'Liberation Serif', Georgia, serif !important;
            font-size: 10pt !important;
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
            min-height: 284mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
          .f16-title-main { font-size: 16.5pt !important; font-weight: 900 !important; margin-bottom: 0.5mm !important; }
          .f16-rule-sub { font-size: 10pt !important; font-weight: 600 !important; margin-bottom: 0.5mm !important; }
          .f16-parta-title { font-size: 13pt !important; font-weight: 900 !important; margin: 0.5mm 0 !important; }
          .f16-cert-desc { font-size: 9.2pt !important; font-weight: 600 !important; line-height: 1.25 !important; margin-bottom: 1.5mm !important; }
          .f16-grid-table { border: 1.4px solid #000 !important; margin-bottom: 1.5mm !important; }
          .f16-grid-table td { border: 1px solid #000 !important; padding: 1.4mm 2.2mm !important; font-size: 10pt !important; }
          .f16-hdr-cell { font-size: 8.8pt !important; font-weight: 800 !important; color: #000 !important; }
          .f16-val-cell { font-size: 10.5pt !important; font-weight: 700 !important; }
          .f16-table { border: 1.4px solid #000 !important; margin-bottom: 1.5mm !important; }
          .f16-table th { font-size: 9.8pt !important; font-weight: 900 !important; padding: 1.3mm 2mm !important; background: #f0f0f0 !important; }
          .f16-table td { font-size: 10pt !important; padding: 1.2mm 2mm !important; line-height: 1.2 !important; }
          .f16-sec-hdr { font-size: 10pt !important; font-weight: 900 !important; background: #e5e5e5 !important; }
          .f16-b-opt { font-size: 10pt !important; font-weight: 800 !important; padding: 0.8mm !important; }
          .f16-num { font-size: 10.8pt !important; font-weight: 800 !important; font-family: 'Times New Roman', Times, serif !important; }
          .f16-bold { font-weight: 800 !important; }
          .f16-bold-row { font-weight: 800 !important; background: #f8f8f8 !important; }
          .f16-verify-box { font-size: 9.8pt !important; border: 1.3px solid #000 !important; padding: 2mm 3mm !important; margin-top: 1.5mm !important; }
          .f16-verify-title { font-size: 10.5pt !important; font-weight: 900 !important; }
          .f16-verify-text { font-size: 9.8pt !important; line-height: 1.35 !important; }
          .f16-verify-grid { font-size: 10pt !important; }
          .f16-sig-line { font-weight: 900 !important; }
          .f16-sig-caption { font-size: 8.6pt !important; }
          .f16-sig-field { font-size: 10pt !important; }
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

          {/* ========================================================================= */}
          {/* LAYOUT 1: OFFICIAL TRACES STANDARD (CPC-TDS)                              */}
          {/* ========================================================================= */}
          {layout === 'traces' && (
            <>
              {/* Certificate No. & Date Strip */}
              <div className="f16-cert-meta-strip">
                <div>
                  <span>Certificate No: </span>
                  <span className="font-mono">{certNumber}</span>
                </div>
                <div>
                  <span>Last Updated: </span>
                  <span>{currentDate}</span>
                </div>
              </div>

              {/* 2-Column Symmetric TRACES Identity Table */}
              <table className="f16-grid-table">
                <tbody>
                  <tr>
                    <td style={{ width: '50%' }}>
                      <div className="f16-hdr-cell">Details of Deductor (Employer)</div>
                      <div className="f16-val-cell font-bold">{employerName}</div>
                      <div className="f16-val-cell text-xs">{employerAddress}</div>
                    </td>
                    <td style={{ width: '50%' }}>
                      <div className="f16-hdr-cell">Details of Deductee (Employee)</div>
                      <div className="f16-val-cell font-bold">{cert.employee.name || '—'}</div>
                      <div className="f16-val-cell text-xs">
                        <span><b>Designation:</b> {cert.employee.designation || 'Staff'}</span>
                        <br />
                        <span><b>HRPN / Emp No:</b> {cert.hrpn}</span>
                        {employeeAddress ? <div>{employeeAddress}</div> : null}
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style={{ padding: 0 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50%', border: 'none', borderRight: '1px solid #000', padding: '1.2mm 2mm' }}>
                              <span className="f16-mini-label">PAN of Deductor</span>
                              <span className="font-mono font-bold">{cert.employer.pan || 'PANNOTREQD'}</span>
                            </td>
                            <td style={{ width: '50%', border: 'none', padding: '1.2mm 2mm' }}>
                              <span className="f16-mini-label">TAN of Deductor</span>
                              <span className="font-mono font-bold">{cert.employer.tan || '—'}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                    <td>
                      <span className="f16-mini-label">PAN of Deductee (Employee)</span>
                      <span className="font-mono font-bold text-sm">{cert.employee.pan || '—'}</span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <span className="f16-mini-label">CIT (TDS) Location</span>
                      <span className="font-bold">{cert.partA.citTds || 'CIT (TDS), Surat'}</span>
                    </td>
                    <td style={{ padding: 0 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                        <tbody>
                          <tr>
                            <td style={{ width: '50%', border: 'none', borderRight: '1px solid #000', padding: '1.2mm 2mm' }}>
                              <span className="f16-mini-label">Assessment Year</span>
                              <span className="font-bold font-mono">{ayLabel}</span>
                            </td>
                            <td style={{ width: '50%', border: 'none', padding: '1.2mm 2mm' }}>
                              <span className="f16-mini-label">Financial Year</span>
                              <span className="font-bold font-mono">{fyLabel}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={2} style={{ background: '#fafafa', padding: '1.2mm 2.5mm' }}>
                      <span className="f16-mini-label" style={{ display: 'inline', marginRight: '2mm' }}>Period with Employer:</span>
                      <span className="font-bold">From {periodFrom} &nbsp;&nbsp; To {periodTo}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </>
          )}

          {/* ========================================================================= */}
          {/* LAYOUT 2: MODERN EXECUTIVE DUAL-BADGE                                     */}
          {/* ========================================================================= */}
          {layout === 'modern' && (
            <>
              {/* Modern Top Meta Bar */}
              <div className="f16-modern-meta-bar">
                <div className="flex items-center gap-2">
                  <span>Certificate ID: </span>
                  <span className="font-mono font-bold">{certNumber}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="f16-badge-pill">AY {ayLabel}</span>
                  <span className="f16-badge-pill">FY {fyLabel}</span>
                  <span className="f16-badge-pill" style={{ background: '#e0f2fe' }}>
                    {cert.status === 'ISSUED' ? 'OFFICIALLY ISSUED' : 'DRAFT CERTIFICATE'}
                  </span>
                </div>
              </div>

              {/* Modern Dual Cards */}
              <div className="f16-modern-id-container">
                {/* Deductor Profile Card */}
                <div className="f16-modern-card">
                  <div>
                    <div className="f16-modern-card-header">
                      <span className="f16-modern-card-title">Deductor (Employer)</span>
                      <span className="f16-badge-pill font-mono">TAN: {cert.employer.tan || '—'}</span>
                    </div>
                    <div className="font-bold text-[9.5pt]">{employerName}</div>
                    <div className="text-xs text-slate-700 leading-tight mt-0.5">{employerAddress}</div>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-300 flex justify-between text-xs font-semibold">
                    <span>PAN: <b className="font-mono">{cert.employer.pan || 'PANNOTREQD'}</b></span>
                    <span>CIT (TDS): <b>{cert.partA.citTds || 'Surat'}</b></span>
                  </div>
                </div>

                {/* Employee Profile Card */}
                <div className="f16-modern-card">
                  <div>
                    <div className="f16-modern-card-header">
                      <span className="f16-modern-card-title">Deductee (Employee)</span>
                      <span className="f16-badge-pill font-mono" style={{ background: '#fef3c7' }}>
                        PAN: {cert.employee.pan || '—'}
                      </span>
                    </div>
                    <div className="font-bold text-[9.5pt]">{cert.employee.name || '—'}</div>
                    <div className="text-xs text-slate-700 leading-tight mt-0.5">
                      <span>{cert.employee.designation || 'Staff'} · HRPN: <b className="font-mono">{cert.hrpn}</b></span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1 border-t border-slate-300 flex justify-between text-xs font-semibold">
                    <span>Employment Period:</span>
                    <span><b>{periodFrom}</b> to <b>{periodTo}</b></span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Part A Quarterly TDS Summary Table */}
          <table className="f16-table">
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
          <div style={{ textAlign: 'center', fontWeight: '900', fontSize: '11pt', marginTop: '1.2mm', letterSpacing: '0.5px' }}>
            PART B
          </div>
          <div className="f16-b-opt">
            Whether opting out of taxation u/s 115BAC(1A)? <b>NO (New Tax Regime)</b>
          </div>

          {/* Part B: 19-Row Standard Table */}
          <table className="f16-table" style={{ marginBottom: '1mm' }}>
            <thead>
              <tr>
                <th style={{ width: '7%' }}>Sl. No.</th>
                <th style={{ width: '70%', textAlign: 'left', paddingLeft: '2.5mm' }}>Particulars</th>
                <th style={{ width: '23%', textAlign: 'right', paddingRight: '2.5mm' }}>Amount (Rs.)</th>
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
          <div className="f16-verify-grid">
            <div className="f16-verify-left">
              <div><b>Place:</b> {cert.signatory.place || 'Surat'}</div>
              <div><b>Date:</b> {currentDate}</div>
            </div>
            <div className="f16-verify-sig">
              <div style={{ height: '7mm' }}></div>
              <div className="f16-sig-line">__________________________________________</div>
              <div className="f16-sig-caption">(Signature of the person responsible for deducting tax)</div>
              <div className="f16-sig-field"><b>Full Name:</b> {cert.signatory.name || '__________________________'}</div>
              <div className="f16-sig-field"><b>Designation:</b> {cert.signatory.designation || '__________________________'}</div>
            </div>
          </div>
        </div>

        {/* Draft watermark */}
        {cert.status !== 'ISSUED' && (
          <div className="f16-watermark">DRAFT — NOT ISSUED</div>
        )}
      </div>
    </div>
  );
}
