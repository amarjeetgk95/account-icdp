import React from 'react';
import type { GTR30FormData } from '../types';
import { formatMoney } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

const renderAmount = (val: number | undefined | null) => {
  const num = Number(val) || 0;
  return num > 0 ? formatMoney(num) : '-';
};

export const GTR30Page3Inner1: React.FC<Props> = ({ data }) => {
  const employees = data.employees || [];

  const sum = (fn: (e: (typeof employees)[0]) => number) =>
    employees.reduce((acc, e) => acc + (fn(e) || 0), 0);

  const totalPayEstablishment = sum((e) => e.payOfEstablishment || e.payOfOfficer || 0);
  const totalNppa = sum((e) => e.nppa);
  const totalLeaveSalary = sum((e) => (e.leaveSalary || 0) + (e.leaveEncashment || 0));
  const totalDearnessPay = sum((e) => e.dearnessPay);
  const totalDa = sum((e) => e.da);
  const totalHra = sum((e) => e.hra);
  const totalCla = sum((e) => (e.cla || 0) + (e.otherAllowance || 0));
  const totalMedical = sum((e) => (e.medicalAllowance || 0) + (e.bonus || 0));
  const totalPta = sum((e) => (e.pta || 0) + (e.profSplService || 0));
  const totalWashing = sum((e) => (e.washingAllowance || 0) + (e.officeExpenseOther || 0));
  const totalCa = sum((e) => e.ca);
  const totalTransport = sum((e) => e.transportAllowance);

  const totalGrossAmount = sum(
    (e) =>
      (e.payOfOfficer || 0) +
      (e.payOfEstablishment || 0) +
      (e.nppa || 0) +
      (e.leaveSalary || 0) +
      (e.leaveEncashment || 0) +
      (e.dearnessPay || 0) +
      (e.da || 0) +
      (e.hra || 0) +
      (e.cla || 0) +
      (e.otherAllowance || 0) +
      (e.medicalAllowance || 0) +
      (e.bonus || 0) +
      (e.pta || 0) +
      (e.profSplService || 0) +
      (e.washingAllowance || 0) +
      (e.officeExpenseOther || 0) +
      (e.ca || 0) +
      (e.transportAllowance || 0) +
      (e.ropArrearsGaz || 0) +
      (e.ropArrearsNonGaz || 0) +
      (e.dpGaz || 0) +
      (e.dpNonGaz || 0)
  );

  const totalRecovFestival = sum((e) => e.recovFestivalAdv);
  const totalRecovFoodGrain = sum((e) => e.recovFoodGrainAdv);
  const totalCol19 = totalGrossAmount - totalRecovFestival - totalRecovFoodGrain;

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-3">
      {/* Top Left Resolution Box */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '6px' }}>
        <div
          style={{
            border: '1px solid #000',
            padding: '4px 8px',
            maxWidth: '360px',
            fontSize: '7pt',
            lineHeight: 1.35,
            fontFamily: "'Noto Serif Gujarati', serif",
            backgroundColor: '#ffffff',
          }}
        >
          {data.schemeResolutionText ||
            'ગુજરાત સરકારશ્રીના કૃષિ અને ગ્રામ વિકાસ વિભાગ, સચિવાલય, ગાંધીનગરના ઠરાવ ક્રમાંક: એએચએસ-૧૨૮૬-સી-૫૧૨-પી-૨ તા:૧-૧૧-૧૯૮૮ થી યોજનાને કાયમી ધોરણે ચાલુ રાખવાની મંજુરી મળેલ છે.'}
        </div>
      </div>

      {/* Main Table for Columns 1 to 19 */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1.5px solid #000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '7pt',
        }}
      >
        <thead>
          <tr style={{ height: '165px', background: '#ffffff' }}>
            {/* 1. Sr. No. */}
            <th style={{ border: '1px solid #000', width: '22px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Sr. No.</div>
            </th>

            {/* 2. Section of Establishment */}
            <th style={{ border: '1px solid #000', width: '210px', padding: '6px 4px', verticalAlign: 'bottom', textAlign: 'center', fontSize: '7.5pt', fontWeight: 600 }}>
              Section of Establishment and name of Incumbent
            </th>

            {/* 3. Pay of Officers */}
            <th style={{ border: '1px solid #000', width: '42px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Pay of Officers (0101)<br />Substantive Pay</div>
            </th>

            {/* 4. Pay of Establishment */}
            <th style={{ border: '1px solid #000', width: '68px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Pay of Establishment (0102)<br />Substantive/ Officiating Pay (0102)</div>
            </th>

            {/* 5. N.P.P.A. */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">N.P.P.A. (0128)</div>
            </th>

            {/* 6. Leave Salary */}
            <th style={{ border: '1px solid #000', width: '45px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Leave Salary (0102)<br />Leave Encashment (0109)</div>
            </th>

            {/* 7. Dearness Pay */}
            <th style={{ border: '1px solid #000', width: '45px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Dearness Pay (0120)<br />Family Planning</div>
            </th>

            {/* 8. Dearness Allowance */}
            <th style={{ border: '1px solid #000', width: '60px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Dearness Allowance (0103)</div>
            </th>

            {/* 9. HRA */}
            <th style={{ border: '1px solid #000', width: '45px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">House Rent Allowance (0110)</div>
            </th>

            {/* 10. CLA / Other */}
            <th style={{ border: '1px solid #000', width: '48px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">CLA (0111)/<br />Other Allowance (0104)</div>
            </th>

            {/* 11. Medical / Bonus */}
            <th style={{ border: '1px solid #000', width: '52px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Medical Allowance (0107)<br />Bonus (0108)</div>
            </th>

            {/* 12. PTA */}
            <th style={{ border: '1px solid #000', width: '48px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">P.T.A. (Travel Expenses) (1101)<br />Payment for Prof. &amp; Spl.Service(2801)</div>
            </th>

            {/* 13. Washing */}
            <th style={{ border: '1px solid #000', width: '48px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Washing Allowance (1301)<br />Office Expenses/ Other Charges (5006)</div>
            </th>

            {/* 14. C. A. */}
            <th style={{ border: '1px solid #000', width: '32px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">C. A.</div>
            </th>

            {/* 15. Transport */}
            <th style={{ border: '1px solid #000', width: '55px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Transport Allowance (0113)</div>
            </th>

            {/* 16. Gross */}
            <th style={{ border: '1px solid #000', width: '62px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text font-bold">Gross Amount</div>
            </th>

            {/* 17. Recov Festival */}
            <th style={{ border: '1px solid #000', width: '45px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Recov. of Festival Advance<br />(-)(5701)</div>
            </th>

            {/* 18. Recov Food Grain */}
            <th style={{ border: '1px solid #000', width: '45px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Recov. of Food Grain Advance<br />(-)(5801)</div>
            </th>

            {/* 19. Total */}
            <th style={{ border: '1px solid #000', width: '62px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text font-bold">Total</div>
            </th>
          </tr>

          {/* Numbering Row 1 to 19 */}
          <tr style={{ background: '#ffffff', textAlign: 'center', fontWeight: 600, fontSize: '6.5pt' }}>
            <th style={{ border: '1px solid #000', padding: '1px' }}>1</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>2</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>3</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>4</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>5</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>6</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>7</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>8</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>9</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>10</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>11</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>12</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>13</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>14</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>15</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>16</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>17</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>18</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>19</th>
          </tr>
        </thead>

        <tbody>
          {employees.map((emp, index) => {
            const empGross =
              (emp.payOfOfficer || 0) +
              (emp.payOfEstablishment || 0) +
              (emp.nppa || 0) +
              (emp.leaveSalary || 0) +
              (emp.leaveEncashment || 0) +
              (emp.dearnessPay || 0) +
              (emp.da || 0) +
              (emp.hra || 0) +
              (emp.cla || 0) +
              (emp.otherAllowance || 0) +
              (emp.medicalAllowance || 0) +
              (emp.bonus || 0) +
              (emp.pta || 0) +
              (emp.profSplService || 0) +
              (emp.washingAllowance || 0) +
              (emp.officeExpenseOther || 0) +
              (emp.ca || 0) +
              (emp.transportAllowance || 0) +
              (emp.ropArrearsGaz || 0) +
              (emp.ropArrearsNonGaz || 0) +
              (emp.dpGaz || 0) +
              (emp.dpNonGaz || 0);

            const empCol19 = empGross - (emp.recovFestivalAdv || 0) - (emp.recovFoodGrainAdv || 0);

            return (
              <React.Fragment key={emp.id || index}>
                {/* 7th Pay Matrix Banner Sub-row */}
                <tr style={{ background: '#ffffff', fontSize: '6.5pt' }}>
                  <td style={{ border: '1px solid #000' }}></td>
                  <td style={{ border: '1px solid #000', padding: '2px 6px', background: '#e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700 }}>
                        7th Pay Matrix Pay Band
                      </span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        {emp.payScale || '34,500-1,12,400'}
                      </span>
                      <span style={{ fontWeight: 700 }}>
                        {emp.gradePay || 'GP:4200'}
                      </span>
                    </div>
                  </td>
                  <td colSpan={17} style={{ border: '1px solid #000' }}></td>
                </tr>

                {/* Main Employee Row */}
                <tr style={{ verticalAlign: 'top', minHeight: '44px' }}>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px', fontWeight: 600 }}>
                    {emp.srNo || index + 1}
                  </td>
                  <td style={{ border: '1px solid #000', padding: '4px 6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '7.5pt' }}>
                          {emp.name || 'Shri R.B.Makvana'}
                        </div>
                        <div style={{ fontSize: '6.5pt', fontFamily: 'monospace', marginTop: '2px' }}>
                          {emp.payLevelCell || 'PAY=39900 (LEVEL CELL-7)'}
                        </div>
                        <div style={{ fontSize: '6.5pt', color: '#333', marginTop: '1px' }}>
                          PPA NO: {emp.ppaNo || 'Applied'}
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: 'right',
                          fontFamily: "'Noto Serif Gujarati', serif",
                          fontSize: '8pt',
                          fontWeight: 700,
                          lineHeight: 1.2,
                          paddingLeft: '4px',
                        }}
                      >
                        <div>{emp.designationGujarati ? emp.designationGujarati.split(' ')[0] : 'સંશોધન'}</div>
                        <div>{emp.designationGujarati ? emp.designationGujarati.split(' ').slice(1).join(' ') : 'મદદનીશ'}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px' }}>
                    {emp.payOfOfficer ? formatMoney(emp.payOfOfficer) : ''}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 600 }}>
                    {renderAmount(emp.payOfEstablishment)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.nppa)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount((emp.leaveSalary || 0) + (emp.leaveEncashment || 0))}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.dearnessPay)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 600 }}>
                    {renderAmount(emp.da)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.hra)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 600 }}>
                    {renderAmount((emp.cla || 0) + (emp.otherAllowance || 0))}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 600 }}>
                    {renderAmount((emp.medicalAllowance || 0) + (emp.bonus || 0))}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount((emp.pta || 0) + (emp.profSplService || 0))}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount((emp.washingAllowance || 0) + (emp.officeExpenseOther || 0))}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.ca)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 600 }}>
                    {renderAmount(emp.transportAllowance)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 700 }}>
                    {renderAmount(empGross)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.recovFestivalAdv)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'center', padding: '6px 2px' }}>
                    {renderAmount(emp.recovFoodGrainAdv)}
                  </td>
                  <td style={{ border: '1px solid #000', textAlign: 'right', padding: '6px 2px', fontWeight: 700 }}>
                    {renderAmount(empCol19)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}

          {/* Bottom Total Row */}
          <tr style={{ background: '#ffffff', fontWeight: 700, fontSize: '7pt' }}>
            <td style={{ border: '1px solid #000' }}></td>
            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontWeight: 800 }}>
              Total
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px' }}></td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalPayEstablishment)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalNppa)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalLeaveSalary)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalDearnessPay)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalDa)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalHra)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalCla)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalMedical)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalPta)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalWashing)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalCa)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalTransport)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 800 }}>
              {renderAmount(totalGrossAmount)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalRecovFestival)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center', padding: '4px 2px' }}>
              {renderAmount(totalRecovFoodGrain)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 800 }}>
              {renderAmount(totalCol19)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
