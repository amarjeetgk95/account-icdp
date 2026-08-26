import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatWordsCertificate, splitRsPs } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
  instanceId?: string;
}

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

export const GTR30DeductionsOuterBack: React.FC<Props> = ({
  data,
  instanceId = 'back',
}) => {
  const totals = billTotals(data);
  const employees = data.employees || [];
  const sumField = (fn: (e: (typeof employees)[0]) => number) =>
    employees.reduce((s, e) => s + (fn(e) || 0), 0);

  const incomeTax = sumField((e) => e.incomeTax);
  const surchargeIT = sumField((e) => e.surchargeIT);
  const housingFund = sumField((e) => e.housingFund);
  const postalLifeInsurance = sumField((e) => e.postalLifeInsurance);
  const bsiPremium = sumField((e) => e.bsiPremium);
  const gpfClass4 = 0;
  const gpfWorkCharged = sumField((e) => e.gpfWorkCharged);
  const gpfRojamdar = sumField((e) => e.gpfRojamdar);
  const rentOfBuilding = sumField((e) => e.rentOfBuilding);
  const policeHousing = sumField((e) => e.policeHousing);
  const professionalTax = sumField((e) => e.professionalTax);
  const gis1979Insurance = sumField((e) => e.gis1979Insurance);
  const gis1981Insurance = sumField((e) => e.gis1981Insurance);
  const gis1981Savings = sumField((e) => e.gis1981Savings);
  const aisInsurance = sumField((e) => e.aisInsurance);
  const aisSavings = sumField((e) => e.aisSavings);
  const diviAcctInsurance = sumField((e) => e.diviAcctInsurance);
  const diviAcctSavings = sumField((e) => e.diviAcctSavings);
  const pfDeputation = sumField((e) => e.pfDeputation);
  const govtHousingFund = sumField((e) => e.govtHousingFund);
  const hba = sumField((e) => e.hba);
  const motorCarAdv = sumField((e) => e.motorCarAdv);
  const securityDeposit = sumField((e) => e.securityDeposit);

  const totalDeductionsA =
    incomeTax +
    surchargeIT +
    housingFund +
    postalLifeInsurance +
    bsiPremium +
    gpfClass4 +
    gpfWorkCharged +
    gpfRojamdar +
    rentOfBuilding +
    policeHousing +
    professionalTax +
    gis1979Insurance +
    gis1981Insurance +
    gis1981Savings +
    aisInsurance +
    aisSavings +
    diviAcctInsurance +
    diviAcctSavings +
    pfDeputation +
    govtHousingFund +
    hba +
    motorCarAdv +
    securityDeposit;

  const iasProvidentFund = sumField((e) => e.iasProvidentFund);
  const gpfOtherThanClass4 = sumField((e) => e.gpfOtherThanClass4);
  const gpfDiviAcct = sumField((e) => e.gpfDiviAcct);
  const contributoryPF = sumField((e) => e.contributoryPF);
  const festivalAdv = sumField((e) => e.festivalAdv);
  const foodGrainAdv = sumField((e) => e.foodGrainAdv);
  const fanAdv = sumField((e) => e.fanAdv);
  const otherConveyanceAdv = sumField((e) => e.otherConveyanceAdv);
  const interestOnAdv = sumField((e) => e.interestOnAdv);
  const jeepRent = sumField((e) => e.jeepRent);
  const recovPayLeaveSalary = sumField((e) => e.recovPayLeaveSalary);
  const pfAdjustableByAO = sumField((e) => e.pfAdjustableByAO);
  const miscRecoveries = sumField((e) => e.npsPension + e.miscRecoveries);
  const societyDeduction = sumField((e) => e.societyDeduction);

  const totalDeductionsB =
    iasProvidentFund +
    gpfOtherThanClass4 +
    gpfDiviAcct +
    contributoryPF +
    festivalAdv +
    foodGrainAdv +
    fanAdv +
    otherConveyanceAdv +
    interestOnAdv +
    jeepRent +
    recovPayLeaveSalary +
    pfAdjustableByAO +
    miscRecoveries;

  const totalAllDeductions = totalDeductionsA + totalDeductionsB;
  const netAmount = totals.gross - totalAllDeductions;

  const formatCell = (val: number) => {
    if (!val || val === 0) return { rs: '0', ps: '00' };
    const p = splitRsPs(val);
    return { rs: p.rs, ps: p.ps };
  };

  const netAfterSociety = netAmount - societyDeduction;

  const totalACell = splitRsPs(totalDeductionsA);
  const totalDedCell = splitRsPs(totalAllDeductions);
  const netCell = splitRsPs(netAmount);
  const societyCell = splitRsPs(societyDeduction);
  const netAfterSocietyCell = splitRsPs(netAfterSociety);

  const deductionsARows = [
    { name: 'Income Tax', code: '9510-', val: incomeTax },
    { name: 'Surcharge on Income Tax', code: '9520-', val: surchargeIT },
    { name: 'Postal Life Insurance', code: '9530-', val: postalLifeInsurance },
    { name: 'General Provident Fund Class IV', code: '9531-', val: gpfClass4 },
    { name: 'General provident Fund Workcharged', code: '9532-', val: gpfWorkCharged },
    { name: 'General provident Fund Rojamdar', code: '9533-', val: gpfRojamdar },
    { name: 'B.S.I. Premium', code: '9540-', val: bsiPremium },
    { name: '0059 Rent of Building 0216-9-106 Gen Pool Accom', code: '9550-', val: rentOfBuilding },
    { name: '0216-01-107 Police Housing 0216-01-700 Other Housing', code: '9560-', val: policeHousing },
    { name: 'Professional Tax', code: '9570-', val: professionalTax },
    { name: 'State Govt Employees Group Insurance Scheme 1979', code: '9580-', val: gis1979Insurance },
    { name: 'State Govt Emp GIS 1981 Scheme Insurance Fund', code: '9581-', val: gis1981Insurance },
    { name: 'State Govt Emp GIS 1981, Scheme Savings Fund.', code: '9582-', val: gis1981Savings },
    { name: 'AIS Insurance Scheme 1980 Insurance Fund.', code: '9583-', val: aisInsurance },
    { name: 'AIS Insurance Scheme - 1980 Saving Fund.', code: '9584-', val: aisSavings },
    { name: 'Divisional Accountant Insu. Scheme 1980 I. F.', code: '9585-', val: diviAcctInsurance },
    { name: 'Divisional Accountant Insu. Scheme 1980 S. F.', code: '9586-', val: diviAcctSavings },
    { name: 'P. F. on deputation adjustable by P. A. O./Other', code: '9587-', val: pfDeputation },
    { name: 'Housing Fund', code: '9590-', val: housingFund },
    { name: 'Government Housing Fund', code: '9590-', val: govtHousingFund },
    { name: 'House Building Advance Principal/Interest.', code: '9591-', val: hba },
    { name: 'Adv for Motor Car/Scooter/Moped Princ/Int.', code: '9592-', val: motorCarAdv },
    { name: 'Security Deposit', code: '9600-', val: securityDeposit },
  ];

  const deductionsBRows = [
    { name: 'Festival Advance', code: '5701-', val: festivalAdv },
    { name: 'Food Grain Advance', code: '5801-', val: foodGrainAdv },
    { name: 'I. A. S. Provident Fund', code: '9620-', val: iasProvidentFund },
    { name: 'General Provident Fund Other than Class IV', code: '9670-', val: gpfOtherThanClass4 },
    { name: 'General PF of Divisional Accountants (State)', code: '9680-', val: gpfDiviAcct },
    { name: 'Contributory Provident Fund', code: '9690-', val: contributoryPF },
    { name: 'Advances for Purchase of Fan', code: '9720-', val: fanAdv },
    { name: 'Advance for Purchase of Conveyance (Cycle)', code: '9740-', val: otherConveyanceAdv },
    { name: 'Interest on Advance', code: '9760-', val: interestOnAdv },
    { name: 'Recov. of Pay / Leave Salary', code: '9770-', val: recovPayLeaveSalary },
    { name: 'Jeep Rent', code: '9780-', val: jeepRent },
    { name: 'PF adjustable by A. O. other than A. G. / D. A. T.', code: '9790-', val: pfAdjustableByAO },
    { name: 'Miscellaneous Recoveries', code: '9910-', val: miscRecoveries },
  ];

  return (
    <div
      id={`${instanceId}-container`}
      className="gtr30-deductions-outer-back"
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
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: '2.5mm',
          height: '100%',
          boxSizing: 'border-box',
          alignItems: 'stretch',
        }}
      >
        {/* LEFT SUB-COLUMN: DEDUCTION 'A' */}
        <div
          id={`${instanceId}-deduction-a-column`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <table
              id={`${instanceId}-deduction-a-table`}
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
                <col style={{ width: '51%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '5%' }} />
                <col style={{ width: '17%' }} />
                <col style={{ width: '7%' }} />
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
                      padding: '0.4mm 0.8mm',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    Deduction &apos;A&apos;
                  </th>
                  {/* 1 ROW WITH 5 SEPARATE COLUMNS */}
                  <th
                    rowSpan={2}
                    colSpan={5}
                    style={{
                      borderRight: '0.8px solid #000',
                      borderBottom: '0.8px solid #000',
                      padding: '0.4mm 0.2mm',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Code
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
                  <th style={{ borderRight: '0.5px solid #000', padding: '0.2mm 0' }}>Rs.</th>
                  <th style={{ padding: '0.2mm 0' }}>P.</th>
                </tr>
              </thead>
              <tbody>
                {deductionsARows.map((row, idx) => {
                  const cell = formatCell(row.val);
                  const edpCells = splitEdp5(row.code);
                  return (
                    <tr
                      key={idx}
                      id={`${instanceId}-ded-a-row-${idx}`}
                      style={{
                        height: '2.85mm',
                        borderBottom: '0.4px solid #000',
                      }}
                    >
                      <td
                        style={{
                          borderRight: '0.8px solid #000',
                          padding: '0 0.8mm',
                          fontSize: '6.0pt',
                          lineHeight: 1.0,
                          whiteSpace: 'pre-line',
                          verticalAlign: 'middle',
                          textAlign: 'left',
                        }}
                        title={row.name}
                      >
                        {row.name}
                      </td>
                      <td
                        id={`${instanceId}-ded-a-${idx}-0`}
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
                        id={`${instanceId}-ded-a-${idx}-1`}
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
                        id={`${instanceId}-ded-a-${idx}-2`}
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
                        id={`${instanceId}-ded-a-${idx}-3`}
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
                        id={`${instanceId}-ded-a-${idx}-4`}
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
                {/* Blank filler rows */}
                {[0, 1, 2].map((r) => (
                  <tr key={`blank-a-${r}`} style={{ height: '2.85mm', borderBottom: '0.4px solid #000' }}>
                    <td style={{ borderRight: '0.8px solid #000' }}></td>
                    <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                    <td style={{ borderRight: '0.5px solid #000' }}></td>
                    <td></td>
                  </tr>
                ))}
                {/* Total A Row */}
                <tr
                  id={`${instanceId}-total-a-row`}
                  style={{
                    borderTop: '0.8px solid #000',
                    fontWeight: 800,
                    height: '3.0mm',
                    fontSize: '6.2pt',
                  }}
                >
                  <td style={{ borderRight: '0.8px solid #000', padding: '0 1mm' }}>Total A</td>
                  <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                  <td style={{ borderRight: '0.5px solid #000', padding: '0 1mm', textAlign: 'right' }}>
                    {totalACell.rs}
                  </td>
                  <td style={{ padding: '0 0.3mm', textAlign: 'center' }}>{totalACell.ps}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Bottom Left Box: For use in Treasury */}
          <div
            id={`${instanceId}-treasury-payment-box`}
            style={{
              borderTop: '0.8px solid #000',
              paddingTop: '0.8mm',
              marginTop: '0.8mm',
              fontSize: '5.8pt',
              lineHeight: '1.15',
            }}
          >
            <div
              style={{
                textAlign: 'center',
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: '6.2pt',
                marginBottom: '0.3mm',
              }}
            >
              For use in Treasury
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>
                Pay Rs. ({' '}
                <span
                  style={{
                    borderBottom: '0.8px solid #000',
                    display: 'inline-block',
                    width: '25px',
                  }}
                >
                  &nbsp;
                </span>{' '}
                )
              </span>
              <span>
                Rs.{' '}
                <span
                  style={{
                    borderBottom: '0.8px solid #000',
                    display: 'inline-block',
                    width: '25px',
                  }}
                >
                  &nbsp;
                </span>
              </span>
            </div>
            <div style={{ textAlign: 'right', fontStyle: 'italic', paddingRight: '3mm' }}>In cash</div>
            <div style={{ marginTop: '0.2mm' }}>
              Rs. ({' '}
              <span
                style={{
                  borderBottom: '0.8px solid #000',
                  display: 'inline-block',
                  width: '32px',
                }}
              >
                &nbsp;
              </span>{' '}
              ) by T. C. as at &quot;A&quot;
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2mm' }}>
              <span>
                Total :{' '}
                <span
                  style={{
                    borderBottom: '0.8px solid #000',
                    display: 'inline-block',
                    width: '25px',
                  }}
                >
                  &nbsp;
                </span>
              </span>
              <span>
                Date :{' '}
                <span
                  style={{
                    borderBottom: '0.8px solid #000',
                    display: 'inline-block',
                    width: '25px',
                  }}
                >
                  &nbsp;
                </span>
              </span>
            </div>
            <div
              style={{
                textAlign: 'center',
                marginTop: '0.8mm',
                fontSize: '5.4pt',
                fontWeight: 600,
                borderTop: '0.8px solid #000',
                paddingTop: '0.6mm',
              }}
            >
                Accountant/Treasury Officer / Sub-Treasury Officer/Pay and Accounts Officer.
            </div>
          </div>
        </div>

        {/* RIGHT SUB-COLUMN: DEDUCTION 'B', TOTALS, AND SIGNATURES */}
        <div
          id={`${instanceId}-deduction-b-column`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <table
              id={`${instanceId}-deduction-b-table`}
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
                <col style={{ width: '51%' }} />
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '5.5%' }} />
                <col style={{ width: '11.5%' }} />
                <col style={{ width: '10%' }} />
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
                      padding: '0.4mm 0.8mm',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    Deduction &apos;B&apos;
                  </th>
                  {/* 1 ROW WITH 5 SEPARATE COLUMNS */}
                  <th
                    rowSpan={2}
                    colSpan={5}
                    style={{
                      borderRight: '0.8px solid #000',
                      borderBottom: '0.8px solid #000',
                      padding: '0.4mm 0.2mm',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    Code
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
                  <th style={{ borderRight: '0.5px solid #000', padding: '0.2mm 0' }}>Rs.</th>
                  <th style={{ padding: '0.2mm 0' }}>P.</th>
                </tr>
              </thead>
              <tbody>
                {deductionsBRows.map((row, idx) => {
                  const cell = formatCell(row.val);
                  const edpCells = splitEdp5(row.code);
                  return (
                    <tr
                      key={idx}
                      id={`${instanceId}-ded-b-row-${idx}`}
                      style={{
                        height: '2.85mm',
                        borderBottom: '0.4px solid #000',
                      }}
                    >
                      <td
                        style={{
                          borderRight: '0.8px solid #000',
                          padding: '0 0.8mm',
                          fontSize: '6.0pt',
                          lineHeight: 1.0,
                          whiteSpace: 'pre-line',
                          verticalAlign: 'middle',
                          textAlign: 'left',
                        }}
                        title={row.name}
                      >
                        {row.name}
                      </td>
                      <td
                        id={`${instanceId}-ded-b-${idx}-0`}
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
                        id={`${instanceId}-ded-b-${idx}-1`}
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
                        id={`${instanceId}-ded-b-${idx}-2`}
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
                        id={`${instanceId}-ded-b-${idx}-3`}
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
                        id={`${instanceId}-ded-b-${idx}-4`}
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
                {/* Blank filler rows */}
                {[0, 1, 2, 3, 4, 5].map((r) => (
                  <tr key={`blank-b-${r}`} style={{ height: '2.85mm', borderBottom: '0.4px solid #000' }}>
                    <td style={{ borderRight: '0.8px solid #000' }}></td>
                    <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                    <td style={{ borderRight: '0.5px solid #000' }}></td>
                    <td></td>
                  </tr>
                ))}
                {/* Total Deductions Row */}
                <tr
                  id={`${instanceId}-total-deductions-row`}
                  style={{
                    borderTop: '0.8px solid #000',
                    fontWeight: 700,
                    height: '3.0mm',
                    fontSize: '6.2pt',
                  }}
                >
                  <td style={{ borderRight: '0.8px solid #000', padding: '0 0.8mm' }}>Total Deductions :</td>
                  <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                  <td style={{ borderRight: '0.5px solid #000', padding: '0 0.8mm', textAlign: 'right' }}>
                    {totalDedCell.rs}
                  </td>
                  <td style={{ padding: '0 0.2mm', textAlign: 'center' }}>{totalDedCell.ps}</td>
                </tr>
                {/* Net Total Row */}
                <tr
                  id={`${instanceId}-net-total-row`}
                  style={{
                    borderTop: '0.8px solid #000',
                    fontWeight: 800,
                    height: '3.0mm',
                    fontSize: '6.2pt',
                  }}
                >
                  <td style={{ borderRight: '0.8px solid #000', padding: '0 0.8mm' }}>Net Total :</td>
                  <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                  <td style={{ borderRight: '0.5px solid #000', padding: '0 0.8mm', textAlign: 'right' }}>
                    {netCell.rs}
                  </td>
                  <td style={{ padding: '0 0.2mm', textAlign: 'center' }}>{netCell.ps}</td>
                </tr>
                {/* Society Deduction Row */}
                <tr
                  id={`${instanceId}-society-row`}
                  style={{
                    borderTop: '0.4px solid #000',
                    fontWeight: 400,
                    height: '2.85mm',
                    fontSize: '6.0pt',
                  }}
                >
                  <td style={{ borderRight: '0.8px solid #000', padding: '0 0.8mm' }}>Society Deduction :</td>
                  <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                  <td style={{ borderRight: '0.5px solid #000', padding: '0 0.8mm', textAlign: 'right' }}>
                    {societyCell.rs}
                  </td>
                  <td style={{ padding: '0 0.2mm', textAlign: 'center' }}>{societyCell.ps}</td>
                </tr>
                {/* Net After Society Row */}
                <tr
                  id={`${instanceId}-net-after-society-row`}
                  style={{
                    borderTop: '0.8px solid #000',
                    fontWeight: 800,
                    height: '3.0mm',
                    fontSize: '6.2pt',
                  }}
                >
                  <td style={{ borderRight: '0.8px solid #000', padding: '0 0.8mm' }}>Net After Society :</td>
                  <td colSpan={5} style={{ borderRight: '0.8px solid #000' }}></td>
                  <td style={{ borderRight: '0.5px solid #000', padding: '0 0.8mm', textAlign: 'right' }}>
                    {netAfterSocietyCell.rs}
                  </td>
                  <td style={{ padding: '0 0.2mm', textAlign: 'center' }}>{netAfterSocietyCell.ps}</td>
                </tr>
              </tbody>
            </table>

            {/* i.e. Rs. in words */}
            <div
              id={`${instanceId}-amount-in-words`}
              style={{
                marginTop: '0.8mm',
                fontSize: '6.0pt',
                lineHeight: 1.15,
              }}
            >
              i. e. Rs.{' '}
              <strong
                id={`${instanceId}-words-value`}
                style={{
                  borderBottom: '0.8px solid #000',
                  padding: '0 2px',
                  display: 'inline-block',
                }}
              >
                {formatWordsCertificate(netAmount)}
              </strong>
            </div>

            {/* Signature Drawing Officer */}
            <div
              id={`${instanceId}-drawing-officer-signature`}
              style={{
                textAlign: 'center',
                marginTop: '1.0mm',
                paddingTop: '6.5mm',
                fontSize: '5.8pt',
                lineHeight: 1.2,
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

          {/* Space for Specimen Signature Verification endorsement */}
          <div
            id={`${instanceId}-specimen-signature-box`}
            style={{
              borderTop: '0.8px solid #000',
              paddingTop: '0.8mm',
              marginTop: '0.8mm',
              fontSize: '5.6pt',
              lineHeight: '1.15',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                textAlign: 'center',
                marginBottom: '0.3mm',
                fontSize: '5.8pt',
              }}
            >
              Space for Specimen Signature Verification endorsement
              <br />
              By T. O./P. A. O.
            </div>
            <div style={{ marginTop: '0.2mm' }}>D. A./H. A./A. T. O. in charge of Cardex</div>
            <div style={{ marginTop: '0.2mm' }}>
              Paid on Dt.{' '}
              <span
                style={{
                  borderBottom: '0.8px solid #000',
                  display: 'inline-block',
                  width: '28px',
                }}
              >
                &nbsp;
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2mm' }}>
              <span>
                Advice No.{' '}
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
                Dt.{' '}
                <span
                  style={{
                    borderBottom: '0.8px solid #000',
                    display: 'inline-block',
                    width: '24px',
                  }}
                >
                  &nbsp;
                </span>
              </span>
            </div>
            <div style={{ marginTop: '0.2mm' }}>
              Cheque No.{' '}
              <span
                style={{
                  borderBottom: '0.8px solid #000',
                  display: 'inline-block',
                  width: '28px',
                }}
              >
                &nbsp;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
