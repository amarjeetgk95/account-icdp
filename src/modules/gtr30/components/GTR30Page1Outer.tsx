import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatMoney, formatWordsCertificate, splitRsPs } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

const renderBoxes = (value: string | number | undefined | null, count: number) => {
  const str = value !== undefined && value !== null ? String(value) : '';
  const padded = str.replace(/[^a-zA-Z0-9+]/g, '').padEnd(count, ' ').slice(0, count);
  const chars = padded.split('');

  return (
    <div className="inline-flex border-l border-t border-b border-black align-middle">
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            width: 13,
            height: 16,
            fontSize: '8.5pt',
            fontFamily: "'Courier New', monospace",
            fontWeight: 700,
            borderRight: '1px solid #000',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            lineHeight: 1,
          }}
        >
          {ch !== ' ' ? ch : ''}
        </span>
      ))}
    </div>
  );
};

export const GTR30Page1Outer: React.FC<Props> = ({ data }) => {
  const totals = billTotals(data);
  const employees = data.employees || [];

  // Sum all earning components across employees
  const sumField = (fn: (e: (typeof employees)[0]) => number) =>
    employees.reduce((s, e) => s + (fn(e) || 0), 0);

  const payOfOfficer = sumField((e) => e.payOfOfficer);
  const payOfEstablishment = sumField((e) => e.payOfEstablishment);
  const nppa = sumField((e) => e.nppa);
  const da = sumField((e) => e.da);
  const hra = sumField((e) => e.hra);
  const cla = sumField((e) => e.cla);
  const leaveEncashment = sumField((e) => e.leaveEncashment);
  const otherAllowance = sumField((e) => e.otherAllowance);
  const transportAllowance = sumField((e) => e.transportAllowance);
  const medicalAllowance = sumField((e) => e.medicalAllowance);
  const bonus = sumField((e) => e.bonus);
  const pta = sumField((e) => e.pta);
  const washingAllowance = sumField((e) => e.washingAllowance);
  const otherCharges = sumField((e) => e.officeExpenseOther);
  const ropArrearsGaz = sumField((e) => e.ropArrearsGaz);
  const ropArrearsNonGaz = sumField((e) => e.ropArrearsNonGaz);
  const dpGaz = sumField((e) => e.dpGaz);
  const dpNonGaz = sumField((e) => e.dpNonGaz);

  const recovFestivalAdv = sumField((e) => e.recovFestivalAdv);
  const recovFoodGrainAdv = sumField((e) => e.recovFoodGrainAdv);
  const recovPay = sumField((e) => e.recovPay);
  const leaveSalaryAdv = sumField((e) => e.leaveSalaryAdv);
  const totalAdvancesRecov = recovFestivalAdv + recovFoodGrainAdv + recovPay + leaveSalaryAdv;

  // Deductions A
  const incomeTax = sumField((e) => e.incomeTax);
  const surchargeIT = sumField((e) => e.surchargeIT);
  const postalLifeInsurance = sumField((e) => e.postalLifeInsurance);
  const npsPension = sumField((e) => e.npsPension);
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
    postalLifeInsurance +
    npsPension +
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

  // Deductions B
  const iasPF = sumField((e) => e.iasProvidentFund);
  const gpfOther = sumField((e) => e.gpfOtherThanClass4);
  const gpfDivi = sumField((e) => e.gpfDiviAcct);
  const cpFund = sumField((e) => e.contributoryPF);
  const fanAdv = sumField((e) => e.fanAdv);
  const otherConvAdv = sumField((e) => e.otherConveyanceAdv);
  const intAdv = sumField((e) => e.interestOnAdv);
  const jeepRent = sumField((e) => e.jeepRent);
  const pfAO = sumField((e) => e.pfAdjustableByAO);
  const miscRecov = sumField((e) => e.miscRecoveries);

  const totalDeductionsB =
    iasPF + gpfOther + gpfDivi + cpFund + fanAdv + otherConvAdv + intAdv + jeepRent + pfAO + miscRecov;

  const totalDeductionsAll = totalDeductionsA + totalDeductionsB;
  const netTotal = totals.gross - totalDeductionsAll;

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-1">
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5pt', lineHeight: 1.15, marginBottom: '2px' }}>
        <div>G.P. RJT., Sr. 1 Std-93 3-2007 10,00,000 A4* WP-BI</div>
        <div style={{ textAlign: 'center', fontWeight: 600 }}>Outer General 1.e.&amp;g. (Revised) (Outer)</div>
        <div style={{ fontWeight: 600 }}>FORM G.T.R. 30</div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
        <div style={{ fontSize: '7.5pt', fontFamily: "'Noto Serif Gujarati', serif" }}>
          નાણાં વિભાગના પત્ર ક્રમાંક:તજર-૧૦૦૪-૧૨૨૬-ઝ-૪૭[૦૬] તા:૨-૧-૨૦૦૬
          <div style={{ fontWeight: 700, fontSize: '9pt', marginTop: '1px' }}>બિલ દિવસ</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '11pt', fontWeight: 800, textDecoration: 'underline', letterSpacing: '0.5px' }}>
            FORM G.T.R. 30
          </div>
          <div style={{ fontSize: '8pt', fontStyle: 'italic' }}>(See Rule 176(1))</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '9pt', fontWeight: 700, fontFamily: "'Noto Serif Gujarati', serif" }}>
            બિન રાજ્યપત્રિત
          </div>
          <div style={{ fontSize: '8pt', marginTop: '1px' }}>
            Bill Register No. : <span style={{ fontWeight: 700, borderBottom: '1px dotted #000', padding: '0 8px' }}>{data.billRegisterNo || '___________________'}</span>
          </div>
        </div>
      </div>

      {/* Sub Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '55% 45%', fontSize: '8pt', margin: '2px 0 3px 0', borderTop: '1px solid #000', paddingTop: '2px' }}>
        <div>
          Pay Bill for the Establishment <strong style={{ fontFamily: "'Noto Serif Gujarati', serif", borderBottom: '1px dotted #000', padding: '0 4px' }}>{data.branchName || 'એક શાખા'}</strong> Name of Office : <strong style={{ borderBottom: '1px dotted #000', padding: '0 4px' }}>{data.officeName || 'Dy. Dir. of A.H., I.C.D.P., Surat'}</strong>
          <div style={{ marginTop: '2px' }}>
            For the Month of: <strong style={{ borderBottom: '1px dotted #000', padding: '0 4px' }}>{data.monthOf || 'December-2024'}</strong>
          </div>
        </div>
        <div style={{ borderLeft: '1px solid #000', paddingLeft: '6px' }}>
          <div style={{ fontWeight: 700, fontStyle: 'italic', fontSize: '7.5pt' }}>For use in Treasury</div>
          <div style={{ fontSize: '7.5pt' }}>
            Name of Treasury :- <strong>{data.treasuryName || 'District Treasury, SURAT.'}</strong>
          </div>
          <div style={{ fontSize: '6.5pt', lineHeight: 1.25, marginTop: '1px' }}>
            <div>Bill Transit Reg. Sr. No. : ………. Date : ……… Token No. : ………. Date : ………</div>
            <div>Bill Transit Reg. Sr. No. : ………. Date : ……… Token No. : ………. Date : ………</div>
            <div>Bill Transit Reg. Sr. No. : ………. Date : ……… Token No. : ………. Date : ………</div>
          </div>
        </div>
      </div>

      {/* Main 3-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '27% 39% 34%', border: '1px solid #000', fontSize: '7.5pt', minHeight: '525px' }}>
        {/* Left Column: Classification, Allotment, AG Office */}
        <div style={{ borderRight: '1px solid #000', padding: '3px 4px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', marginBottom: '4px' }}>
              <div style={{ fontWeight: 700, fontSize: '8pt', textTransform: 'uppercase' }}>COMPUTER INPUT DATA</div>
              <div style={{ fontSize: '7pt', fontStyle: 'italic' }}>(To be filled in by Treasury)</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px', fontSize: '7.5pt' }}>
                <span>1. District {renderBoxes(data.district || '66', 2)}</span>
                <span>2. Month &amp; Year</span>
              </div>
              <div style={{ textAlign: 'left', marginTop: '2px', fontSize: '7.5pt' }}>
                3. Voucher No.
              </div>
            </div>

            <div style={{ lineHeight: 1.35 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>4. Controlling Officer</span>
                {renderBoxes(data.controllingOfficer || '', 2)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>5. Class of Expenditure</span>
                {renderBoxes(data.classOfExpenditure || '1', 1)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>6. Fund</span>
                {renderBoxes(data.fund || '3', 1)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>7. Drawing Officer</span>
                {renderBoxes(data.drawingOfficer || '299', 3)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>8. Demand No.</span>
                {renderBoxes(data.demandNo || '004', 3)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>9. Type of Budget</span>
                {renderBoxes(data.typeOfBudget || '1', 1)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>10. Scheme No.</span>
                {renderBoxes(data.schemeNo || '0000000', 7)}
              </div>
              <div style={{ marginTop: '2px' }}>
                <div>11. Head Chargeable</div>
                <div style={{ textAlign: 'center', margin: '1px 0' }}>
                  {renderBoxes(data.headChargeable || '2403001139900', 13)}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '7pt', lineHeight: 1.25, marginTop: '2px' }}>
              <div><strong>{data.sector || 'Sector-C-Economic Service'}</strong></div>
              <div><strong>{data.demandNoLabel || 'Demand No. 004'}</strong></div>
              <div><strong>{data.majorHead || 'Major Head-2403 Animal Husbandry'}</strong></div>
              <div><strong>{data.minorHead || 'Minor Head-113 Administative Investigation and Statistcs'}</strong></div>
              <div style={{ fontStyle: 'italic' }}><strong>{data.subHead || 'Sub Head-99 Scheme for Strengthening of Statistical Wing...'}</strong></div>
            </div>

            <div style={{ borderTop: '1px solid #000', paddingTop: '3px', marginTop: '3px', fontSize: '7.5pt' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Budget Allotment for {data.budgetYear || '2024-25'}</span>
                <span>Rs. {data.budgetAllotment ? formatMoney(data.budgetAllotment) : '................'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
                <span>Expenditure including this bill</span>
                <span style={{ fontWeight: 700 }}>{formatMoney(totals.gross)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}>
                <span>Balance Available</span>
                <span>Rs. ................</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '7pt' }}>
            <div style={{ fontWeight: 700, fontStyle: 'italic', textAlign: 'center' }}>For use in A.G. Office</div>
            <div>Admitted for Rs. .....................................................</div>
            <div>Objected for Rs. .....................................................</div>
            <div>Reasons for Objection .............................................</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontWeight: 600 }}>
              <span>Auditor</span>
              <span>Section Officer</span>
              <span>Gazetted Officer</span>
            </div>
          </div>
        </div>

        {/* Middle Column: Object of Expenditure Table & Cheques */}
        <div style={{ borderRight: '1px solid #000', padding: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7pt' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '1px 2px', borderRight: '1px solid #000' }}>Budget Code</th>
                  <th style={{ textAlign: 'left', padding: '1px 2px', borderRight: '1px solid #000' }}>Object of Expenditure</th>
                  <th style={{ textAlign: 'center', padding: '1px 2px', borderRight: '1px solid #000' }}>EDP Code</th>
                  <th style={{ textAlign: 'right', padding: '1px 2px' }} colSpan={2}>Amount<br />Rs. Ps.</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ fontWeight: 700, background: '#fafafa' }}>
                  <td style={{ padding: '1px 2px', borderRight: '1px solid #000' }}>0100</td>
                  <td style={{ padding: '1px 2px', borderRight: '1px solid #000' }} colSpan={4}>Salaries :</td>
                </tr>
                {[
                  { bcode: '0101', label: 'Pay of Officer', edp: '0 1 0 1 +', val: payOfOfficer },
                  { bcode: '0102', label: 'Pay of Establishment', edp: '0 1 0 2 +', val: payOfEstablishment },
                  { bcode: '0128', label: 'N.P.P.A.', edp: '0 1 2 8 +', val: nppa },
                  { bcode: '0103', label: 'Dearness Allowance', edp: '0 1 1 3 +', val: da },
                  { bcode: '0110', label: 'House Rent Allowance', edp: '0 1 1 0 +', val: hra },
                  { bcode: '0111', label: 'C.L.A.', edp: '0 1 1 1 +', val: cla },
                  { bcode: '0109', label: 'Leave Encashment', edp: '0 1 0 9 +', val: leaveEncashment },
                  { bcode: '0112', label: 'Interim Relief', edp: '0 1 1 2 +', val: 0 },
                  { bcode: '0113', label: 'Transport Allowance', edp: '0 1 1 3 +', val: transportAllowance },
                  { bcode: '0104', label: 'Other Allowance', edp: '0 1 0 4 +', val: otherAllowance },
                  { bcode: '0107', label: 'Medical Allowance', edp: '0 1 0 7 +', val: medicalAllowance },
                  { bcode: '0108', label: 'Bonus', edp: '0 1 0 8 +', val: bonus },
                  { bcode: '1100', label: 'Travel Expenses (PTA)', edp: '1 1 0 1 +', val: pta },
                  { bcode: '1300', label: 'Office Expen./Wash. All.', edp: '1 3 0 1 +', val: washingAllowance },
                  { bcode: '5000', label: 'Other Charges', edp: '5 0 0 6 +', val: otherCharges },
                  { bcode: '0117', label: 'ROP Arrears (Gazetted)', edp: '0 1 1 7 +', val: ropArrearsGaz },
                  { bcode: '0118', label: 'ROP Arrears (Non Gaz.)', edp: '0 1 1 8 +', val: ropArrearsNonGaz },
                  { bcode: '0119', label: 'D. P. (Gazetted)', edp: '0 1 1 9 +', val: dpGaz },
                  { bcode: '0120', label: 'D. P. (Non- Gazetted)', edp: '0 1 2 0 +', val: dpNonGaz },
                ].map((row) => {
                  const s = splitRsPs(row.val);
                  return (
                    <tr key={row.bcode} style={{ borderBottom: '1px dotted #e5e5e5', lineHeight: 1.15 }}>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000' }}>{row.bcode}</td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000' }}>{row.label}</td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000', textAlign: 'center', fontFamily: 'monospace' }}>{row.edp}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right', fontWeight: row.val > 0 ? 600 : 400 }}>{s.rs}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right', width: '18px' }}>{s.ps}</td>
                    </tr>
                  );
                })}

                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 700, background: '#fafafa' }}>
                  <td colSpan={2} style={{ padding: '1px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Total</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totals.gross + totalAdvancesRecov).rs}</td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totals.gross + totalAdvancesRecov).ps}</td>
                </tr>

                {[
                  { label: 'Rec. of Festival Adv.', edp: '5 7 0 1 -', val: recovFestivalAdv },
                  { label: 'Rec. of Food Grain Adv.', edp: '5 8 0 1 -', val: recovFoodGrainAdv },
                  { label: 'Rec. of Pay', edp: '0 1 0 1 -', val: recovPay },
                  { label: 'Leave Salary Advance', edp: '0 1 0 2 -', val: leaveSalaryAdv },
                ].map((row, idx) => {
                  const s = splitRsPs(row.val);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px dotted #e5e5e5', lineHeight: 1.15 }}>
                      <td style={{ borderRight: '1px solid #000' }}></td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000' }}>{row.label}</td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000', textAlign: 'center', fontFamily: 'monospace' }}>{row.edp}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right' }}>{s.rs}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right' }}>{s.ps}</td>
                    </tr>
                  );
                })}

                <tr style={{ borderTop: '1px solid #000', fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: '1px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Total</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalAdvancesRecov).rs}</td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalAdvancesRecov).ps}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 800, background: '#f5f5f5' }}>
                  <td colSpan={2} style={{ padding: '2px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Gross Total</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '2px 2px', textAlign: 'right' }}>{splitRsPs(totals.gross).rs}</td>
                  <td style={{ padding: '2px 2px', textAlign: 'right' }}>{splitRsPs(totals.gross).ps}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Cheque Distribution & DDO Seal */}
          <div style={{ borderTop: '1px solid #000', paddingTop: '3px', fontSize: '7pt' }}>
            <div style={{ fontWeight: 600, textAlign: 'center', textDecoration: 'underline' }}>Please issue cheques shown below</div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>(1) In favour of Drawing Officer for Rs.</span>
              <span>0 00</span>
            </div>
            <div>(2) In favour of Officers</div>
            <div style={{ paddingLeft: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(i) Shri ..................................................... for Rs.</span>
                <span>0 00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>(ii) Smt. .................................................... for Rs.</span>
                <span>0 00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                <span>(iii) As per cheque list attached for Rs.</span>
                <span>{splitRsPs(netTotal).rs} {splitRsPs(netTotal).ps}</span>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', marginTop: '2px', paddingTop: '1px', fontWeight: 700 }}>
              <span>Total</span>
              <span>Rs. {splitRsPs(netTotal).rs} {splitRsPs(netTotal).ps}</span>
            </div>

            <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '7pt', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
              <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
              <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat'}</div>
              <div style={{ fontWeight: 600 }}>Code No.-{data.ddoCode || '229'} Cardex No.-{data.cardexNo || '22'}</div>
            </div>
          </div>
        </div>

        {/* Right Column: Deductions A, Deductions B, Treasury Action */}
        <div style={{ padding: '2px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Deductions A */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.8pt' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '1px 2px', borderRight: '1px solid #000' }}>Deductions &quot;A&quot;</th>
                  <th style={{ textAlign: 'center', padding: '1px 2px', borderRight: '1px solid #000' }}>Code</th>
                  <th style={{ textAlign: 'right', padding: '1px 2px' }} colSpan={2}>Amount<br />Rs. Ps.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Income Tax', code: '9 5 1 0 -', val: incomeTax },
                  { label: 'Surcharge on Income Tax', code: '9 5 2 0 -', val: surchargeIT },
                  { label: 'Postal Life Insurance', code: '9 5 3 0 -', val: postalLifeInsurance },
                  { label: 'New Def.Con.Pension Govt Servants', code: '9 5 3 4 -', val: npsPension },
                  { label: 'G.P.F. Work Charged', code: '9 5 3 2 -', val: gpfWorkCharged },
                  { label: 'G.P.F. Rojamdar', code: '9 5 3 3 -', val: gpfRojamdar },
                  { label: '0059 Rent of Building', code: '9 5 5 0 -', val: rentOfBuilding },
                  { label: '0216-01-107 Police Housing', code: '9 5 6 0 -', val: policeHousing },
                  { label: 'Professional Tax', code: '9 5 7 0 -', val: professionalTax },
                  { label: 'State Govt. Employees Group Insurance Scheme 1979', code: '9 5 8 0 -', val: gis1979Insurance },
                  { label: 'State Govt. Empl. Group Insur. Scheme 1981, Insur. Fund', code: '9 5 8 1 -', val: gis1981Insurance },
                  { label: 'State Govt. Empl. Group Insur. Scheme 1981, Savings Fund', code: '9 5 8 2 -', val: gis1981Savings },
                  { label: 'AIS Insur. Sch. 1980, Ins. Fund', code: '9 5 8 3 -', val: aisInsurance },
                  { label: 'AIS Insur. Sch. 1980, Sav. Fund', code: '9 5 8 4 -', val: aisSavings },
                  { label: 'Divi. Acct. Ins. Sch. 1980, Ins. Fund', code: '9 5 8 5 -', val: diviAcctInsurance },
                  { label: 'Divi. Acct. Ins. Sch. 1980, Sav. Fund', code: '9 5 8 6 -', val: diviAcctSavings },
                  { label: 'P.F. of Empl. on deputation adjustable by PAO', code: '9 5 8 7 -', val: pfDeputation },
                  { label: 'Government Housing Fund', code: '9 5 9 0 -', val: govtHousingFund },
                  { label: 'H.B.A. Principal/ Interest', code: '9 5 9 1 -', val: hba },
                  { label: 'Motor Car Adv., Prin./ Interest', code: '9 5 9 2 -', val: motorCarAdv },
                  { label: 'Security Deposit', code: '9 6 0 0 -', val: securityDeposit },
                ].map((row, idx) => {
                  const s = splitRsPs(row.val);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px dotted #e5e5e5', lineHeight: 1.1 }}>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000' }}>{row.label}</td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000', textAlign: 'center', fontFamily: 'monospace' }}>{row.code}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right', fontWeight: row.val > 0 ? 600 : 400 }}>{s.rs}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right', width: '18px' }}>{s.ps}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 700, background: '#fafafa' }}>
                  <td style={{ padding: '1px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Total A</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalDeductionsA).rs}</td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalDeductionsA).ps}</td>
                </tr>
              </tbody>
            </table>

            {/* Deductions B */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.8pt', marginTop: '3px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #000', background: '#f5f5f5' }}>
                  <th style={{ textAlign: 'left', padding: '1px 2px', borderRight: '1px solid #000' }}>Deductions &quot;B&quot;</th>
                  <th style={{ textAlign: 'center', padding: '1px 2px', borderRight: '1px solid #000' }}>Code</th>
                  <th style={{ textAlign: 'right', padding: '1px 2px' }} colSpan={2}>Amount<br />Rs. Ps.</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'I.A.S. Provident Fund', code: '9 6 2 0 -', val: iasPF },
                  { label: 'G.P.F. other than Class IV', code: '9 6 7 0 -', val: gpfOther },
                  { label: 'G.P.F. of Divi. Accountants', code: '9 6 8 0 -', val: gpfDivi },
                  { label: 'Contributory Provident Fund', code: '9 6 9 0 -', val: cpFund },
                  { label: 'Fan Advance', code: '9 7 2 0 -', val: fanAdv },
                  { label: 'Other Conveyance Advance', code: '9 7 4 0 -', val: otherConvAdv },
                  { label: 'Interest on Advance', code: '9 7 6 0 -', val: intAdv },
                  { label: 'Jeep Rent', code: '9 7 8 0 -', val: jeepRent },
                  { label: 'P.F. adjustable by A.O. other than A.G. Rajkot/ D.A.T.', code: '9 7 9 0 -', val: pfAO },
                  { label: 'Miscellaneous Recoveries', code: '9 9 1 0 -', val: miscRecov },
                ].map((row, idx) => {
                  const s = splitRsPs(row.val);
                  return (
                    <tr key={idx} style={{ borderBottom: '1px dotted #e5e5e5', lineHeight: 1.1 }}>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000' }}>{row.label}</td>
                      <td style={{ padding: '0.5px 2px', borderRight: '1px solid #000', textAlign: 'center', fontFamily: 'monospace' }}>{row.code}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right' }}>{s.rs}</td>
                      <td style={{ padding: '0.5px 2px', textAlign: 'right', width: '18px' }}>{s.ps}</td>
                    </tr>
                  );
                })}
                <tr style={{ borderTop: '1px solid #000', fontWeight: 700 }}>
                  <td style={{ padding: '1px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Total Deductions</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalDeductionsAll).rs}</td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(totalDeductionsAll).ps}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000', fontWeight: 800, background: '#f5f5f5' }}>
                  <td style={{ padding: '1px 2px', textAlign: 'right', borderRight: '1px solid #000' }}>Net Total</td>
                  <td style={{ borderRight: '1px solid #000' }}></td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(netTotal).rs}</td>
                  <td style={{ padding: '1px 2px', textAlign: 'right' }}>{splitRsPs(netTotal).ps}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Net in words & Treasury endorsement */}
          <div style={{ borderTop: '1px solid #000', paddingTop: '2px', fontSize: '7pt' }}>
            <div style={{ fontSize: '7.5pt', fontWeight: 700, margin: '2px 0' }}>
              i. e. Rs. {splitRsPs(netTotal).rs} ( {formatWordsCertificate(netTotal)} )
            </div>

            <div style={{ borderTop: '1px solid #000', paddingTop: '2px', display: 'grid', gridTemplateColumns: '55% 45%' }}>
              <div>
                <div style={{ fontWeight: 700, fontStyle: 'italic' }}>For use in Treasury</div>
                <div>Pay Rs. ……….…….. Rupees …........................................ in cash</div>
                <div>Rs. ………............……..… by T.C. as at &quot;A&quot;</div>
                <div>Total : …………………….. Date : ……………………..</div>
                <div style={{ marginTop: '8px', fontWeight: 600, fontSize: '6.5pt' }}>
                  Accountant/ Treasury Officer/ Sub-Treasury Officer/ Pay &amp; Accounts Officer
                </div>
              </div>
              <div style={{ borderLeft: '1px solid #000', paddingLeft: '4px', fontSize: '6.5pt', lineHeight: 1.25 }}>
                <div style={{ fontStyle: 'italic', marginBottom: '4px' }}>Space for Specimen Signature Verification endorsement by T.O./ P.A.O.</div>
                <div>D.A./ H.A./ A.T.O. in charge of Cardex</div>
                <div>Paid on Dt. …….....……..</div>
                <div>Advice No. ….....….… Date ………</div>
                <div>Cheque No. …....…………….…</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
