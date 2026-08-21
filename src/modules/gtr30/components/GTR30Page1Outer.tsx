import React from 'react';
import type { GTR30FormData } from '../types';
import { billTotals, formatWordsCertificate, splitRsPs } from '../services/gtr30Calc.service';

interface Props {
  data: GTR30FormData;
}

const renderBoxes = (value: string | number | undefined | null, count: number) => {
  const str = value !== undefined && value !== null ? String(value) : '';
  const padded = str.replace(/[^a-zA-Z0-9+\-]/g, '').padEnd(count, ' ').slice(0, count);
  const chars = padded.split('');
  return (
    <div className="inline-flex border-l border-t border-b border-black align-middle" style={{ whiteSpace: 'nowrap' }}>
      {chars.map((ch, i) => (
        <span
          key={i}
          style={{
            // Tailwind spacing.gtrBox = 11px; CSS var --gtr-box-w ties to print tokens
            width: 'var(--gtr-box-w, 11px)',
            height: 'var(--gtr-box-h, 14px)',
            fontSize: '8pt',
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

const renderCodeBoxes = (code: string | undefined | null, fallbackCount?: number) => {
  if (!code || !String(code).trim()) return <span style={{ color: '#999' }}>—</span>;
  const cleaned = String(code).replace(/\s+/g, '').replace(/[^0-9A-Za-z+\-]/g, '');
  const chars = cleaned.split('');
  const count = fallbackCount ?? chars.length;
  const display = chars.slice(0, count);
  while (display.length < count) display.push(' ');
  return (
    <div className="inline-flex border-l border-t border-b border-black align-middle" style={{ whiteSpace: 'nowrap' }}>
      {display.map((ch, i) => (
        <span
          key={i}
          style={{
            width: ch === '+' || ch === '-' ? 8.5 : 10,
            height: 13,
            fontSize: '7.8pt',
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
          {ch.trim() ? ch : ''}
        </span>
      ))}
    </div>
  );
};

export const GTR30Page1Outer: React.FC<Props> = ({ data }) => {
  const totals = billTotals(data);
  const employees = data.employees || [];
  const sumField = (fn: (e: (typeof employees)[0]) => number) => employees.reduce((s, e) => s + (fn(e) || 0), 0);
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
  const officeExpenses = sumField((e) => e.officeExpenseOther);
  const profSplService = sumField((e) => e.profSplService);
  const washingAllowance = sumField((e) => e.washingAllowance);
  const ropArrearsGaz = sumField((e) => e.ropArrearsGaz);
  const ropArrearsNonGaz = sumField((e) => e.ropArrearsNonGaz);
  const dearnessPay = sumField((e) => e.dearnessPay);
  const recovFestivalAdv = sumField((e) => e.recovFestivalAdv);
  const recovFoodGrainAdv = sumField((e) => e.recovFoodGrainAdv);
  const recovPay = sumField((e) => e.recovPay);
  const leaveSalaryAdv = sumField((e) => e.leaveSalaryAdv);
  const incomeTax = sumField((e) => e.incomeTax);
  const surchargeIT = sumField((e) => e.surchargeIT);
  const postalLifeInsurance = sumField((e) => e.postalLifeInsurance);
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
  const totalDeductionsA = incomeTax + surchargeIT + postalLifeInsurance + gpfWorkCharged + gpfRojamdar + rentOfBuilding + policeHousing + professionalTax + gis1979Insurance + gis1981Insurance + gis1981Savings + aisInsurance + aisSavings + diviAcctInsurance + diviAcctSavings + pfDeputation + govtHousingFund + hba + motorCarAdv + securityDeposit;
  const iasProvidentFund = sumField((e) => e.iasProvidentFund);
  const gpfOtherThanClass4 = sumField((e) => e.gpfOtherThanClass4);
  const gpfDiviAcct = sumField((e) => e.gpfDiviAcct);
  const contributoryPF = sumField((e) => e.contributoryPF);
  const fanAdv = sumField((e) => e.fanAdv);
  const otherConveyanceAdv = sumField((e) => e.otherConveyanceAdv);
  const interestOnAdv = sumField((e) => e.interestOnAdv);
  const jeepRent = sumField((e) => e.jeepRent);
  const pfAdjustableByAO = sumField((e) => e.pfAdjustableByAO);
  const npsPension = sumField((e) => e.npsPension);
  const miscRecoveries = sumField((e) => e.miscRecoveries);
  const totalDeductionsB = iasProvidentFund + gpfOtherThanClass4 + gpfDiviAcct + contributoryPF + fanAdv + otherConveyanceAdv + interestOnAdv + jeepRent + pfAdjustableByAO + npsPension + miscRecoveries;
  const totalAllDeductions = totalDeductionsA + totalDeductionsB;
  const netAmount = totals.gross - totalAllDeductions;
  const formatCell = (val: number) => {
    if (val === 0) return { rs: '-', ps: '' };
    const p = splitRsPs(val);
    return { rs: p.rs, ps: p.ps };
  };
  const grossCell = splitRsPs(totals.gross);
  const totalACell = splitRsPs(totalDeductionsA);
  const totalDedCell = splitRsPs(totalAllDeductions);
  const netCell = splitRsPs(netAmount);

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-1" style={{ background: '#ffffff' }}>
      <div
        style={{
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: '8.5pt',
          lineHeight: 1.3,
          color: '#000000',
          backgroundColor: '#ffffff',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: '49.6% 49.6%',
          columnGap: '0.8%',
          minHeight: '197mm',
          padding: '3mm 4mm',
          alignItems: 'start',
        }}
      >
        {/* LEFT: OUTER FRONT - Image 1 full view */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '6pt', marginBottom: '2px' }}>
              <div>
                <div>G. P. Rjt., Sr. 1 Std.-175 2-2009 2,00,000 A4 WP-BI</div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif", fontSize: '6.5pt' }}>ના.વિ.ના પત્ર ક્રમાંક : તજર-૧૦૦૪-૧૨૨૬-ઝ-૮૪૭ (૦૫) તા. ૨-૧-૨૦૦૬.</div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '8.5pt', fontFamily: "'Noto Serif Gujarati', serif" }}>૨૭૨</div>
              <div style={{ textAlign: 'right', fontSize: '6pt', fontWeight: 600 }}>
                <div>Outer General l. e. &amp; g. (Revised) (Outer)</div>
                <div style={{ fontFamily: "'Noto Serif Gujarati', serif" }}>આઉટર જન. ૧ ઈ. અને જી. (સુધારેલ) (આઉટર)</div>
              </div>
            </div>
            <div style={{ position: 'relative', margin: '2px 0 4px 0', borderBottom: '1px solid #000', paddingBottom: '3px' }}>
              <div style={{ textAlign: 'center' }}>
                <h1 style={{ fontSize: '10.5pt', fontWeight: 900, letterSpacing: '0.6px', margin: 0 }}>FORM G. T. R. 30</h1>
                <div style={{ fontSize: '7pt', fontStyle: 'italic' }}>(See Rule 176(1))</div>
              </div>
              <div style={{ position: 'absolute', right: 0, top: '4px', fontSize: '8pt' }}>
                Bill Register No. <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.billRegisterNo || 'GTR30-2026-27/01'}</strong>
              </div>
            </div>
            <div style={{ fontSize: '8pt', lineHeight: 1.35, marginBottom: '4px', border: '1px solid #000', padding: '3px 5px', background: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div>Pay Bill for the Establishment <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.branchName || 'એક શાખા'}</strong></div>
                <div>Name of Office <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.officeName || 'Dy. Dir. of A.H., I.C.D.P., Surat'}</strong></div>
              </div>
              <div>For the month of <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.monthOf || 'July-26'}</strong></div>
            </div>
            <div style={{ border: 'none', padding: '2px 0', fontSize: '7pt', marginBottom: '4px', background: 'transparent' }}>
              <div style={{ fontStyle: 'italic', fontWeight: 700, textAlign: 'center', fontSize: '8pt', marginBottom: '2px', borderBottom: 'none', paddingBottom: '2px' }}>For use in Treasury</div>
              <div style={{ marginBottom: '3px' }}>Name of the Treasury <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{data.treasuryName || 'District Treasury, SURAT.'}</strong></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: '1.5px', fontSize: '5.9pt', borderTop: '1px solid #000', paddingTop: '2px' }}>
                {[1, 2, 3].map((rowIdx) => {
                  const t = data.transits && data.transits[rowIdx - 1];
                  return (
                    <div key={rowIdx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: rowIdx < 3 ? '1px dotted #000' : 'none', paddingBottom: '1px' }}>
                      <span>Bill Transit Reg. Sr. No. <strong style={{ borderBottom: '1px solid #000', width: '42px', display: 'inline-block', textAlign: 'center' }}>{t?.srNo || ''}</strong></span>
                      <span>Date <strong style={{ borderBottom: '1px solid #000', width: '48px', display: 'inline-block', textAlign: 'center' }}>{t?.date || ''}</strong></span>
                      <span>Token No. <strong style={{ borderBottom: '1px solid #000', width: '42px', display: 'inline-block', textAlign: 'center' }}>{t?.tokenNo || ''}</strong></span>
                      <span>Date : <strong style={{ borderBottom: '1px solid #000', width: '48px', display: 'inline-block', textAlign: 'center' }}>{t?.tokenDate || ''}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '8pt', margin: '3px 0 0 0', border: '1px solid #000', borderBottom: 'none', padding: '2px 0 1px 0', background: '#fff' }}>
              COMPUTER INPUT DATA<div style={{ fontSize: '6.5pt', fontWeight: 400, fontStyle: 'italic' }}>(To be filled in by Treasury)</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', fontSize: '7.2pt', marginBottom: '0', border: '1px solid #000', borderTop: '1px solid #000', padding: '3px 0', background: '#fff' }}>
              <div>1. District &nbsp; {renderBoxes(data.district || '66', 2)}</div>
              <div>2. Month &amp; Year &nbsp; {renderBoxes(data.monthYearDigits || '0726', 4)}</div>
              <div>3. Voucher No. &nbsp; {renderBoxes('', 4)}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '44% 56%', columnGap: '0', alignItems: 'stretch', border: '1px solid #000', borderTop: 'none' }}>
              <div style={{ fontSize: '7pt', borderRight: '1px solid #000', padding: '4px 5px', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', lineHeight: 1.18 }}>
                  <tbody>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>4. Controlling Officer</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.controllingOfficer || '', 4)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>5. Class of Expenditure</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.classOfExpenditure || '1', 1)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>6. Fund</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.fund || '3', 1)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>7. Drawing Officer</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.drawingOfficer || '299', 4)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>8. Demand No.</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.demandNo || '004', 3)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>9. Type of Budget</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.typeOfBudget || '1', 1)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>10. Scheme No.</td><td style={{ textAlign: 'right', padding: '1.5px 0', borderBottom: '1px dotted #aaa', whiteSpace: 'nowrap' }}>{renderBoxes(data.schemeNo || '0000000', 7)}</td></tr>
                    <tr><td style={{ padding: '1.5px 0' }}>11. Head Chargeable.</td><td style={{ textAlign: 'right', padding: '1.5px 0' }}>{renderBoxes(data.headChargeable || '2403001139900', 13)}</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '4px', border: '1px solid #000', padding: '3px 4px', fontSize: '6pt', lineHeight: 1.3, background: '#fff', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Sector : <strong>{data.sector || 'Sector-C-Economic Service'}</strong></div>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Demand No. : <strong>{data.demandNoLabel || 'Demand No. 004'}</strong></div>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Major Head : <strong>{data.majorHead || 'Major Head-2403 Animal Husbandry'}</strong></div>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Sub-Major Head : <strong>{data.subMajorHead || '-'}</strong></div>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Minor Head : <strong>{data.minorHead || 'Minor Head-113 Administative Investigation and Statistcs'}</strong></div>
                  <div style={{ whiteSpace: 'normal', wordBreak: 'break-word' }}>Sub-Head : <strong>{data.subHead || 'Sub Head-99 Scheme for Strengthening of Statistical Wing in Directorate of Animal Husbandry (Pay and Allowances for Centrally Sponsored Scheme)'}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px', borderTop: '1px solid #000', paddingTop: '2px' }}><span>Detailed Head :</span><span>{renderBoxes('00', 2)}</span></div>
                </div>
                <div style={{ marginTop: '4px', border: 'none', padding: '3px 0', fontSize: '6.8pt', lineHeight: 1.3, background: 'transparent' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 'none', paddingBottom: '2px', marginBottom: '2px' }}><span>Budget Allotment for 20{data.budgetYear?.split('-')[0]?.slice(-2) || '26'} - 20{data.budgetYear?.split('-')[1] || '27'}</span><span>Rs. <strong style={{ borderBottom: '1px solid #000', minWidth: '35px', display: 'inline-block', textAlign: 'right' }}>0</strong> Ps. <strong style={{ borderBottom: '1px solid #000', minWidth: '14px', display: 'inline-block', textAlign: 'center' }}>00</strong></span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px', borderBottom: '1px dotted #aaa', paddingBottom: '1px' }}><span>Expenditure Including this bill</span><span style={{ borderBottom: '1px solid #000', minWidth: '75px', textAlign: 'right', fontWeight: 700 }}>{grossCell.rs}.{grossCell.ps}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1px' }}><span>Balance available</span><span style={{ borderBottom: '1px solid #000', minWidth: '75px', textAlign: 'right' }}>-</span></div>
                </div>
                <div style={{ border: 'none', marginTop: '4px', padding: '3px 0', fontSize: '6.8pt', lineHeight: 1.3, background: 'transparent' }}>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '7pt', fontStyle: 'italic', marginBottom: '2px', borderBottom: 'none', paddingBottom: '2px' }}>For Use in A. G. Office</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', borderBottom: '1px dotted #aaa', paddingBottom: '1px' }}><span>Admitted for</span><span>Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '70px' }}>&nbsp;</span></span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px', borderBottom: '1px dotted #aaa', paddingBottom: '1px' }}><span>Objected for</span><span>Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '70px' }}>&nbsp;</span></span></div>
                  <div style={{ marginBottom: '4px', borderBottom: '1px dotted #aaa', paddingBottom: '2px' }}>Reasons for Objection <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '85px' }}>&nbsp;</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontWeight: 600, fontSize: '5.4pt', borderTop: '1px solid #000', paddingTop: '3px' }}><span style={{ width: '30%', borderRight: '1px solid #000' }}>Auditor</span><span style={{ width: '35%', borderRight: '1px solid #000' }}>Section Officer</span><span style={{ width: '35%' }}>Gazetted Officer</span></div>
                </div>
              </div>
              <div style={{ fontSize: '7pt', padding: '4px 5px', background: '#fff' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', fontSize: '8pt' }}>
                  <thead><tr style={{ background: '#ffffff', textAlign: 'center', borderBottom: '1.2px solid #000', fontWeight: 700, fontSize: '7pt' }}><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 1px', width: '46px' }}>Budget<br />Code</th><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 3px', textAlign: 'left' }}>Object of Expenditure</th><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 1px', width: '56px' }}>EDP Code</th><th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '2px 1px', width: '52px' }}>Amount<br /><span style={{ fontWeight: 400, fontSize: '5.2pt' }}>Rs. &nbsp; &nbsp; Ps.</span></th></tr></thead>
                  <tbody>
                    <tr style={{ height: '14px', borderBottom: '1px solid #000' }}><td style={{ borderRight: '1px solid #000', padding: '1px 1px', textAlign: 'center', verticalAlign: 'middle', fontFamily: "'Courier New', monospace", fontSize: '8pt', fontWeight: 700 }}>0100</td><td style={{ borderRight: '1px solid #000', padding: '1px 3px', fontWeight: 700, verticalAlign: 'middle' }}>Salaries :</td><td style={{ borderRight: '1px solid #000', padding: '1px 1px', textAlign: 'center', verticalAlign: 'middle' }}></td><td style={{ borderRight: '1px solid #000', padding: '0 2px', width: '36px', textAlign: 'right', verticalAlign: 'middle' }}></td><td style={{ padding: '0 1px', width: '16px', textAlign: 'center', verticalAlign: 'middle' }}></td></tr>
                    {[
                      { b: '0101', name: 'Pay of Officer', edp: '0 1 0 1 +', val: payOfOfficer },
                      { b: '0102', name: 'Pay of Establishment', edp: '0 1 0 2 +', val: payOfEstablishment, bold: true },
                      { b: '0103', name: 'Dearness Allowance', edp: '0 1 0 3 +', val: da, bold: true },
                      { b: '0104', name: 'Other Allowance', edp: '0 1 0 4 +', val: otherAllowance },
                      { b: '0107', name: 'Medical Allowance', edp: '0 1 0 7 +', val: medicalAllowance, bold: true },
                      { b: '0108', name: 'Bonus', edp: '0 1 0 8 +', val: bonus },
                      { b: '0109', name: 'Leave Encashment', edp: '0 1 0 9 +', val: leaveEncashment },
                      { b: '0110', name: 'House Rent Allowance', edp: '0 1 1 0 +', val: hra },
                      { b: '0111', name: 'Compensatory Local Allowance', edp: '0 1 1 1 +', val: cla, bold: true },
                      { b: '0112', name: 'Interim Relief', edp: '0 1 1 2 +', val: 0 },
                      { b: '0113', name: 'Transport Allowance', edp: '0 1 1 3 +', val: transportAllowance, bold: true },
                      { b: '0117', name: 'ROP Arrears (Gazetted)', edp: '0 1 1 7 +', val: ropArrearsGaz },
                      { b: '0118', name: 'ROP Arrears (Non Gazetted)', edp: '0 1 1 8 +', val: ropArrearsNonGaz },
                      { b: '0128', name: 'N.P.P.A.', edp: '0 1 2 8 +', val: nppa },
                      { b: '1100', name: 'Travel Expenses (PTA)', edp: '1 1 0 1 +', val: pta },
                      { b: '1300', name: 'Office Expenses', edp: '1 3 0 1 +', val: officeExpenses },
                      { b: '2800', name: 'Payment for Professional and Special Services', edp: '2 8 0 1 +', val: profSplService },
                      { b: '5000', name: 'Other Charges', edp: '5 0 0 6 +', val: washingAllowance },
                      { b: '', name: 'Dearness Pay', edp: '+', val: dearnessPay },
                      { b: '', name: 'Festival Advance Rec.', edp: '5 7 0 1 -', val: recovFestivalAdv },
                      { b: '', name: 'Food Grain Advance Rec.', edp: '5 8 0 1 -', val: recovFoodGrainAdv },
                      { b: '', name: 'Recovery of Pay', edp: '0 1 0 1 -', val: recovPay },
                      { b: '', name: 'Leave Salary Advance', edp: '0 1 0 2 -', val: leaveSalaryAdv },
                    ].map((row, idx) => {
                      const cell = formatCell(row.val);
                      return (
                        <tr key={idx} style={{ height: 'auto', minHeight: '13px', borderBottom: '1px solid #000' }}>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle', fontFamily: "'Courier New', monospace", fontSize: '8pt', fontWeight: row.bold ? 700 : 400 }}>{row.b || ''}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 3px', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'middle', lineHeight: 1.2, textAlign: 'left' }}>{row.name}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>{renderCodeBoxes(row.edp)}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 2px', textAlign: 'right', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.rs}</td>
                          <td style={{ padding: '2px 1px', textAlign: 'center', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.ps}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '1.5px solid #000', fontWeight: 800, height: '14px', background: '#fff', fontSize: '7pt' }}><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000', padding: '1px 3px' }}>Gross Total</td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000', padding: '1px 2px', textAlign: 'right' }}>{grossCell.rs}</td><td style={{ padding: '1px 1px', textAlign: 'center' }}>{grossCell.ps}</td></tr>
                  </tbody>
                </table>
                <div style={{ fontSize: '5.2pt', fontStyle: 'italic', marginTop: '0', lineHeight: 1.1, border: '1px solid #000', borderTop: 'none', padding: '2px 3px', background: '#fff' }}>* Please See Note for other object head of expenditure as shown reverse</div>
                <div style={{ marginTop: '3px', border: '1px solid #000', padding: '3px 4px', fontSize: '6.8pt', lineHeight: 1.3, background: '#fff' }}>
                  <div style={{ fontStyle: 'italic', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid #000', paddingBottom: '2px', marginBottom: '2px' }}>Please issue cheques shown below</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #000', paddingBottom: '1px' }}><span>(1) In favour of Drawing Officer</span><span>for Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '45px' }}>&nbsp;</span> P. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '12px' }}>&nbsp;</span></span></div>
                  <div style={{ borderBottom: '1px dotted #000', paddingBottom: '1px' }}>(2) In favour of Officers</div>
                  <div style={{ paddingLeft: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #000', paddingBottom: '1px' }}><span>(I) Shri <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '40px' }}>&nbsp;</span></span><span>for Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '35px' }}>&nbsp;</span> P. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '10px' }}>&nbsp;</span></span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dotted #000', paddingBottom: '1px' }}><span>(II) Smt <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '40px' }}>&nbsp;</span></span><span>for Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '35px' }}>&nbsp;</span> P. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '10px' }}>&nbsp;</span></span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #000', paddingBottom: '1px' }}><span>(III) As per cheque list attached</span><span>for Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '35px' }}>&nbsp;</span> P. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '10px' }}>&nbsp;</span></span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '1px' }}><span>Total</span><span>Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '35px' }}>&nbsp;</span> P. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '10px' }}>&nbsp;</span></span></div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '7pt', fontWeight: 600, borderTop: '1px solid #000', paddingTop: '3px' }}>Signature &amp; Designation of Drawing Officer</div>
              </div>
            </div>
          </div>
        </div>
        {/* RIGHT: OUTER BACK - Image 2 combined in same page with vertical divider */}
        <div style={{ borderLeft: '1.2px solid #000', paddingLeft: '4mm', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '50% 50%', columnGap: '6px', alignItems: 'flex-start' }}>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', fontSize: '8pt' }}>
                  <thead><tr style={{ background: '#ffffff', textAlign: 'center', borderBottom: '1.2px solid #000', fontWeight: 700 }}><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 3px', textAlign: 'left' }}>Deduction &apos;A&apos;</th><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 1px', width: '38px' }}>Code</th><th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '2px 1px', width: '52px' }}>Amount<br /><span style={{ fontWeight: 400, fontSize: '5.2pt' }}>Rs. &nbsp; &nbsp; Ps.</span></th></tr></thead>
                  <tbody>
                    {[
                      { name: 'Income Tax', code: '9 5 1 0 -', val: incomeTax },
                      { name: 'Surcharge on Income Tax', code: '9 5 2 0 -', val: surchargeIT },
                      { name: 'Postal Life Insurance', code: '9 5 3 0 -', val: postalLifeInsurance },
                      { name: 'General Provident Fund Class IV', code: '9 5 3 1 -', val: 0 },
                      { name: 'General provident Fund Workcharged', code: '9 5 3 2 -', val: gpfWorkCharged },
                      { name: 'General provident Fund Rojamdar', code: '9 5 3 3 -', val: gpfRojamdar },
                      { name: '0059 Rent of Building Rent of Building 0216-9-106 General Pool Accommodation', code: '9 5 5 0 -', val: rentOfBuilding, bold: true },
                      { name: '0216-01-107 Police Housing 0216-01-700 Other Housing', code: '9 5 6 0 -', val: policeHousing },
                      { name: 'Professional Tax', code: '9 5 7 0 -', val: professionalTax, bold: true },
                      { name: 'State Government Employees Group Insurance Scheme 1979', code: '9 5 8 0 -', val: gis1979Insurance },
                      { name: 'State Government Employees Group Insurance Scheme 1981 Scheme Insurance Fund', code: '9 5 8 1 -', val: gis1981Insurance, bold: true },
                      { name: 'State Government Employees Insurance Scheme 1981, Scheme Savings Fund.', code: '9 5 8 2 -', val: gis1981Savings, bold: true },
                      { name: 'AIS Insurance Scheme 1980 Insurance Fund.', code: '9 5 8 3 -', val: aisInsurance },
                      { name: 'AIS Insurance Scheme - 1980 Saving Fund.', code: '9 5 8 4 -', val: aisSavings },
                      { name: 'Divisional Accountant Insu. Scheme 1980 I. F.', code: '9 5 8 5 -', val: diviAcctInsurance },
                      { name: 'Divisional Accountant Insu. Scheme 1980 S. F.', code: '9 5 8 6 -', val: diviAcctSavings },
                      { name: 'P. F. of employees on deputation adjustable by P. A. O./Other Accounting circle.', code: '9 5 8 7 -', val: pfDeputation },
                      { name: 'Government Housing Fund', code: '9 5 9 0 -', val: govtHousingFund },
                      { name: 'House Building Advance Principal/Interest.', code: '9 5 9 1 -', val: hba },
                      { name: 'Advance for purchase of Motor Car/Scooter/Moped Principal/Interest.', code: '9 5 9 2 -', val: motorCarAdv },
                      { name: 'Security Deposit', code: '9 6 0 0 -', val: securityDeposit },
                    ].map((row, idx) => {
                      const cell = formatCell(row.val);
                      return (
                        <tr key={idx} style={{ height: 'auto', minHeight: '14px', borderBottom: '1px solid #000' }}>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 3px', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'middle', textAlign: 'left' }}>{row.name}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>{renderCodeBoxes(row.code)}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 2px', textAlign: 'right', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.rs}</td>
                          <td style={{ padding: '2px 1px', textAlign: 'center', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.ps}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '1.5px solid #000', fontWeight: 800, height: '13px', background: '#fff' }}><td style={{ borderRight: '1px solid #000', padding: '0 3px' }}>Total A</td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000', padding: '0 2px', textAlign: 'right' }}>{totalACell.rs}</td><td style={{ padding: '0 1px', textAlign: 'center' }}>{totalACell.ps}</td></tr>
                  </tbody>
                </table>
                <div style={{ border: 'none', marginTop: '5px', padding: '4px 0', fontSize: '6pt', lineHeight: 1.35, background: 'transparent' }}>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontStyle: 'italic', marginBottom: '3px', fontSize: '8pt', borderBottom: 'none', paddingBottom: '2px' }}>For use in Treasury</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 'none', paddingBottom: '2px', marginBottom: '2px' }}><span>Pay Rs. ( <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '65px' }}>&nbsp;</span> )</span><span>Rs. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '48px' }}>&nbsp;</span></span></div>
                  <div style={{ textAlign: 'right', fontStyle: 'italic', borderBottom: 'none', paddingBottom: '1px' }}>In cash</div>
                  <div style={{ borderBottom: 'none', paddingBottom: '2px', marginBottom: '2px' }}>Rs. ( <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '65px' }}>&nbsp;</span> ) by T. C. as at &quot;A&quot;</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: 'none', paddingBottom: '2px' }}><span>Total : <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '55px' }}>&nbsp;</span></span><span>Date : <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '48px' }}>&nbsp;</span></span></div>
                  <div style={{ textAlign: 'center', marginTop: '6px', fontSize: '5.4pt', fontWeight: 600, borderTop: 'none', paddingTop: '3px' }}>Accountant/Treasury Officer / Sub-Treasury Officer/Pay and Accounts Officer.</div>
                </div>
              </div>
              <div>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.2px solid #000', fontSize: '8pt' }}>
                  <thead><tr style={{ background: '#ffffff', textAlign: 'center', borderBottom: '1.2px solid #000', fontWeight: 700 }}><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 3px', textAlign: 'left' }}>Deduction &apos;B&apos;</th><th style={{ borderRight: '1px solid #000', borderBottom: '1px solid #000', padding: '2px 1px', width: '38px' }}>Code</th><th colSpan={2} style={{ borderBottom: '1px solid #000', padding: '2px 1px', width: '52px' }}>Amount<br /><span style={{ fontWeight: 400, fontSize: '5.2pt' }}>Rs. &nbsp; &nbsp; Ps.</span></th></tr></thead>
                  <tbody>
                    {[
                      { name: 'I. A. S. Provident Fund', code: '9 6 2 0 -', val: iasProvidentFund },
                      { name: 'General Provident Fund Other than Class IV', code: '9 6 7 0 -', val: gpfOtherThanClass4 },
                      { name: 'General provident Fund of Divisional Accountants (State Employee)', code: '9 6 8 0 -', val: gpfDiviAcct },
                      { name: 'Contributory Provident Fund', code: '9 6 9 0 -', val: contributoryPF },
                      { name: 'Advances for Purchase of Fan', code: '9 7 2 0 -', val: fanAdv },
                      { name: 'Advance for purchase of other Conveyance (Cycle)', code: '9 7 4 0 -', val: otherConveyanceAdv },
                      { name: 'Interest on Advance', code: '9 7 6 0 -', val: interestOnAdv },
                      { name: 'Jeep Rent', code: '9 7 8 0 -', val: jeepRent },
                      { name: 'Provident Fund adjustable by A. O. other than A. G. Gujarat / D. A. T.', code: '9 7 9 0 -', val: pfAdjustableByAO },
                      { name: 'Miscellaneous Recoveries', code: '9 9 1 0 -', val: npsPension + miscRecoveries, bold: true },
                    ].map((row, idx) => {
                      const cell = formatCell(row.val);
                      return (
                        <tr key={idx} style={{ height: 'auto', minHeight: '14px', borderBottom: '1px solid #000' }}>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 3px', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', lineHeight: 1.2, whiteSpace: 'normal', wordBreak: 'break-word', overflowWrap: 'anywhere', verticalAlign: 'middle', textAlign: 'left' }}>{row.name}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 1px', textAlign: 'center', verticalAlign: 'middle' }}>{renderCodeBoxes(row.code)}</td>
                          <td style={{ borderRight: '1px solid #000', padding: '2px 2px', textAlign: 'right', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.rs}</td>
                          <td style={{ padding: '2px 1px', textAlign: 'center', fontWeight: row.bold ? 700 : 400, fontSize: '8pt', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{cell.ps}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ borderTop: '1px solid #000', fontWeight: 700, height: '13px', background: '#fff' }}><td style={{ borderRight: '1px solid #000', padding: '0 3px' }}>Total Deductions :</td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000', padding: '0 2px', textAlign: 'right' }}>{totalDedCell.rs}</td><td style={{ padding: '0 1px', textAlign: 'center' }}>{totalDedCell.ps}</td></tr>
                    <tr style={{ borderTop: '1.5px solid #000', fontWeight: 800, height: '14px', background: '#fff' }}><td style={{ borderRight: '1px solid #000', padding: '0 3px' }}>Net Total :</td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000', padding: '0 2px', textAlign: 'right' }}>{netCell.rs}</td><td style={{ padding: '0 1px', textAlign: 'center' }}>{netCell.ps}</td></tr>
                    <tr style={{ height: '10px', borderBottom: '1px solid #000' }}><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td></td></tr>
                    <tr style={{ height: '10px', borderBottom: '1px solid #000' }}><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td></td></tr>
                    <tr style={{ height: '10px' }}><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td style={{ borderRight: '1px solid #000' }}></td><td></td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '4px', fontSize: '7.2pt', lineHeight: 1.35, border: 'none', padding: '2px 0', background: 'transparent' }}><div>i. e. Rs. <strong style={{ borderBottom: '1px solid #000', padding: '0 4px' }}>{formatWordsCertificate(netAmount)}</strong></div></div>
                <div style={{ textAlign: 'center', marginTop: '5px', fontSize: '8pt', lineHeight: 1.35, border: 'none', padding: '4px 0', background: 'transparent' }}><div style={{ fontWeight: 700 }}>Signature</div><div>Drawing Officer,</div><div>Cardex Code No. <strong>{data.cardexNo || '22'}</strong></div></div>
                <div style={{ border: 'none', marginTop: '5px', padding: '4px 0', fontSize: '5.7pt', lineHeight: 1.35, background: 'transparent' }}><div style={{ fontWeight: 700, textAlign: 'center', marginBottom: '3px', fontSize: '6pt', borderBottom: 'none', paddingBottom: '2px' }}>Space for Specimen Signature Verification endorsement By T. O./P. A. O.</div><div style={{ marginTop: '4px', borderBottom: 'none', paddingBottom: '1px' }}>D. A./H. A./A. T. O. in charge of Cardex</div><div style={{ marginTop: '4px', borderBottom: 'none', paddingBottom: '1px' }}>Paid on Dt. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '65px' }}>&nbsp;</span></div><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderBottom: 'none', paddingBottom: '2px' }}><span>Advice No. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '38px' }}>&nbsp;</span></span><span>Dt. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '48px' }}>&nbsp;</span></span></div><div style={{ marginTop: '4px', borderBottom: 'none', paddingBottom: '2px' }}>Cheque No. <span style={{ borderBottom: '1px solid #000', display: 'inline-block', width: '75px' }}>&nbsp;</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
