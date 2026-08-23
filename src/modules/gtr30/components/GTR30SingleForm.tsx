import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, splitRsPs } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
  instanceId?: string;
}

const renderBoxGroup = (
  value: string | number | undefined | null,
  count: number,
  instanceId: string,
  fieldId: string,
  cellWidthMm = 4.6
) => {
  const str = value !== undefined && value !== null ? String(value) : '';
  const cleaned = str.replace(/[^a-zA-Z0-9+-]/g, '').padEnd(count, ' ').slice(0, count);
  const chars = cleaned.split('');
  return (
    <div
      id={`${instanceId}-${fieldId}`}
      style={{
        display: 'inline-flex',
        border: '0.8px solid #000',
        height: '4.6mm',
        verticalAlign: 'middle',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
      }}
    >
      {chars.map((ch, i) => (
        <span
          key={i}
          id={`${instanceId}-${fieldId}-${i}`}
          style={{
            width: `${cellWidthMm}mm`,
            height: '100%',
            borderRight: i < count - 1 ? '0.8px solid #000' : 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Courier New', monospace",
            fontSize: '6.0pt',
            fontWeight: 700,
            lineHeight: 1,
            boxSizing: 'border-box',
          }}
        >
          {ch !== ' ' ? ch : ''}
        </span>
      ))}
    </div>
  );
};

const splitEdp5 = (code: string | undefined | null): [string, string, string, string, string] => {
  if (!code) return ['', '', '', '', ''];
  const cleaned = String(code).replace(/\s+/g, '');
  if (cleaned.length === 5) {
    return [cleaned[0], cleaned[1], cleaned[2], cleaned[3], cleaned[4]];
  }
  if (cleaned.length === 1 && (cleaned === '+' || cleaned === '-')) {
    return ['', '', '', '', cleaned];
  }
  const res: [string, string, string, string, string] = ['', '', '', '', ''];
  for (let i = 0; i < Math.min(cleaned.length, 5); i++) {
    res[i] = cleaned[i];
  }
  return res;
};

const formatFinancialYear = (budgetYear?: string, monthOf?: string): string => {
  if (budgetYear && budgetYear.trim()) {
    const cleaned = budgetYear.trim();
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      const y1 = parts[0].length === 2 ? `20${parts[0]}` : parts[0];
      const y2 = parts[1].length === 2 ? `20${parts[1]}` : parts[1];
      return `${y1}-${y2}`;
    }
    return cleaned;
  }
  if (monthOf && monthOf.includes('-')) {
    const [yStr, mStr] = monthOf.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (!isNaN(y) && !isNaN(m)) {
      const startYear = m >= 4 ? y : y - 1;
      return `${startYear}-${startYear + 1}`;
    }
  }
  const now = new Date();
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
};

