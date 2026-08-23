import type { GTR30Employee } from '../types/bill';

export interface EarningColumns {
  basic: number;
  da: number;
  hra: number;
  cla: number;
  medical: number;
  transport: number;
  special: number;
  washing: number;
  gross: number;
}

export interface DeductionColumns {
  profTax: number;
  housing: number;
  gpfRegular: number;
  gpfAdvance: number;
  gpfClass4: number;
  nps: number;
  govtFund: number;
  govtSaving: number;
  total: number;
}

/**
 * EARNING-side amounts collapsed into the karmyogi report's 8 money columns.
 * Every component is folded exactly once so the Gross total stays identical to
 * the rest of the bill (basic/DA/HRA/CLA/Med/Trans/Spl/Wash).
 */
export const earningColumns = (e: GTR30Employee): EarningColumns => {
  const basic =
    (e.payOfOfficer || 0) +
    (e.payOfEstablishment || 0) +
    (e.ropArrearsGaz || 0) +
    (e.ropArrearsNonGaz || 0);
  const da = (e.da || 0) + (e.dearnessPay || 0) + (e.dpGaz || 0) + (e.dpNonGaz || 0);
  const hra = e.hra || 0;
  const cla = (e.cla || 0) + (e.otherAllowance || 0);
  const medical = (e.medicalAllowance || 0) + (e.bonus || 0);
  const transport = e.transportAllowance || 0;
  const special =
    (e.nppa || 0) +
    (e.pta || 0) +
    (e.profSplService || 0) +
    (e.ca || 0) +
    (e.leaveSalary || 0) +
    (e.leaveEncashment || 0);
  const washing = (e.washingAllowance || 0) + (e.officeExpenseOther || 0);
  const gross = basic + da + hra + cla + medical + transport + special + washing;
  return { basic, da, hra, cla, medical, transport, special, washing, gross };
};

/**
 * DEDUCTION-side amounts collapsed into the karmyogi report's 8 money columns.
 * Every component is folded exactly once so the Total Deduction stays identical
 * to the rest of the bill (Prof Tax / HBA / GPF Reg / GPF Adv / GPF C4 / NPS /
 * Govt Fund / Govt Saving).
 */
export const deductionColumns = (e: GTR30Employee): DeductionColumns => {
  const profTax = e.professionalTax || 0;
  const housing =
    (e.hba || 0) +
    (e.rentOfBuilding || 0) +
    (e.policeHousing || 0) +
    (e.govtHousingFund || 0);
  const gpfRegular =
    (e.iasProvidentFund || 0) +
    (e.gpfOtherThanClass4 || 0) +
    (e.gpfDiviAcct || 0) +
    (e.gpfWorkCharged || 0) +
    (e.gpfRojamdar || 0) +
    (e.pfDeputation || 0);
  const gpfAdvance =
    (e.motorCarAdv || 0) +
    (e.otherConveyanceAdv || 0) +
    (e.interestOnAdv || 0) +
    (e.fanAdv || 0) +
    (e.securityDeposit || 0) +
    (e.jeepRent || 0) +
    (e.recovPayLeaveSalary || 0) +
    (e.miscRecoveries || 0) +
    (e.pfAdjustableByAO || 0);
  const gpfClass4 = e.contributoryPF || 0;
  const nps = e.npsPension || 0;
  const govtFund =
    (e.incomeTax || 0) +
    (e.surchargeIT || 0) +
    (e.housingFund || 0) +
    (e.gis1979Insurance || 0) +
    (e.gis1981Insurance || 0) +
    (e.aisInsurance || 0) +
    (e.diviAcctInsurance || 0) +
    (e.postalLifeInsurance || 0) +
    (e.bsiPremium || 0);
  const govtSaving =
    (e.gis1981Savings || 0) + (e.aisSavings || 0) + (e.diviAcctSavings || 0);
  const total =
    profTax + housing + gpfRegular + gpfAdvance + gpfClass4 + nps + govtFund + govtSaving;
  return { profTax, housing, gpfRegular, gpfAdvance, gpfClass4, nps, govtFund, govtSaving, total };
};

/** Gross earnings for an employee (used as the "Net Pay" base on the deduction sheet). */
export const employeeGross = (e: GTR30Employee): number => earningColumns(e).gross;