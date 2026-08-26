import React from 'react';
import type { GTR30Employee, GTR30FormData } from '../types';
import { formatMoney } from '../services/gtr30Calc.service';

interface Props { data: GTR30FormData }

const number = (value: number | undefined) => Number(value) || 0;
const money = (value: number) => value ? formatMoney(value) : '-';

const headerColumns = [
  ['Pay of Officers (0101) Substantive Pay', ''],
  ['Pay of Establishment (0102) Substantive/Officiating Pay (0102)', ''],
  ['Special Additional Pay (0101)(0102)', ''],
  ['N.P.P.A. (0128)', ''],
  ['Dearness Allowance (0103)', ''],
  ['Medical Allowance (0107) Bonus (0108)', ''],
  ['Leave Salary (0102) Leave Encashment (0109)', ''],
  ['House Rent Allowance (0110)', ''],
  ['CLA (0111) Other Allowance (0104)', ''],
  ['Transport Allowance (0113)', ''],
  ['Washing Allowance (0132)', ''],
  ['Dearness Pay (0119)', ''],
  ['Dearness Pay (0120)', ''],
  ['Gross Amount', ''],
  ['Recov. of Festival Advance (-)(5701)', ''],
  ['Recov. of Food Grain Advance (-)(5801)', ''],
  ['Total', ''],
] as const;

const codes = ['3', '4', '7', '5', '8', '11', '6', '9', '10', '15', '13', '7', '7', '16', '17', '18', '19'];

const earningValues = (employee: GTR30Employee) => {
  const values = [
    number(employee.payOfOfficer),
    number(employee.payOfEstablishment),
    number(employee.pta) + number(employee.profSplService),
    number(employee.nppa),
    number(employee.da),
    number(employee.medicalAllowance) + number(employee.bonus),
    number(employee.leaveSalary) + number(employee.leaveEncashment),
    number(employee.hra),
    number(employee.cla) + number(employee.otherAllowance),
    number(employee.transportAllowance),
    number(employee.washingAllowance),
    number(employee.dpGaz),
    number(employee.dpNonGaz),
  ];
  const gross = values.reduce((sum, value) => sum + value, 0);
  const festival = number(employee.recovFestivalAdv);
  const foodGrain = number(employee.recovFoodGrainAdv);
  return [...values, gross, festival, foodGrain, gross - festival - foodGrain];
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

export const GTR30Page3Inner1: React.FC<Props> = ({ data }) => {
  const employees = data.employees || [];
  const rows = employees.map(earningValues);
  const totals = rows.reduce<number[]>((sum, row) => sum.map((value, index) => value + row[index]), Array(headerColumns.length).fill(0));

  return (
    <div className="gtr30-page gtr30-landscape gtr30-inner-sheet-page bg-white" id="gtr30-page-3">
      <table className="gtr30-inner-sheet-table gtr30-inner-earnings-table">
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
          {employees.map((employee, index) => {
            const values = rows[index];
            return (
              <React.Fragment key={employee.id || index}>
                <tr className="gtr30-inner-band-row">
                  <td className="gtr30-inner-band-blank" />
                  <td>7th Pay Matrix Pay Band<br /><strong>{employee.payScale || ''}</strong></td>
                  <td><strong>GP:{employee.gradePay || ''}</strong></td>
                  <td colSpan={headerColumns.length} />
                </tr>
                <tr className={index % 2 ? 'gtr30-inner-detail-row gtr30-inner-alt-row' : 'gtr30-inner-detail-row'}>
                  {profileCells(employee, index)}
                  {values.map((value, valueIndex) => (
                    <td key={valueIndex} className={`gtr30-inner-cell gtr30-inner-number-cell ${valueIndex === 13 || valueIndex === 16 ? 'gtr30-inner-emphasis-cell' : ''}`}>
                      {money(value)}
                    </td>
                  ))}
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="gtr30-inner-total-row">
            <td />
            <td colSpan={2}>Total</td>
            {totals.map((value, index) => <td key={index} className={`gtr30-inner-cell gtr30-inner-number-cell ${index === 13 || index === 16 ? 'gtr30-inner-emphasis-cell' : ''}`}>{money(value)}</td>)}
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
