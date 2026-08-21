import React from 'react';
import type { GTR30FormData } from '../types';
import { formatMoney } from '../services/gtr30Calc.service';
import { RotatedHeader } from './RotatedHeader';

interface Props {
  data: GTR30FormData;
}

const renderAmount = (val: number | undefined | null) => {
  const num = Number(val) || 0;
  return num > 0 ? formatMoney(num) : '-';
};

export const GTR30Page4Inner2: React.FC<Props> = ({ data }) => {
  const employees = data.employees || [];

  const sum = (fn: (e: (typeof employees)[0]) => number) =>
    employees.reduce((acc, e) => acc + (fn(e) || 0), 0);

  const totalIncomeTax = sum((e) => (e.incomeTax || 0) + (e.surchargeIT || 0) + (e.housingFund || 0));
  const totalRent = sum((e) => (e.rentOfBuilding || 0) + (e.policeHousing || 0));
  const totalPli = sum((e) => (e.postalLifeInsurance || 0) + (e.bsiPremium || 0));
  const totalProfTax = sum((e) => e.professionalTax);
  const totalGis1979 = sum((e) => e.gis1979Insurance);
  const totalGis1981Ins = sum((e) => e.gis1981Insurance);
  const totalGis1981Sav = sum((e) => e.gis1981Savings);
  const totalPfContrib = sum(
    (e) =>
      (e.iasProvidentFund || 0) +
      (e.gpfOtherThanClass4 || 0) +
      (e.gpfDiviAcct || 0) +
      (e.contributoryPF || 0) +
      (e.gpfWorkCharged || 0) +
      (e.gpfRojamdar || 0)
  );
  const totalFestivalAdv = sum((e) => e.festivalAdv);
  const totalFoodGrainAdv = sum((e) => e.foodGrainAdv);
  const totalMotorCarAdv = sum((e) => (e.motorCarAdv || 0) + (e.otherConveyanceAdv || 0));
  const totalMotor31 = sum((e) => (e.motorCarAdv || 0) + (e.otherConveyanceAdv || 0) + (e.interestOnAdv || 0));
  const totalHba = sum((e) => e.hba);
  const totalFanAdv = sum((e) => (e.fanAdv || 0) + (e.interestOnAdv || 0));
  const totalRecovPayLeave = sum(
    (e) => (e.recovPayLeaveSalary || 0) + (e.jeepRent || 0) + (e.miscRecoveries || 0)
  );
  const totalNpsPension = sum((e) => e.npsPension);

  const totalDeductions =
    totalIncomeTax +
    totalRent +
    totalPli +
    totalProfTax +
    totalGis1979 +
    totalGis1981Ins +
    totalGis1981Sav +
    totalPfContrib +
    totalFestivalAdv +
    totalFoodGrainAdv +
    totalMotorCarAdv +
    totalHba +
    totalFanAdv +
    totalRecovPayLeave +
    totalNpsPension;

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
      (e.dpNonGaz || 0) -
      (e.recovFestivalAdv || 0) -
      (e.recovFoodGrainAdv || 0) -
      (e.recovPay || 0) -
      (e.leaveSalaryAdv || 0)
  );

  const totalNetPayable = totalGrossAmount - totalDeductions;
  const totalSociety = sum((e) => e.societyDeduction);
  const totalNetAfterSociety = totalNetPayable - totalSociety;

  return (
    <div className="gtr30-page gtr30-landscape" id="gtr30-page-4">
      {/* Top spacing to match vertical page alignment */}
      <div style={{ height: '14px' }}></div>

      {/* Main Table for Columns 20 to 37 + Society */}
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
            {/* 20. Audit */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>for Audit use only</RotatedHeader>
            </th>

            {/* 21. Income Tax */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Income Tax (9510)/ Surcharge on<br />I.T.(9520)/ Housing Fund(9590)</RotatedHeader>
            </th>

            {/* 22. Rent of Building */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Rent of Building (9550) (9560)</RotatedHeader>
            </th>

            {/* 23. PLI / BSI */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Postal Life Insurance Premium(9530)<br />B.S.I. Premium(9540)</RotatedHeader>
            </th>

            {/* 24. Prof Tax */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Professional Tax(9570)</RotatedHeader>
            </th>

            {/* 25. GIS 1979 */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>State Govt. Employees Group Insurance<br />Scheme 1979 Scheme Insurance Fund (9580)</RotatedHeader>
            </th>

            {/* 26. GIS 1981 Ins */}
            <th style={{ border: '1px solid #000', width: '52px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>State Govt. Employees Insur. Sch. 1981<br />Scheme Insurance Fund (9581)</RotatedHeader>
            </th>

            {/* 27. GIS 1981 Sav */}
            <th style={{ border: '1px solid #000', width: '52px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>State Govt. Employees Insur. Sch. 1981<br />Scheme Savings Fund (9582)</RotatedHeader>
            </th>

            {/* 28. PF Contribution */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Provident Fund Contribution (9531)<br />(9532)(9533)(9620)(9670)(9680)(9690)</RotatedHeader>
            </th>

            {/* 29. Festival Adv */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Festival Advance (5701)</RotatedHeader>
            </th>

            {/* 30. Food Grain Adv */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Food Grain Advance (5801)</RotatedHeader>
            </th>

            {/* 31. Motor Car Adv */}
            <th style={{ border: '1px solid #000', width: '54px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Motor Car Adv. Pri./Int.(9592), Other<br />Convey. Adv.(9740), Int. on Adv.(9760)</RotatedHeader>
            </th>

            {/* 32. HBA */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>H.B.A. Pri./ Interest on Advance (9591)</RotatedHeader>
            </th>

            {/* 33. Fan Adv */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Fan Adv.(9720)/ Interest on Adv.(9760)</RotatedHeader>
            </th>

            {/* 34. Recovery of Pay/Leave/Jeep */}
            <th style={{ border: '1px solid #000', width: '54px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>Recov. of Pay/ Leave Salary (9770)/<br />Jeep Car Rent (9780)/ Miscell. Recov.(9910)</RotatedHeader>
            </th>

            {/* 35. NPS Pension */}
            <th style={{ border: '1px solid #000', width: '60px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>New Define Contributory pension<br />sch.type govt.Servants (9534)</RotatedHeader>
            </th>

            {/* 36. Total Deductions */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader bold>Total Deductions</RotatedHeader>
            </th>

            {/* 37. Net Payable */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader bold>Net Payable Amount</RotatedHeader>
            </th>

            {/* 38. Society Deduction */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader>ICDP-Surat Epmloyees Credit and Co<br />Op Society Deduction</RotatedHeader>
            </th>

            {/* 39. Net After Society */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '0', verticalAlign: 'bottom' }}>
              <RotatedHeader bold>Net Payable Amount after Society<br />Deduction</RotatedHeader>
            </th>
          </tr>

          {/* Numbering Row 20 to 37 */}
          <tr style={{ background: '#ffffff', textAlign: 'center', fontWeight: 600, fontSize: '6.5pt' }}>
            <th style={{ border: '1px solid #000', padding: '1px' }}>20</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>21</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>22</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>23</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>24</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>25</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>26</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>27</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>28</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>29</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>30</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>31</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>32</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>33</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>34</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>35</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>36</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}>37</th>
            <th style={{ border: '1px solid #000', padding: '1px' }}></th>
            <th style={{ border: '1px solid #000', padding: '1px' }}></th>
          </tr>
        </thead>

        <tbody>
          {employees.map((emp, index) => {
            const empDeduct =
              (emp.incomeTax || 0) +
              (emp.surchargeIT || 0) +
              (emp.housingFund || 0) +
              (emp.rentOfBuilding || 0) +
              (emp.policeHousing || 0) +
              (emp.postalLifeInsurance || 0) +
              (emp.bsiPremium || 0) +
              (emp.professionalTax || 0) +
              (emp.gis1979Insurance || 0) +
              (emp.gis1981Insurance || 0) +
              (emp.gis1981Savings || 0) +
              (emp.aisInsurance || 0) +
              (emp.aisSavings || 0) +
              (emp.diviAcctInsurance || 0) +
              (emp.diviAcctSavings || 0) +
              (emp.pfDeputation || 0) +
              (emp.govtHousingFund || 0) +
              (emp.hba || 0) +
              (emp.motorCarAdv || 0) +
              (emp.securityDeposit || 0) +
              (emp.iasProvidentFund || 0) +
              (emp.gpfOtherThanClass4 || 0) +
              (emp.gpfDiviAcct || 0) +
              (emp.contributoryPF || 0) +
              (emp.gpfWorkCharged || 0) +
              (emp.gpfRojamdar || 0) +
              (emp.fanAdv || 0) +
              (emp.otherConveyanceAdv || 0) +
              (emp.interestOnAdv || 0) +
              (emp.jeepRent || 0) +
              (emp.pfAdjustableByAO || 0) +
              (emp.recovPayLeaveSalary || 0) +
              (emp.miscRecoveries || 0) +
              (emp.npsPension || 0);

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
              (emp.dpNonGaz || 0) -
              (emp.recovFestivalAdv || 0) -
              (emp.recovFoodGrainAdv || 0) -
              (emp.recovPay || 0) -
              (emp.leaveSalaryAdv || 0);

            const empNet = empGross - empDeduct;
            const empSociety = emp.societyDeduction || 0;
            const empNetAfter = empNet - empSociety;

            // Per-col aggregates for display (match header col definitions)
            const col21IncomeTax = (emp.incomeTax || 0) + (emp.surchargeIT || 0) + (emp.housingFund || 0);
            const col22Rent = (emp.rentOfBuilding || 0) + (emp.policeHousing || 0);
            const col23PLI = (emp.postalLifeInsurance || 0) + (emp.bsiPremium || 0);
            const col25GIS1979 = emp.gis1979Insurance || 0;
            const col28PF = (emp.iasProvidentFund || 0) + (emp.gpfOtherThanClass4 || 0) + (emp.gpfDiviAcct || 0) + (emp.contributoryPF || 0) + (emp.gpfWorkCharged || 0) + (emp.gpfRojamdar || 0);
            const col29Festival = emp.festivalAdv || 0;
            const col30FoodGrain = emp.foodGrainAdv || 0;
            const col31Motor = (emp.motorCarAdv || 0) + (emp.otherConveyanceAdv || 0) + (emp.interestOnAdv || 0);
            const col32HBA = emp.hba || 0;
            const col33Fan = (emp.fanAdv || 0) + (emp.interestOnAdv || 0);
            const col34Recov = (emp.recovPayLeaveSalary || 0) + (emp.jeepRent || 0) + (emp.miscRecoveries || 0);

            return (
              <tr key={emp.id || index} style={{ height: '36px', verticalAlign: 'middle' }}>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col21IncomeTax ? 600 : 400 }}>
                  {renderAmount(col21IncomeTax)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col22Rent ? 600 : 400 }}>
                  {renderAmount(col22Rent)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col23PLI ? 600 : 400 }}>
                  {renderAmount(col23PLI)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: emp.professionalTax ? 600 : 400 }}>
                  {renderAmount(emp.professionalTax)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col25GIS1979 ? 600 : 400 }}>
                  {renderAmount(col25GIS1979)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: emp.gis1981Insurance ? 600 : 400 }}>
                  {renderAmount(emp.gis1981Insurance)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: emp.gis1981Savings ? 600 : 400 }}>
                  {renderAmount(emp.gis1981Savings)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col28PF ? 600 : 400 }}>
                  {renderAmount(col28PF)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col29Festival ? 600 : 400 }}>
                  {renderAmount(col29Festival)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col30FoodGrain ? 600 : 400 }}>
                  {renderAmount(col30FoodGrain)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col31Motor ? 600 : 400 }}>
                  {renderAmount(col31Motor)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col32HBA ? 600 : 400 }}>
                  {renderAmount(col32HBA)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col33Fan ? 600 : 400 }}>
                  {renderAmount(col33Fan)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: col34Recov ? 600 : 400 }}>
                  {renderAmount(col34Recov)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: emp.npsPension ? 600 : 400 }}>
                  {renderAmount(emp.npsPension)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
                  {renderAmount(empDeduct)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
                  {renderAmount(empNet)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px' }}>
                  {renderAmount(empSociety)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
                  {renderAmount(empNetAfter)}
                </td>
              </tr>
            );
          })}

          {/* Bottom Total Row */}
          <tr style={{ background: '#ffffff', fontWeight: 700, fontSize: '7pt', height: '32px', verticalAlign: 'middle' }}>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalIncomeTax ? 700 : 400 }}>
              {renderAmount(totalIncomeTax)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalRent ? 700 : 400 }}>
              {renderAmount(totalRent)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalPli ? 700 : 400 }}>
              {renderAmount(totalPli)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalProfTax ? 700 : 400 }}>
              {renderAmount(totalProfTax)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalGis1979 ? 700 : 400 }}>
              {renderAmount(totalGis1979)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalGis1981Ins ? 700 : 400 }}>
              {renderAmount(totalGis1981Ins)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalGis1981Sav ? 700 : 400 }}>
              {renderAmount(totalGis1981Sav)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalPfContrib ? 700 : 400 }}>
              {renderAmount(totalPfContrib)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalFestivalAdv ? 700 : 400 }}>
              {renderAmount(totalFestivalAdv)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalFoodGrainAdv ? 700 : 400 }}>
              {renderAmount(totalFoodGrainAdv)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalMotor31 ? 700 : 400 }}>
              {renderAmount(totalMotor31)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalHba ? 700 : 400 }}>
              {renderAmount(totalHba)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalFanAdv ? 700 : 400 }}>
              {renderAmount(totalFanAdv)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalRecovPayLeave ? 700 : 400 }}>
              {renderAmount(totalRecovPayLeave)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: totalNpsPension ? 700 : 400 }}>
              {renderAmount(totalNpsPension)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 800 }}>
              {renderAmount(totalDeductions)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 800 }}>
              {renderAmount(totalNetPayable)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalSociety)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 800 }}>
              {renderAmount(totalNetAfterSociety)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Drawing Officer Signature Block on Right */}
      <div
        style={{
          marginTop: '45px',
          textAlign: 'center',
          fontSize: '7.5pt',
          lineHeight: 1.3,
          width: '320px',
          marginLeft: 'auto',
        }}
      >
        <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'Smt. S.V.Solanki.'})</div>
        <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
        <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}</div>
        <div style={{ fontWeight: 700, marginTop: '2px' }}>
          CODE No.- {data.ddoCode || '299'} CARDEX- {data.cardexNo || '22'}
        </div>
      </div>
    </div>
  );
};