export const GTR30SingleForm: React.FC<Props> = ({
  data,
  instanceId = 'front',
}) => {
  const totals = billTotals(data);
  const employees = data.employees || [];
  const sumField = (fn: (e: (typeof employees)[0]) => number) =>
    employees.reduce((s, e) => s + (fn(e) || 0), 0);

  const payOfOfficer = sumField((e) => e.payOfOfficer);
  const payOfEstablishment = sumField((e) => e.payOfEstablishment);
  const nppa = sumField((e) => e.nppa);
  const leaveSalary = sumField((e) => e.leaveSalary);
  const leaveEncashment = sumField((e) => e.leaveEncashment);
  const da = sumField((e) => e.da);
  const hra = sumField((e) => e.hra);
  const cla = sumField((e) => e.cla);
  const interimRelief = 0;
  const transportAllowance = sumField((e) => e.transportAllowance);
  const otherAllowance = sumField((e) => e.otherAllowance);
  const medicalAllowance = sumField((e) => e.medicalAllowance);
  const bonus = sumField((e) => e.bonus);
  const pta = sumField((e) => e.pta);
  const officeExpenses = sumField((e) => e.officeExpenseOther);
  const profSplService = sumField((e) => e.profSplService);
  const otherCharges = sumField((e) => e.washingAllowance);
  const ropArrearsGaz = sumField((e) => e.ropArrearsGaz);
  const ropArrearsNonGaz = sumField((e) => e.ropArrearsNonGaz);
  const dpGaz = sumField((e) => e.dpGaz);
  const dpNonGaz = sumField((e) => e.dpNonGaz);
  const recovFestivalAdv = sumField((e) => e.recovFestivalAdv);
  const recovFoodGrainAdv = sumField((e) => e.recovFoodGrainAdv);
  const recovPay = sumField((e) => e.recovPay);
  const leaveSalaryAdv = sumField((e) => e.leaveSalaryAdv);

  const formatCell = (val: number, isBlank = false, isHeader = false) => {
    if (isBlank || isHeader) return { rs: '', ps: '' };
    if (!val || val === 0) return { rs: '0', ps: '00' };
    const p = splitRsPs(val);
    return { rs: p.rs, ps: p.ps };
  };

  const grossCell = splitRsPs(totals.gross);

  const expenditureRows = [
    { code: '0100', name: 'Salaries :', edp: '', val: 0, isHeader: true },
    { code: '0101', name: 'Pay of Officer', edp: '0101+', val: payOfOfficer },
    { code: '0102', name: 'Pay of Establishment', edp: '0102+', val: payOfEstablishment },
    { code: '0102', name: 'Leave Salary', edp: '0102+', val: leaveSalary },
    { code: '0103', name: 'Dearness Allowance', edp: '0103+', val: da },
    { code: '0104', name: 'Other Allowance', edp: '0104+', val: otherAllowance },
    { code: '0107', name: 'Medical Allowance', edp: '0107+', val: medicalAllowance },
    { code: '0108', name: 'Bonus', edp: '0108+', val: bonus },
    { code: '0109', name: 'Leave Encashment', edp: '0109+', val: leaveEncashment },
    { code: '0110', name: 'House Rent Allowance', edp: '0110+', val: hra },
    { code: '0111', name: 'Compensatory Local Allowance', edp: '0111+', val: cla },
    { code: '0112', name: 'Interim Relief', edp: '0112+', val: interimRelief },
    { code: '0113', name: 'Transport Allowance', edp: '0113+', val: transportAllowance },
    { code: '0117', name: 'ROP Arrears (Gazetted)', edp: '0117+', val: ropArrearsGaz },
    { code: '0118', name: 'ROP Arrears (Non Gazetted)', edp: '0118+', val: ropArrearsNonGaz },
    { code: '0119', name: 'D.P. (Gazetted)', edp: '0119+', val: dpGaz },
    { code: '0120', name: 'D.P. (Non-Gazetted)', edp: '0120+', val: dpNonGaz },
    { code: '0128', name: 'N.P.P.A.', edp: '0128+', val: nppa },
    { code: '1100', name: 'Travel Expenses (PTA)', edp: '1101+', val: pta },
    { code: '1300', name: 'Office Expenses', edp: '1301+', val: officeExpenses },
    { code: '2800', name: 'Payment for Professional and Special Services', edp: '2801+', val: profSplService },
    { code: '5000', name: 'Other Charges', edp: '5006+', val: otherCharges },
    { code: '', name: '', edp: '', val: 0, isBlank: true },
    { code: '', name: 'Festival Advance Rec.', edp: '5701-', val: recovFestivalAdv },
    { code: '', name: 'Food Grain Advance Rec.', edp: '5801-', val: recovFoodGrainAdv },
    { code: '', name: 'Recovery of Pay', edp: '0101-', val: recovPay },
    { code: '', name: 'Leave Salary Advance', edp: '0102-', val: leaveSalaryAdv },
  ];

  return (
    <div
      id={`${instanceId}-container`}
      className="gtr30-single-form"
      style={{
        fontFamily: "'Times New Roman', Times, serif",
        fontSize: '6.0pt',
        lineHeight: 1.12,
        color: '#000000',
        backgroundColor: '#ffffff',
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
      }}
    >
      <div>
        {/* 1. TOP HEADER & PUBLICATION NOTICES */}
        <div
          id={`${instanceId}-top-header`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            fontSize: '5.8pt',
            lineHeight: 1.05,
            marginBottom: '0.4mm',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div>G. P. Rjt., Sr. 1 Std.-175 2-2009 2,00,000 A4* WP-BI</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '5.6pt' }}>
              ના.વિ.ના પત્ર ક્રમાંક : તજર-૧૦૦૪-૧૨૨૬-ઝ-૮૪૭ (૦૫) તા. ૨-૧-૨૦૦૬.
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div>Outer General l. e. &amp; g. (Revised) (Outer)</div>
            <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '5.6pt' }}>
              આઉટર જન. ૧ ઈ. અને જી. (સુધારેલ) (આઉટર)
            </div>
          </div>
        </div>

        {/* 2. FORM TITLE */}
        <div
          id={`${instanceId}-form-title-section`}
          style={{
            position: 'relative',
            textAlign: 'center',
            marginTop: '0.2mm',
            marginBottom: '0.6mm',
          }}
        >
          <h1
            id={`${instanceId}-title`}
            style={{
              fontSize: '9.8pt',
              fontWeight: 900,
              letterSpacing: '0.3px',
              margin: '0',
              lineHeight: 1.05,
            }}
          >
            FORM G. T. R. 30
          </h1>
          <div style={{ fontSize: '5.8pt', fontStyle: 'italic', lineHeight: 1 }}>(See Rule 176(1))</div>
        </div>

        {/* 3. ESTABLISHMENT, OFFICE, MONTH INFO */}
        <div
          id={`${instanceId}-establishment-info`}
          style={{
            fontSize: '6.0pt',
            lineHeight: 1.15,
            marginBottom: '0.6mm',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              Pay Bill for the Establishment{' '}
              <strong
                id={`${instanceId}-establishment`}
                style={{
                  borderBottom: '0.8px solid #000',
                  padding: '0 2px',
                  minWidth: '50px',
                  display: 'inline-block',
                }}
              >
                {data.billCode || data.branchName || ''}
              </strong>
            </div>
            <div>
              Name of Office{' '}
              <strong
                id={`${instanceId}-office-name`}
                style={{
                  borderBottom: '0.8px solid #000',
                  padding: '0 2px',
                  minWidth: '70px',
                  display: 'inline-block',
                }}
              >
                {data.officeFullName || data.officeName || ''}
              </strong>
            </div>
          </div>
          <div style={{ marginTop: '0.3mm' }}>
            For the month of{' '}
            <strong
              id={`${instanceId}-month-of`}
              style={{
                borderBottom: '0.8px solid #000',
                padding: '0 2px',
                minWidth: '60px',
                display: 'inline-block',
              }}
            >
              {data.monthOf || ''}
            </strong>
          </div>
        </div>

        {/* 4. "FOR USE IN TREASURY" SECTION */}
        <div
          id={`${instanceId}-treasury-section`}
          style={{
            borderTop: '0.8px solid #000',
            borderBottom: '0.8px solid #000',
            padding: '0.4mm 0',
            marginBottom: '0.6mm',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              fontStyle: 'italic',
              fontWeight: 700,
              fontSize: '6.2pt',
              marginBottom: '0.3mm',
            }}
          >
            For use in Treasury
          </div>
          <div style={{ fontSize: '6.0pt', marginBottom: '0.4mm' }}>
            Name of the Treasury{' '}
            <strong
              id={`${instanceId}-treasury-name`}
              style={{
                borderBottom: '0.8px solid #000',
                padding: '0 2px',
                minWidth: '80px',
                display: 'inline-block',
              }}
            >
              {data.treasuryName || ''}
            </strong>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4mm',
              fontSize: '5.8pt',
            }}
          >
            {[1, 2, 3].map((rowNum) => {
              const t = data.transits && data.transits[rowNum - 1];
              return (
                <div
                  key={rowNum}
                  id={`${instanceId}-transit-row-${rowNum}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>
                    Bill Transit Reg. Sr. No.{' '}
                    <strong
                      id={`${instanceId}-transit-sr-${rowNum}`}
                      style={{
                        borderBottom: '0.8px solid #000',
                        width: '24px',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}
                    >
                      {t?.srNo || ''}
                    </strong>
                  </span>
                  <span>
                    Date{' '}
                    <strong
                      id={`${instanceId}-transit-date-${rowNum}`}
                      style={{
                        borderBottom: '0.8px solid #000',
                        width: '32px',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}
                    >
                      {t?.date || ''}
                    </strong>
                  </span>
                  <span>
                    Token No.{' '}
                    <strong
                      id={`${instanceId}-transit-token-${rowNum}`}
                      style={{
                        borderBottom: '0.8px solid #000',
                        width: '24px',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}
                    >
                      {t?.tokenNo || ''}
                    </strong>
                  </span>
                  <span>
                    Date :{' '}
                    <strong
                      id={`${instanceId}-transit-tokendate-${rowNum}`}
                      style={{
                        borderBottom: '0.8px solid #000',
                        width: '32px',
                        display: 'inline-block',
                        textAlign: 'center',
                      }}
                    >
                      {t?.tokenDate || ''}
                    </strong>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. "COMPUTER INPUT DATA" HEADER & BOXES */}
        <div
          id={`${instanceId}-computer-input-header`}
          style={{
            textAlign: 'center',
            fontWeight: 700,
            fontSize: '6.2pt',
            lineHeight: 1.05,
            marginTop: '0.2mm',
          }}
        >
          COMPUTER INPUT DATA
          <div style={{ fontSize: '5.4pt', fontWeight: 400, fontStyle: 'italic' }}>
            (To be filled in by Treasury)
          </div>
        </div>

        <div
          id={`${instanceId}-computer-input-fields`}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '6.0pt',
            padding: '0.5mm 0',
            marginBottom: '0.6mm',
            backgroundColor: '#fff',
          }}
        >
          <div>
            1. &nbsp;District &nbsp;{' '}
            {renderBoxGroup('', 2, instanceId, 'district')}
          </div>
          <div>
            2. &nbsp;Month &amp; Year &nbsp;{' '}
            {renderBoxGroup('', 4, instanceId, 'month-year')}
          </div>
          <div>
            3. &nbsp;Voucher No. &nbsp;{' '}
            {renderBoxGroup('', 4, instanceId, 'voucher-no')}
          </div>
        </div>

        {/* 6. MAIN BODY (LEFT COLUMN & RIGHT COLUMN) */}
        <div
          id={`${instanceId}-main-body-container`}
          style={{
            display: 'grid',
            gridTemplateColumns: '42% 58%',
            boxSizing: 'border-box',
          }}
        >
          {/* LEFT COLUMN: CLASSIFICATION & ACCOUNT HEADS */}
          <div
            id={`${instanceId}-left-column`}
            style={{
              padding: '0.5mm 1.5mm 0.4mm 0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              boxSizing: 'border-box',
            }}
          >
            <div>
              {/* Numbered Classification Rows 4 to 11 */}
              <div
                id={`${instanceId}-classification-table`}
                style={{
                  width: '100%',
                  fontSize: '6.0pt',
                  lineHeight: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.1mm',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>4. Controlling Officer</span>
                  {renderBoxGroup(data.controllingOfficer || '', 4, instanceId, 'ctrl-officer')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>5. Class of Expenditure</span>
                  {renderBoxGroup(data.classOfExpenditure || '1', 1, instanceId, 'class-exp')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>6. Fund</span>
                  {renderBoxGroup(data.fund || '3', 1, instanceId, 'fund')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>7. Drawing Officer</span>
                  {renderBoxGroup(data.drawingOfficer || '299', 3, instanceId, 'draw-officer')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>8. Demand No.</span>
                  {renderBoxGroup(data.demandNo || '004', 3, instanceId, 'demand-no')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>9. Type of Budget</span>
                  {renderBoxGroup(data.typeOfBudget || '1', 1, instanceId, 'type-budget')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>10. Scheme No.</span>
                  {renderBoxGroup(data.schemeNo || '0000000', 7, instanceId, 'scheme-no')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', height: '5.1mm' }}>
                  <span style={{ whiteSpace: 'nowrap' }}>11. Head Chargeable.</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '5.2mm', paddingTop: '0.1mm' }}>
                  {renderBoxGroup(data.headChargeable || '240300113990', 12, instanceId, 'head-chargeable', 4.55)}
                </div>
              </div>

              {/* Account-Head Fields Sub-Box */}
              <div
                id={`${instanceId}-account-heads-box`}
                style={{
                  marginTop: '0.4mm',
                  fontSize: '5.8pt',
                  lineHeight: 1.12,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '46px 1fr', rowGap: '0.15mm' }}>
                  <span>Sector</span>
                  <span>: <strong>{data.sector || 'Sector-C-Economic Service'}</strong></span>
                  <span>Demand No.</span>
                  <span>: <strong>{data.demandNoLabel || 'Demand No. 004'}</strong></span>
                  <span>Major Head</span>
                  <span>: <strong>{data.majorHead || 'Major Head-2403 Animal Husbandry'}</strong></span>
                  <span>Sub-Major Head</span>
                  <span>: <strong>{data.subMajorHead || '-'}</strong></span>
                  <span>Minor Head</span>
                  <span>: <strong>{data.minorHead || 'Minor Head-113 Investigation'}</strong></span>
                  <span>Sub-Head</span>
                  <span>: <strong>{data.subHead || 'Sub Head-99 Scheme for Statistical...'}</strong></span>
                  <span style={{ display: 'flex', alignItems: 'center' }}>Detailed Head</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.8mm' }}>
                    : {renderBoxGroup('00', 2, instanceId, 'detailed-head')}
                  </span>
                </div>
              </div>
            </div>

            <div>
              {/* Financial / Budget Allotment Section */}
              <div
                id={`${instanceId}-budget-allocation-section`}
                style={{
                  borderTop: '0.8px solid #000',
                  paddingTop: '0.5mm',
                  marginTop: '0.5mm',
                  fontSize: '5.8pt',
                  lineHeight: 1.1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Budget Allotment for {formatFinancialYear(data.budgetYear, data.monthOf)}
                  </span>
                  <span>
                    Rs.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        minWidth: '22px',
                        display: 'inline-block',
                      }}
                    >
                      &nbsp;
                    </span>{' '}
                    Ps.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        minWidth: '12px',
                        display: 'inline-block',
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5mm' }}>
                  <span>Expenditure Including this bill</span>
                  <span
                    style={{
                      borderBottom: '0.8px solid #000',
                      minWidth: '52px',
                      display: 'inline-block',
                      textAlign: 'right',
                    }}
                  >
                    &nbsp;
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5mm' }}>
                  <span>Balance available</span>
                  <span
                    style={{
                      borderBottom: '0.8px solid #000',
                      minWidth: '52px',
                      display: 'inline-block',
                      textAlign: 'right',
                    }}
                  >
                    &nbsp;
                  </span>
                </div>
              </div>

              {/* "For Use in A. G. Office" Section */}
              <div
                id={`${instanceId}-ag-office-section`}
                style={{
                  borderTop: '0.8px solid #000',
                  marginTop: '0.8mm',
                  paddingTop: '0.6mm',
                  fontSize: '5.8pt',
                  lineHeight: 1.15,
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    fontWeight: 700,
                    fontStyle: 'italic',
                    fontSize: '6.2pt',
                    marginBottom: '0.5mm',
                  }}
                >
                  For Use in A. G. Office
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                  <span>Admited for</span>
                  <span>
                    Rs.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        display: 'inline-block',
                        width: '44px',
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5mm' }}>
                  <span>Objected for</span>
                  <span>
                    Rs.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        display: 'inline-block',
                        width: '44px',
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                </div>
                <div style={{ marginBottom: '0.8mm' }}>
                  Reasons for Objection{' '}
                  <span
                    style={{
                      borderBottom: '0.8px solid #000',
                      display: 'inline-block',
                      width: '54px',
                    }}
                  >
                    &nbsp;
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '5.8pt',
                    borderTop: '0.8px solid #000',
                    paddingTop: '0.8mm',
                  }}
                >
                  <span style={{ width: '30%', borderRight: '0.8px solid #000' }}>Auditor</span>
                  <span style={{ width: '35%', borderRight: '0.8px solid #000' }}>Section Officer</span>
                  <span style={{ width: '35%' }}>Gazetted Officer</span>
                </div>
              </div>
            </div>
            </div>

          {/* RIGHT COLUMN: MAIN EXPENDITURE TABLE WITH 5-COLUMN EDP CODE */}
          <div
            id={`${instanceId}-right-column`}
            style={{
              padding: '0 0 0 1.5mm',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxSizing: 'border-box',
            }}
          >
            <div>
              <table
                id={`${instanceId}-expenditure-table`}
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '0.8px solid #000',
                  fontSize: '6.0pt',
                  lineHeight: 1.05,
                  tableLayout: 'fixed',
                }}
              >
                <colgroup>
                  <col style={{ width: '10mm' }} />
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '2.6mm' }} />
                  <col style={{ width: '2.6mm' }} />
                  <col style={{ width: '2.6mm' }} />
                  <col style={{ width: '2.6mm' }} />
                  <col style={{ width: '2.6mm' }} />
                  <col style={{ width: '12mm' }} />
                  <col style={{ width: '5mm' }} />
                </colgroup>
                <thead>
                  <tr
                    style={{
                      textAlign: 'center',
                      borderBottom: '0.8px solid #000',
                      fontWeight: 700,
                      fontSize: '5.8pt',
                    }}
                  >
                    <th
                      rowSpan={2}
                      style={{
                        borderRight: '0.8px solid #000',
                        borderBottom: '0.8px solid #000',
                        padding: '0.4mm 0.2mm',
                        verticalAlign: 'middle',
                      }}
                    >
                      Budget
                      <br />
                      Code
                    </th>
                    <th
                      rowSpan={2}
                      style={{
                        borderRight: '0.8px solid #000',
                        borderBottom: '0.8px solid #000',
                        padding: '0.4mm 0.8mm',
                        textAlign: 'left',
                        verticalAlign: 'middle',
                      }}
                    >
                      Object of Expenditure
                    </th>
                    {/* EDP CODE: 1 ROW WITH 5 SEPARATE COLUMNS */}
                    <th
                      rowSpan={2}
                      colSpan={5}
                      id={`${instanceId}-edp-header`}
                      style={{
                        borderRight: '0.8px solid #000',
                        borderBottom: '0.8px solid #000',
                        padding: '0.4mm 0.2mm',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                      }}
                    >
                      EDP Code
                    </th>
                    <th
                      colSpan={2}
                      style={{
                        borderBottom: '0.5px solid #000',
                        padding: '0.4mm 0.2mm',
                        textAlign: 'center',
                      }}
                    >
                      Amount
                    </th>
                  </tr>
                  <tr
                    style={{
                      textAlign: 'center',
                      borderBottom: '0.8px solid #000',
                      fontWeight: 600,
                      fontSize: '5.6pt',
                    }}
                  >
                    <th style={{ borderRight: '0.5px solid #000', padding: '0.15mm 0' }}>Rs.</th>
                    <th style={{ padding: '0.15mm 0' }}>Ps.</th>
                  </tr>
                </thead>
                <tbody>
                  {expenditureRows.map((row, idx) => {
                    const cell = formatCell(row.val, row.isBlank, row.isHeader);
                    const edpCells = splitEdp5(row.edp);
                    return (
                      <tr
                        key={idx}
                        id={`${instanceId}-row-${idx}`}
                        style={{
                          height: '2.85mm',
                          borderBottom: idx === expenditureRows.length - 1 ? '0.8px solid #000' : '0.4px solid #000',
                        }}
                      >
                        <td
                          style={{
                            borderRight: '0.8px solid #000',
                            padding: '0 0.2mm',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: row.isHeader ? 700 : 400,
                          }}
                        >
                          {row.code}
                        </td>
                        <td
                          style={{
                            borderRight: '0.8px solid #000',
                            padding: '0 0.8mm',
                            fontWeight: row.isHeader ? 700 : 400,
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            verticalAlign: 'middle',
                            textAlign: 'left',
                          }}
                        >
                          {row.name}
                        </td>
                        {/* 5 DISTINCT EDP CELLS */}
                        <td
                          id={`${instanceId}-edp-${idx}-0`}
                          style={{
                            borderRight: '0.4px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {edpCells[0]}
                        </td>
                        <td
                          id={`${instanceId}-edp-${idx}-1`}
                          style={{
                            borderRight: '0.4px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {edpCells[1]}
                        </td>
                        <td
                          id={`${instanceId}-edp-${idx}-2`}
                          style={{
                            borderRight: '0.4px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {edpCells[2]}
                        </td>
                        <td
                          id={`${instanceId}-edp-${idx}-3`}
                          style={{
                            borderRight: '0.4px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {edpCells[3]}
                        </td>
                        <td
                          id={`${instanceId}-edp-${idx}-4`}
                          style={{
                            borderRight: '0.8px solid #000',
                            textAlign: 'center',
                            verticalAlign: 'middle',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            fontWeight: 700,
                            padding: 0,
                          }}
                        >
                          {edpCells[4]}
                        </td>
                        <td
                          style={{
                            borderRight: '0.5px solid #000',
                            padding: '0 0.8mm',
                            textAlign: 'right',
                            fontWeight: 400,
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            verticalAlign: 'middle',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cell.rs}
                        </td>
                        <td
                          style={{
                            padding: '0 0.2mm',
                            textAlign: 'center',
                            fontWeight: 400,
                            fontSize: '6.0pt',
                            lineHeight: 1.0,
                            verticalAlign: 'middle',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {cell.ps}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Gross Total Row */}
                  <tr
                    id={`${instanceId}-gross-total-row`}
                    style={{
                      borderTop: '0.8px solid #000',
                      fontWeight: 800,
                      height: '3.0mm',
                      fontSize: '6.2pt',
                    }}
                  >
                    <td style={{ borderRight: '0.8px solid #000' }}></td>
                    <td style={{ borderRight: '0.8px solid #000', padding: '0 0.8mm' }}>Gross Total</td>
                    <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                    <td style={{ borderRight: '0.5px solid #000', padding: '0 0.8mm', textAlign: 'right' }}>
                      {grossCell.rs}
                    </td>
                    <td style={{ padding: '0 0.2mm', textAlign: 'center' }}>{grossCell.ps}</td>
                  </tr>
                </tbody>
              </table>

              {/* Note reverse */}
              <div
                style={{
                  fontSize: '5.2pt',
                  fontStyle: 'italic',
                  lineHeight: 1.05,
                  marginTop: '0.4mm',
                }}
              >
                * Please See Note for other object head of expenditure as shown reverse
              </div>

              {/* Please issue cheques section */}
              <div
                id={`${instanceId}-cheques-section`}
                style={{
                  marginTop: '0.6mm',
                  borderTop: '0.8px solid #000',
                  padding: '0.4mm 0.5mm',
                  fontSize: '6.0pt',
                  lineHeight: 1.15,
                }}
              >
                <div
                  style={{
                    fontStyle: 'italic',
                    textAlign: 'center',
                    fontWeight: 700,
                    marginBottom: '0.3mm',
                    fontSize: '6.0pt',
                  }}
                >
                  Please issue cheques shown below
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingBottom: '0.2mm',
                  }}
                >
                  <span>(1) In favour of Drawing Officer</span>
                  <span>
                    for Rs.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        display: 'inline-block',
                        width: '24px',
                      }}
                    >
                      &nbsp;
                    </span>{' '}
                    P.{' '}
                    <span
                      style={{
                        borderBottom: '0.8px solid #000',
                        display: 'inline-block',
                        width: '8px',
                      }}
                    >
                      &nbsp;
                    </span>
                  </span>
                </div>
                <div style={{ paddingBottom: '0.2mm' }}>
                  (2) In favour of Officers
                </div>
                <div style={{ paddingLeft: '2mm' }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '0.2mm',
                    }}
                  >
                    <span>
                      (I) Shri{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '20px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                    <span>
                      for Rs.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '18px',
                        }}
                      >
                        &nbsp;
                      </span>{' '}
                      P.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '7px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '0.2mm',
                    }}
                  >
                    <span>
                      (II) Smt{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '20px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                    <span>
                      for Rs.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '18px',
                        }}
                      >
                        &nbsp;
                      </span>{' '}
                      P.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '7px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingBottom: '0.2mm',
                    }}
                  >
                    <span>
                      (III) As per cheque list attached
                    </span>
                    <span>
                      for Rs.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '18px',
                        }}
                      >
                        &nbsp;
                      </span>{' '}
                      P.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '7px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      marginTop: '0.2mm',
                    }}
                  >
                    <span>Total</span>
                    <span>
                      Rs.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '20px',
                        }}
                      >
                        &nbsp;
                      </span>{' '}
                      P.{' '}
                      <span
                        style={{
                          borderBottom: '0.8px solid #000',
                          display: 'inline-block',
                          width: '7px',
                        }}
                      >
                        &nbsp;
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature of Drawing Officer */}
            <div
              id={`${instanceId}-signature-section`}
              style={{
                textAlign: 'center',
                marginTop: '1.0mm',
                fontSize: '5.8pt',
                lineHeight: 1.2,
                paddingTop: '6.5mm',
              }}
            >
              {data.drawingOfficerName && (
                <div style={{ fontWeight: 700, fontSize: '6.2pt' }}>
                  ({data.drawingOfficerName})
                </div>
              )}
              {data.drawingOfficerDesignation && (
                <div style={{ fontSize: '5.8pt' }}>{data.drawingOfficerDesignation}</div>
              )}
              {data.drawingOfficerOffice && (
                <div style={{ fontSize: '5.8pt' }}>{data.drawingOfficerOffice}</div>
              )}
              <div style={{ fontSize: '5.8pt', marginTop: '0.2mm' }}>
                {data.ddoCode && <span>DDO: {data.ddoCode} · </span>}
                Cardex Code No.{' '}
                <strong id={`${instanceId}-cardex-code`}>{data.cardexNo || '22'}</strong>
                {data.station && <span> · {data.station}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
