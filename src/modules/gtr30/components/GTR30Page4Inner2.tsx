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
      <div style={{ height: '32px' }}></div>

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
            <th style={{ border: '1px solid #000', width: '38px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">for Audit use only</div>
            </th>

            {/* 21. Income Tax */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Income Tax (9510)/ Surcharge on<br />I.T.(9520)/ Housing Fund(9590)</div>
            </th>

            {/* 22. Rent of Building */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Rent of Building (9550) (9560)</div>
            </th>

            {/* 23. PLI / BSI */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Postal Life Insurance Premium(9530)<br />B.S.I. Premium(9540)</div>
            </th>

            {/* 24. Prof Tax */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Professional Tax(9570)</div>
            </th>

            {/* 25. GIS 1979 */}
            <th style={{ border: '1px solid #000', width: '50px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">State Govt. Employees Group Insurance<br />Scheme 1979 Scheme Insurance Fund (9580)</div>
            </th>

            {/* 26. GIS 1981 Ins */}
            <th style={{ border: '1px solid #000', width: '52px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">State Govt. Employees Insur. Sch. 1981<br />Scheme Insurance Fund (9581)</div>
            </th>

            {/* 27. GIS 1981 Sav */}
            <th style={{ border: '1px solid #000', width: '52px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">State Govt. Employees Insur. Sch. 1981<br />Scheme Savings Fund (9582)</div>
            </th>

            {/* 28. PF Contribution */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Provident Fund Contribution (9531)<br />(9532)(9533)(9620)(9670)(9680)(9690)</div>
            </th>

            {/* 29. Festival Adv */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Festival Advance (5701)</div>
            </th>

            {/* 30. Food Grain Adv */}
            <th style={{ border: '1px solid #000', width: '38px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Food Grain Advance (5801)</div>
            </th>

            {/* 31. Motor Car Adv */}
            <th style={{ border: '1px solid #000', width: '54px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Motor Car Adv. Pri./Int.(9592), Other<br />Convey. Adv.(9740), Int. on Adv.(9760)</div>
            </th>

            {/* 32. HBA */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">H.B.A. Pri./ Interest on Advance (9591)</div>
            </th>

            {/* 33. Fan Adv */}
            <th style={{ border: '1px solid #000', width: '46px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Fan Adv.(9720)/ Interest on Adv.(9760)</div>
            </th>

            {/* 34. Recovery of Pay/Leave/Jeep */}
            <th style={{ border: '1px solid #000', width: '54px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">Recov. of Pay/ Leave Salary (9770)/<br />Jeep Car Rent (9780)/ Miscell. Recov.(9910)</div>
            </th>

            {/* 35. NPS Pension */}
            <th style={{ border: '1px solid #000', width: '60px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">New Define Contributory pension<br />sch.type govt.Servants (9534)</div>
            </th>

            {/* 36. Total Deductions */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text font-bold">Total Deductions</div>
            </th>

            {/* 37. Net Payable */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text font-bold">Net Payable Amount</div>
            </th>

            {/* 38. Society Deduction */}
            <th style={{ border: '1px solid #000', width: '56px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text">ICDP-Surat Epmloyees Credit and Co<br />Op Society Deduction</div>
            </th>

            {/* 39. Net After Society */}
            <th style={{ border: '1px solid #000', width: '58px', padding: '2px', verticalAlign: 'bottom' }}>
              <div className="vertical-header-text font-bold">Net Payable Amount after Society<br />Deduction</div>
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

            return (
              <tr key={emp.id || index} style={{ height: '36px', verticalAlign: 'middle' }}>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
                  {renderAmount(emp.rentOfBuilding || emp.policeHousing)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
                  {renderAmount(emp.professionalTax)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
                  {renderAmount(emp.gis1981Insurance)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
                  {renderAmount(emp.gis1981Savings)}
                </td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
                <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 600 }}>
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
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalRent)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalProfTax)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalGis1981Ins)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
              {renderAmount(totalGis1981Sav)}
            </td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'center' }}>-</td>
            <td style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 2px', fontWeight: 700 }}>
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
        <div style={{ fontWeight: 700 }}>({data.drawingOfficerName || 'SMT U.J.PATEL'})</div>
        <div>{data.drawingOfficerDesignation || 'Assistant Administrative Cum Account Officer'}</div>
        <div>{data.drawingOfficerOffice || 'Intensive Cattle Development Programme, Surat.'}</div>
        <div style={{ fontWeight: 700, marginTop: '2px' }}>
          CODE No.- {data.ddoCode || '299'} CARDEX- {data.cardexNo || '22'}
        </div>
      </div>
    </div>
  );
};
