import React from 'react';
import type { GTR30Employee, GTR30FormData } from '../types';
import { formatMoney } from '../services/gtr30Calc.service';

interface Props { data: GTR30FormData }

const number = (value: number | undefined) => Number(value) || 0;
const money = (value: number) => value ? formatMoney(value) : '-';

const headerColumns = [
  ['Income Tax (9510)/ Surcharge on I.T.(9520)/ Housing Fund(9590)', ''],
  ['Rent of Building (9550) (9560)', ''],
  ['Postal Life Insurance Premium(9530) B.S.I. Premium(9540)', ''],
  ['Professional Tax (9570)', ''],
  ['State Govt. Employee Insurance Scheme-1981 Insurance Fund (9581)', ''],
  ['State Govt. Employee Insurance Scheme-1981 Saving Fund (9580)', ''],
  ['Provident Fund Contribution Regular (9670)', ''],
  ['Motor Car Adv. Pri./Int.(9592), Other Convey. Adv.(9740), Int. on Adv.(9760)', ''],
  ['H.B.A. Pri./ Interest on Advance (9591)', ''],
  ['Recov. of Pay/ Leave Salary (9770)/ Jeep Car Rent (9780)/ Miscell. Recov.(9910)', ''],
  ['New Define Contributory pension sch.type govt.Servants (9534)', ''],
  ['General Provident Fund Class IV (9531)', ''],
  ['Total Deductions', '36'],
  ['Net Payable Amount', '37'],
  ['Society Deduction', '-'],
  ['Net Payable Amount after Society Deduction', '-'],
] as const;

const codes = ['21', '22', '23', '24', '26', '27', '28', '31', '32', '34', '35', '35', '36', '37', '-', '-'];

const deductionValues = (employee: GTR30Employee) => {
  const values = [
    number(employee.incomeTax) + number(employee.surchargeIT) + number(employee.housingFund),
    number(employee.rentOfBuilding),
    number(employee.postalLifeInsurance) + number(employee.bsiPremium),
    number(employee.professionalTax),
    number(employee.gis1979Insurance) + number(employee.gis1981Insurance) + number(employee.aisInsurance) + number(employee.diviAcctInsurance),
    number(employee.gis1981Savings) + number(employee.aisSavings) + number(employee.diviAcctSavings),
    number(employee.iasProvidentFund) + number(employee.gpfOtherThanClass4) + number(employee.gpfDiviAcct) + number(employee.gpfWorkCharged) + number(employee.gpfRojamdar) + number(employee.pfDeputation),
    number(employee.motorCarAdv) + number(employee.otherConveyanceAdv) + number(employee.interestOnAdv) + number(employee.fanAdv) + number(employee.securityDeposit),
    number(employee.hba),
    number(employee.recovPayLeaveSalary) + number(employee.leaveSalaryAdv) + number(employee.jeepRent) + number(employee.miscRecoveries) + number(employee.pfAdjustableByAO),
    number(employee.npsPension),
    number(employee.contributoryPF),
  ];
  const total = values.reduce((sum, value) => sum + value, 0);
  const gross = [
    number(employee.payOfOfficer), number(employee.payOfEstablishment), number(employee.pta) + number(employee.profSplService),
    number(employee.nppa), number(employee.da), number(employee.medicalAllowance) + number(employee.bonus),
    number(employee.leaveSalary) + number(employee.leaveEncashment), number(employee.hra), number(employee.cla) + number(employee.otherAllowance),
    number(employee.transportAllowance), number(employee.washingAllowance), number(employee.dpGaz), number(employee.dpNonGaz),
  ].reduce((sum, value) => sum + value, 0);
  const net = gross - total;
  const society = number(employee.societyDeduction);
  return [...values, total, net, society, net - society];
};

const profileCells = (employee: GTR30Employee, index: number) => (
  <>
    <td className="gtr30-inner-cell gtr30-inner-sr-cell">{index + 1}</td>
    <td className="gtr30-inner-profile-cell">
      <strong>{employee.name || ''}</strong>
      <span>HRPN No. : {employee.hrpnNo || ''}</span>
      <span>PPAN/GPF No. : {employee.ppaNo || ''}</span>
    </td>
    <td className="gtr30-inner-designation-cell"><strong>{employee.designation || ''}</strong></td>
  </>
);

export const GTR30Page4Inner2: React.FC<Props> = ({ data }) => {
  const employees = data.employees || [];
  const rows = employees.map(deductionValues);
  const totals = rows.reduce<number[]>((sum, row) => sum.map((value, index) => value + row[index]), Array(headerColumns.length).fill(0));

  return (
    <div className="gtr30-page gtr30-landscape gtr30-inner-sheet-page bg-white" id="gtr30-page-4">
      <table className="gtr30-inner-sheet-table gtr30-inner-deductions-table">
        <colgroup>
          <col className="gtr30-inner-col-sr" />
          <col className="gtr30-inner-col-profile" />
          <col className="gtr30-inner-col-designation" />
          {headerColumns.map(([title, code]) => <col key={title + code} />)}
        </colgroup>
        <thead>
          <tr className="gtr30-inner-header-row">
            <th className="gtr30-inner-header-blank" />
            <th colSpan={2} className="gtr30-inner-resolution-cell">{data.schemeResolutionText || ''}</th>
            {headerColumns.map(([title, code]) => (
              <th key={title + code}><span className="gtr30-inner-vertical-label">{title}{code && <><br />{code}</>}</span></th>
            ))}
          </tr>
          <tr className="gtr30-inner-code-row">
            <th>1</th>
            <th colSpan={2}>Section of Establishment and name of Incumbent</th>
            {codes.map((code, index) => <th key={index}>{code}</th>)}
          </tr>
        </thead>
        <tbody>
          {employees.map((employee, index) => (
            <React.Fragment key={employee.id || index}>
              <tr className="gtr30-inner-band-row">
                <td className="gtr30-inner-band-blank" />
                <td>7th Pay Matrix Pay Band<br /><strong>{employee.payScale || ''}</strong></td>
                <td><strong>GP:{employee.gradePay || ''}</strong></td>
                <td colSpan={headerColumns.length} />
              </tr>
              <tr className={index % 2 ? 'gtr30-inner-detail-row gtr30-inner-alt-row' : 'gtr30-inner-detail-row'}>
                {profileCells(employee, index)}
                {rows[index].map((value, valueIndex) => (
                  <td key={valueIndex} className={`gtr30-inner-cell gtr30-inner-number-cell ${valueIndex >= 12 ? 'gtr30-inner-emphasis-cell' : ''}`}>{money(value)}</td>
                ))}
              </tr>
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="gtr30-inner-total-row">
            <td />
            <td colSpan={2}>Total</td>
            {totals.map((value, index) => <td key={index} className={`gtr30-inner-cell gtr30-inner-number-cell ${index >= 12 ? 'gtr30-inner-emphasis-cell' : ''}`}>{money(value)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
